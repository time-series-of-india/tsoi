// The deep link. A shared URL is the machine's one piece of persistence, so
// the rule under test is field independence: junk in one parameter must cost
// the reader that parameter and nothing else.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_AMOUNT, DEFAULT_FROM, MAX_AMOUNT, parseParams, toQuery } from '../../src/lib/rtm.ts';
import { build } from './fixture.ts';

// A span wide enough to hold the real defaults, so the fallbacks under test
// are the shipped ones rather than clamped substitutes.
const data = build('1969-08', '2026-06', (i) => 1.003 ** i);

test('an empty query string is the default view', () => {
  assert.deepEqual(parseParams('', data), { amount: DEFAULT_AMOUNT, from: DEFAULT_FROM, to: '2026-06' });
  assert.deepEqual(parseParams('?', data), { amount: 100, from: '2000-01', to: '2026-06' });
});

test('a complete query string is read as given', () => {
  assert.deepEqual(parseParams('?amount=5000&from=1975-06&to=2026-06', data),
    { amount: 5000, from: '1975-06', to: '2026-06' });
  // The leading ? is optional; the page hands over location.search either way.
  assert.deepEqual(parseParams('amount=1&from=1969-08&to=1969-09', data),
    { amount: 1, from: '1969-08', to: '1969-09' });
});

test('a from after a to is left alone here — ordering is the answer\'s job', () => {
  assert.deepEqual(parseParams('?from=2020-01&to=1990-01', data),
    { amount: 100, from: '2020-01', to: '1990-01' });
});

test('junk in one field never touches another', () => {
  assert.deepEqual(parseParams('?amount=abc&from=1975-06&to=2000-01', data),
    { amount: 100, from: '1975-06', to: '2000-01' });
  assert.deepEqual(parseParams('?amount=250&from=lastyear&to=2000-01', data),
    { amount: 250, from: '2000-01', to: '2000-01' });
  assert.deepEqual(parseParams('?amount=250&from=1975-06&to=hello', data),
    { amount: 250, from: '1975-06', to: '2026-06' });
});

test('an amount must be a whole positive rupee inside the ceiling', () => {
  for (const bad of ['0', '-5', '1.5', '1e3', ' ', '١٢٣', '100,000', '+100', 'Infinity',
    String(MAX_AMOUNT + 1), '99999999999999999999']) {
    assert.equal(parseParams(`?amount=${encodeURIComponent(bad)}`, data).amount, DEFAULT_AMOUNT,
      `"${bad}" should not survive as an amount`);
  }
  assert.equal(parseParams('?amount=1', data).amount, 1);
  assert.equal(parseParams(`?amount=${MAX_AMOUNT}`, data).amount, MAX_AMOUNT);
});

test('a month the series does not have falls back rather than clamping', () => {
  // Answering a question about 1947 with a figure from August 1969 would be a
  // different question answered with a straight face.
  assert.equal(parseParams('?from=1947-08', data).from, DEFAULT_FROM);
  assert.equal(parseParams('?to=2099-01', data).to, data.asOf);
  assert.equal(parseParams('?from=1969-07', data).from, DEFAULT_FROM);
  assert.equal(parseParams('?from=1969-08', data).from, '1969-08');
  assert.equal(parseParams('?to=2026-07', data).to, data.asOf);
});

test('a malformed month shape is rejected before it reaches the axis', () => {
  for (const bad of ['2000-13', '2000-00', '2000-1', '00-01', '2000/01', '2000-01-15']) {
    assert.equal(parseParams(`?from=${encodeURIComponent(bad)}`, data).from, DEFAULT_FROM,
      `"${bad}" should not survive as a month`);
  }
});

test('a URLSearchParams is read the same way a string is', () => {
  const p = new URLSearchParams({ amount: '42', from: '1980-05', to: '1990-05' });
  assert.deepEqual(parseParams(p, data), { amount: 42, from: '1980-05', to: '1990-05' });
});

test('the query string round-trips through the parser', () => {
  const params = { amount: 5000, from: '1975-06', to: '2026-06' };
  assert.equal(toQuery(params), '?amount=5000&from=1975-06&to=2026-06');
  assert.deepEqual(parseParams(toQuery(params), data), params);
});

test('a repeated parameter takes the first value, not the last', () => {
  // URLSearchParams.get is first-wins; pinned because a link with a duplicated
  // field should behave predictably rather than by accident.
  assert.equal(parseParams('?amount=7&amount=9', data).amount, 7);
});
