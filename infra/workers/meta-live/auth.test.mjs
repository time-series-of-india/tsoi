import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.js';

const TOKEN = 'test-only-analytics-token';
const request = (authorization, method = 'POST') => new Request('https://example.invalid/__run', {
  method,
  headers: authorization === undefined ? {} : { Authorization: authorization },
});

function fixture(secret) {
  const reads = [];
  const env = {
    CF_ANALYTICS_TOKEN: secret,
    META: {
      async get(key) {
        reads.push(key);
        // Stop before any network requests or writes while proving refresh entry.
        throw new Error('test refresh boundary');
      },
    },
  };
  return { env, reads };
}

test('manual refresh fails closed when the secret binding is missing or invalid', async () => {
  for (const secret of [undefined, null, '', '   ', 0]) {
    const { env, reads } = fixture(secret);
    const response = await worker.fetch(request(`Bearer ${secret}`), env);
    assert.equal(response.status, 503, `invalid secret type ${typeof secret}`);
    assert.equal(await response.text(), '');
    assert.deepEqual(reads, []);
  }
});

test('manual refresh rejects missing, incorrect and malformed credentials before R2 access', async () => {
  for (const header of [undefined, 'Bearer wrong', 'Bearer undefined', `Basic ${TOKEN}`, TOKEN]) {
    const { env, reads } = fixture(TOKEN);
    const response = await worker.fetch(request(header), env);
    assert.equal(response.status, 401);
    assert.deepEqual(reads, []);
  }
});

test('the configured token permits the guarded refresh', async () => {
  const { env, reads } = fixture(TOKEN);
  const response = await worker.fetch(request(`Bearer ${TOKEN}`), env);
  assert.deepEqual(reads, ['traffic.json']);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Error: test refresh boundary' });
});

test('manual refresh remains POST-only even with the configured token', async () => {
  const { env, reads } = fixture(TOKEN);
  const response = await worker.fetch(request(`Bearer ${TOKEN}`, 'GET'), env);
  assert.equal(response.status, 404);
  assert.deepEqual(reads, []);
});
