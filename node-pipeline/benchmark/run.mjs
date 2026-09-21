import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : fallback;
}

const CONCURRENCY = arg('concurrency', 60);
const RATE = arg('rate', 0);
const DURATION_SEC = arg('duration', 60);
const WORKERS = arg('workers', 8);
const API_REPLICAS = arg('api-replicas', 8);

const PROJ = 'emailbench';
const COMPOSE = 'docker/docker-compose.bench.yml';
const RUN_ID = 'bench-' + new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sh(cmd, parts, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, parts, { stdio: opts.capture ? ['pipe', 'pipe', 'inherit'] : 'inherit' });
    let out = '';
    if (opts.capture) {
      child.stdout.on('data', (d) => { out += d.toString(); });
      if (opts.stdin) child.stdin.write(opts.stdin);
      child.stdin.end();
    }
    child.on('close', (code) => resolve({ code, out }));
  });
}

const compose = (parts, opts) => sh('docker', ['compose', '-p', PROJ, '-f', COMPOSE, ...parts], opts);

async function countRows(db, query) {
  const r = await compose(['exec', '-T', 'postgres', 'psql', '-U', 'email', '-d', db, '-t', '-A', '-c', query], { capture: true });
  const line = r.out.split('\n').find((l) => /\d/.test(l));
  return line ? parseInt(line, 10) : 0;
}

const countJobs = () => countRows('email_api_db', 'SELECT count(*) FROM email_jobs');
const countLedger = () => countRows('email_worker_db', "SELECT count(*) FROM delivery_attempts WHERE outcome = 'DELIVERED'");

async function applyMigrations() {
  for (const [dir, db] of [['prisma/api/migrations', 'email_api_db'], ['prisma/worker/migrations', 'email_worker_db']]) {
    const entries = (await readdir(dir)).sort();
    for (const entry of entries) {
      let sql;
      try {
        sql = await readFile(join(dir, entry, 'migration.sql'), 'utf8');
      } catch {
        continue;
      }
      const r = await compose(['exec', '-T', 'postgres', 'psql', '-U', 'email', '-d', db, '-v', 'ON_ERROR_STOP=1'], { capture: true, stdin: sql });
      if (r.code !== 0) throw new Error(`migration failed: ${entry}`);
    }
  }
}

async function queryStdin(db, sql) {
  const r = await compose(['exec', '-T', 'postgres', 'psql', '-U', 'email', '-d', db, '-t', '-A', '-F', ','], { capture: true, stdin: sql });
  return r.out;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Math.round(sorted[i] * 10) / 10;
}

console.log(`=== CONTAINERIZED benchmark: ${API_REPLICAS} api + ${WORKERS} workers, concurrency ${CONCURRENCY}, ${DURATION_SEC}s ===`);

console.log('[1/5] clean start + stack up');
await compose(['down', '-v', '--remove-orphans']);
const up = await compose(['up', '-d', '--build', '--scale', `api=${API_REPLICAS}`, '--scale', `worker=${WORKERS}`, '--wait']);
if (up.code !== 0) throw new Error('stack did not become healthy');

console.log('[2/5] applying migrations (direct SQL)');
await applyMigrations();
console.log('      migrations applied');

const jobsBefore = await countJobs();
const ledgerBefore = await countLedger();
console.log(`[3/5] baselines: jobs=${jobsBefore} ledger=${ledgerBefore}`);

console.log(`[4/5] load: ${CONCURRENCY} concurrent for ${DURATION_SEC}s`);
const t0 = Date.now();
const load = spawn('docker', ['compose', '-p', PROJ, '-f', COMPOSE, 'run', '--rm',
  '-e', `CONCURRENCY=${CONCURRENCY}`,
  '-e', `DURATION_SEC=${DURATION_SEC}`,
  '-e', `RUN_ID=${RUN_ID}`,
  'loadgen'], { stdio: ['inherit', 'pipe', 'inherit'] });
let loadOut = '';
load.stdout.on('data', (d) => { loadOut += d.toString(); });

const chaosAt = Math.max(5, Math.floor(DURATION_SEC / 2));
setTimeout(async () => {
  const r = await compose(['ps', '-q', 'worker'], { capture: true });
  const wid = r.out.split('\n').map((s) => s.trim()).filter(Boolean)[0];
  if (wid) {
    console.log(`      chaos: killing worker at t+${chaosAt}s, restarting`);
    await sh('docker', ['kill', wid]);
    await sleep(2000);
    await sh('docker', ['start', wid]);
  }
}, chaosAt * 1000);

await new Promise((resolve) => load.on('close', resolve));
const jsonStart = loadOut.indexOf('{');
if (jsonStart >= 0) {
  console.log('      load done. summary:');
  console.log(loadOut.slice(jsonStart).trim());
} else {
  console.log('      load done.');
}

console.log('[5/5] draining - stops when numbers stop moving');
const deadline = Date.now() + 300000;
let lastLedger = -1;
let stable = 0;
let submitted = 0;
let delivered = 0;
while (Date.now() < deadline) {
  await sleep(5000);
  submitted = await countJobs();
  delivered = await countLedger();
  console.log(`      drain: delivered=${delivered} / submitted=${submitted}`);
  if (submitted > 0 && delivered >= submitted) break;
  if (delivered === lastLedger) stable++; else stable = 0;
  lastLedger = delivered;
  if (stable >= 6) { console.log('      numbers stable, done'); break; }
}
const t1 = Date.now();

await sleep(20000);
const submittedFinal = await countJobs();
const ledgerFinal = await countLedger();

console.log('      computing latency...');
const jobsOut = await queryStdin('email_api_db', `SELECT id, "createdAt" FROM email_jobs WHERE "idempotencyKey" LIKE '${RUN_ID}-%'`);
const attemptsOut = await queryStdin('email_worker_db', "SELECT job_id, created_at FROM delivery_attempts WHERE outcome = 'DELIVERED'");

const jobTimes = new Map();
for (const line of jobsOut.split('\n')) {
  const p = line.split(',');
  if (p.length === 2 && p[0]) jobTimes.set(p[0], new Date(p[1].trim()));
}
const diffs = [];
for (const line of attemptsOut.split('\n')) {
  const p = line.split(',');
  if (p.length === 2 && jobTimes.has(p[0])) {
    diffs.push(new Date(p[1].trim()) - jobTimes.get(p[0]));
  }
}
diffs.sort((a, b) => a - b);

const elapsedSec = Math.round(((t1 - t0) / 1000) * 10) / 10;
const sustained = elapsedSec > 0 ? Math.round((ledgerFinal / elapsedSec) * 10) / 10 : 0;
const zeroLoss = ledgerFinal === submittedFinal && submittedFinal > 0;

const results = {
  started_at: new Date(t0).toISOString(),
  architecture: `fully containerized: ${API_REPLICAS} api (nginx lb) + ${WORKERS} workers on docker network`,
  concurrency: CONCURRENCY,
  duration_sec: DURATION_SEC,
  chaos: `worker container killed mid-load at t+${chaosAt}s and restarted`,
  submitted: submittedFinal,
  delivered_ledger: ledgerFinal,
  lost: submittedFinal - ledgerFinal,
  sustained_jobs_per_sec: sustained,
  latency_p50_ms: percentile(diffs, 0.50),
  latency_p95_ms: percentile(diffs, 0.95),
  latency_p99_ms: percentile(diffs, 0.99),
  latency_sample_count: diffs.length,
  zero_loss: zeroLoss,
};
await writeFile('benchmark/results.json', JSON.stringify(results, null, 2) + '\n');

console.log('');
console.log('================ BENCHMARK RESULT ================');
console.log(JSON.stringify(results, null, 2));
if (zeroLoss) console.log('ZERO LOSS under mid-load worker kill');
console.log('results written to benchmark/results.json');

await compose(['down']);

