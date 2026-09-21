param(
  [int]$Concurrency = 400,
  [int]$DurationSec = 60,
  [int]$Workers = 8,
  [int]$ApiReplicas = 8
)

Set-Location X:\Projects\email-queue\node-pipeline
 $ErrorActionPreference = 'Stop'
 $bench = 'docker\docker-compose.bench.yml'
 $proj = 'emailbench'
 $runId = 'bench-' + (Get-Date -Format 'yyyyMMdd-HHmmss')

function Get-JobsCount {
  $out = docker compose -p $proj -f $bench exec -T postgres psql -U email -d email_api_db -t -A -c "SELECT count(*) FROM email_jobs"
  $line = ($out | Where-Object { $_ -match '\d' } | Select-Object -First 1)
  if ($line) { return [int]$line }
  return 0
}

function Get-LedgerDelivered {
  $out = docker compose -p $proj -f $bench exec -T postgres psql -U email -d email_worker_db -t -A -c "SELECT count(*) FROM delivery_attempts WHERE outcome = 'DELIVERED'"
  $line = ($out | Where-Object { $_ -match '\d' } | Select-Object -First 1)
  if ($line) { return [int]$line }
  return 0
}

function Get-RunLatency([string]$Prefix) {
  $jobsSql = 'SELECT id, "createdAt" FROM email_jobs WHERE "idempotencyKey" LIKE ''' + $Prefix + '-%'''
  $jobs = $jobsSql | docker compose -p $proj -f $bench exec -T postgres psql -U email -d email_api_db -t -A -F ','
  $attemptsSql = "SELECT job_id, created_at FROM delivery_attempts WHERE outcome = 'DELIVERED'"
  $attempts = $attemptsSql | docker compose -p $proj -f $bench exec -T postgres psql -U email -d email_worker_db -t -A -F ','
  $jobTimes = @{}
  foreach ($line in $jobs) {
    $p = $line -split ','
    if ($p.Count -eq 2 -and $p[0]) { $jobTimes[$p[0]] = [datetime]::Parse($p[1]) }
  }
  $diffs = @()
  foreach ($line in $attempts) {
    $p = $line -split ','
    if ($p.Count -eq 2 -and $jobTimes.ContainsKey($p[0])) {
      $diffs += ([datetime]::Parse($p[1]) - $jobTimes[$p[0]]).TotalMilliseconds
    }
  }
  if ($diffs.Count -eq 0) { return $null }
  $sorted = $diffs | Sort-Object
  $n = $sorted.Count
  return @{
    p50 = [Math]::Round($sorted[[int][Math]::Floor(0.50 * $n)], 1)
    p95 = [Math]::Round($sorted[[int][Math]::Floor(0.95 * $n)], 1)
    p99 = [Math]::Round($sorted[[int][Math]::Ceiling(0.99 * $n) - 1], 1)
    count = $n
  }
}

Write-Host "=== CONTAINERIZED benchmark: $ApiReplicas api + $Workers workers, everything on docker network ===" -ForegroundColor Cyan

Write-Host "[1/5] clean start (fresh databases) + building image..."
docker compose -p $proj -f $bench down -v --remove-orphans | Out-Null
docker compose -p $proj -f $bench up -d --build --scale api=$ApiReplicas --scale worker=$Workers --wait
if ($LASTEXITCODE -ne 0) { throw 'stack did not become healthy' }
Write-Host "[2/5] stack healthy: $ApiReplicas api replicas + $Workers workers"
Write-Host "      applying migrations (direct SQL, no prisma config)..."
Get-ChildItem prisma\api\migrations\*\migration.sql | Sort-Object FullName | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace "`r`n", "`n" | docker compose -p $proj -f $bench exec -T postgres psql -U email -d email_api_db -v ON_ERROR_STOP=1
}
Get-ChildItem prisma\worker\migrations\*\migration.sql | Sort-Object FullName | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace "`r`n", "`n" | docker compose -p $proj -f $bench exec -T postgres psql -U email -d email_worker_db -v ON_ERROR_STOP=1
}
Write-Host "      migrations applied"

 $jobsBefore = Get-JobsCount
 $ledgerBefore = Get-LedgerDelivered
Write-Host "[3/5] baselines: jobs=$jobsBefore ledger=$ledgerBefore"

 $t0 = Get-Date
 $loadArgs = @('compose', '-p', $proj, '-f', $bench, 'run', '--rm',
  '-e', "CONCURRENCY=$Concurrency",
  '-e', "DURATION_SEC=$DurationSec",
  '-e', "RUN_ID=$runId",
  'loadgen')
 $load = Start-Process docker -ArgumentList $loadArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput 'benchmark\loadgen-output.txt' -RedirectStandardError 'benchmark\loadgen-error.txt'
Write-Host "[4/5] load: $Concurrency concurrent for ${DurationSec}s (containerized, no host proxy)"

 $chaosAtSec = [Math]::Max(5, [int]($DurationSec / 2))
Start-Sleep -Seconds $chaosAtSec
 $wid = (docker compose -p $proj -f $bench ps -q worker | Select-Object -First 1)
Write-Host "      chaos: killing worker container at t+${chaosAtSec}s, restarting"
docker kill $wid | Out-Null
Start-Sleep -Seconds 2
docker start $wid | Out-Null

Write-Host "      waiting for load generator..."
if (-not $load.WaitForExit($DurationSec * 1000 + 60000)) { throw 'load generator did not finish' }
Write-Host "      load done. summary:"
Get-Content benchmark\loadgen-output.txt -Tail 8 | ForEach-Object { Write-Host "        $_" }

Write-Host "[5/5] draining - stops when numbers stop moving"
 $deadline = (Get-Date).AddSeconds(300)
 $lastLedger = -1
 $stable = 0
 $submitted = 0
 $ledger = 0
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 5
  $submitted = (Get-JobsCount) - $jobsBefore
  $ledger = (Get-LedgerDelivered) - $ledgerBefore
  Write-Host "      drain: delivered=$ledger / submitted=$submitted"
  if ($submitted -gt 0 -and $ledger -ge $submitted) { break }
  if ($ledger -eq $lastLedger) { $stable++ } else { $stable = 0 }
  $lastLedger = $ledger
  if ($stable -ge 6) { Write-Host "      numbers stable, done"; break }
}
 $t1 = Get-Date

Start-Sleep -Seconds 20
 $submittedFinal = (Get-JobsCount) - $jobsBefore
 $ledgerFinal = (Get-LedgerDelivered) - $ledgerBefore
 $mailpitFinal = (docker compose -p $proj -f $bench exec -T mailpit sh -c "wget -qO- http://localhost:8025/api/v1/messages 2>/dev/null | head -c 200" | Out-String)
Write-Host "      computing latency..."
 $lat = Get-RunLatency $runId

 $p50ms = $null; $p95ms = $null; $p99ms = $null; $latCount = 0
if ($lat) {
  $p50ms = $lat.p50; $p95ms = $lat.p95; $p99ms = $lat.p99; $latCount = $lat.count
}

 $elapsedSec = [Math]::Round(($t1 - $t0).TotalSeconds, 1)
 $sustained = if ($elapsedSec -gt 0) { [Math]::Round($ledgerFinal / $elapsedSec, 1) } else { 0 }
 $zeroLoss = ($ledgerFinal -eq $submittedFinal -and $submittedFinal -gt 0)

 $results = [PSCustomObject]@{
  started_at                = $t0.ToUniversalTime().ToString('o')
  architecture              = "fully containerized: $ApiReplicas api (nginx lb) + $Workers workers on docker network"
  concurrency               = $Concurrency
  duration_sec              = $DurationSec
  chaos                     = "worker container killed mid-load at t+${chaosAtSec}s and restarted"
  submitted                 = $submittedFinal
  delivered_ledger          = $ledgerFinal
  lost                      = $submittedFinal - $ledgerFinal
  sustained_jobs_per_sec    = $sustained
  latency_p50_ms            = $p50ms
  latency_p95_ms            = $p95ms
  latency_p99_ms            = $p99ms
  latency_sample_count      = $latCount
  zero_loss                 = $zeroLoss
}
 $results | ConvertTo-Json | Set-Content benchmark\results.json

Write-Host ""
Write-Host "================ BENCHMARK RESULT ================" -ForegroundColor Cyan
 $results | Format-List
if ($zeroLoss) { Write-Host "ZERO LOSS under mid-load worker kill" -ForegroundColor Green }
Write-Host "results written to benchmark\results.json"

docker compose -p $proj -f $bench down | Out-Null



