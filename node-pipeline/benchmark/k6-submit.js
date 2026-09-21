import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'local-dev-api-key-change-me-please';
const RUN_ID = __ENV.RUN_ID || 'bench';

export const options = {
  scenarios: {
    submit: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.TARGET_RPS || 2000),
      timeUnit: '1s',
      duration: __ENV.DURATION || '60s',
      preAllocatedVUs: 500,
      maxVUs: 3000,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(99)<2000'],
  },
};

export default function () {
  const id = `${RUN_ID}-${__VU}-${__ITER}`;
  const payload = JSON.stringify({
    tenantId: 'bench-tenant',
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: `bench ${id}`,
    text: `benchmark body ${id}`,
  });
  const response = http.post(`${BASE_URL}/v1/email-jobs`, payload, {
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'idempotency-key': id,
    },
  });
  check(response, { submitted: (r) => r.status === 201 });
}
