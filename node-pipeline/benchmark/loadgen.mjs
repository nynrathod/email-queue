const DURATION_MS = Number(process.env.DURATION_SEC || 60) * 1000;
const CONCURRENCY = Number(process.env.CONCURRENCY || 60);
const TARGET_RPS = Number(process.env.TARGET_RPS || 0);
const API_KEY = process.env.API_KEY || 'local-dev-api-key-change-me-please';
const BASE = process.env.API_URL || 'http://localhost:3000';
const RUN_ID = process.env.RUN_ID || 'bench';

let sent = 0;
let ok = 0;
let failed = 0;
const t0 = performance.now();
const deadline = t0 + DURATION_MS;

function submitOne(key) {
  const body = JSON.stringify({
    tenantId: 'bench-tenant',
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: `bench ${key}`,
    text: `benchmark body ${key}`,
  });
  sent++;
  return fetch(`${BASE}/v1/email-jobs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'idempotency-key': key,
    },
    body,
  })
    .then((response) => {
      if (response.status === 201) ok++;
      else failed++;
    })
    .catch(() => {
      failed++;
    });
}

async function closedLoop() {
  async function worker(id) {
    let seq = 0;
    while (performance.now() < deadline) {
      await submitOne(`${RUN_ID}-${id}-${seq}`);
      seq++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
}

async function pacedLoop() {
  const batch = Math.max(1, Math.round(TARGET_RPS / 10));
  let seq = 0;
  while (performance.now() < deadline) {
    const windowStart = performance.now();
    for (let i = 0; i < batch && performance.now() < deadline; i++) {
      submitOne(`${RUN_ID}-p-${seq}`);
      seq++;
    }
    const spent = performance.now() - windowStart;
    await new Promise((r) => setTimeout(r, Math.max(0, 100 - spent)));
  }
}

await (TARGET_RPS > 0 ? pacedLoop() : closedLoop());
const elapsed = (performance.now() - t0) / 1000;
console.log(JSON.stringify({
  sent,
  ok,
  failed,
  elapsed_sec: Math.round(elapsed * 10) / 10,
  achieved_rps: Math.round(ok / elapsed),
  target_rps: TARGET_RPS || null,
}, null, 2));
