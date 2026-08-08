// The sentences themselves, character for character.
//
// The result region is prose, and prose is what a reader quotes, screenshots
// and disputes. Testing the ingredients would leave the one thing that ships
// — the sentence — untested, so the strings are pinned here against fixtures
// whose arithmetic is exact.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SAME_MONTH_LINE, answer, chartKicker, inverseHtml, primaryHtml } from '../../src/lib/rtm.ts';
import { doubling, flat, synthetic } from './fixture.ts';

test('the primary sentence carries both figures and both months', () => {
  const a = answer(doubling(), { amount: 100, from: '2000-01', to: '2001-01' });
  assert.equal(a.primary, '₹100 in January 2000 amounts to about ₹200 in January 2001.');
});

test('the multiplier line states the multiplier, the cumulative change and the average rate', () => {
  const a = answer(doubling(), { amount: 100, from: '2000-01', to: '2001-01' });
  assert.equal(a.multiplierLine, 'Prices multiplied 2.0× in a year: up 100%, an average of 100.0% a year.');
  // Four years of doubling is sixteen times over, and still 100% a year.
  const b = answer(doubling(), { amount: 100, from: '2000-01', to: '2004-01' });
  assert.equal(b.multiplierLine, 'Prices multiplied 16× in 4 years: up 1,500%, an average of 100.0% a year.');
});

test('the inverse line runs the same journey backwards', () => {
  const a = answer(doubling(), { amount: 100, from: '2000-01', to: '2001-01' });
  assert.equal(a.inverseLine,
    'Run it backwards: ₹100 in January 2001 amounts to about ₹50 in January 2000.');
});

test('a reader who picks the months backwards gets the same sentences', () => {
  const d = doubling();
  const forward = answer(d, { amount: 100, from: '2000-01', to: '2001-01' });
  const backward = answer(d, { amount: 100, from: '2001-01', to: '2000-01' });
  assert.equal(backward.primary, forward.primary);
  assert.equal(backward.multiplierLine, forward.multiplierLine);
  assert.equal(backward.inverseLine, forward.inverseLine);
  assert.equal(backward.from, '2000-01');
  assert.equal(backward.to, '2001-01');
});

test('the same month twice is the degenerate case, and knows it', () => {
  const a = answer(synthetic(), { amount: 500, from: '2005-06', to: '2005-06' });
  assert.equal(a.same, true);
  assert.equal(a.monthsApart, 0);
  assert.equal(a.mult, 1);
  assert.equal(SAME_MONTH_LINE, 'Same month, same rupee. Pick two different months to travel.');
});

test('a flat price line travels without changing anything', () => {
  const a = answer(flat(), { amount: 250, from: '2000-01', to: '2002-12' });
  assert.equal(a.same, false);
  assert.equal(a.result, 250);
  assert.equal(a.inverse, 250);
  assert.equal(a.multiplierLine, 'Prices multiplied 1.0× in 3 years: up 0.0%, an average of 0.0% a year.');
});

test('months outside the series are clamped into it before anything is said', () => {
  const d = doubling();
  const a = answer(d, { amount: 100, from: '1800-01', to: '2099-01' });
  assert.equal(a.from, d.start);
  assert.equal(a.to, d.asOf);
});

test('a large amount keeps its Indian grouping inside the sentence', () => {
  const a = answer(doubling(), { amount: 1000000, from: '2000-01', to: '2001-01' });
  assert.equal(a.primary,
    '₹10,00,000 in January 2000 amounts to about ₹20,00,000 in January 2001.');
});

test('the marked-up sentence is the plain sentence with two figures wrapped', () => {
  // The regression this guards: a page that rebuilds the sentence in HTML and
  // slowly drifts from the wording the tests above pin.
  for (const params of [
    { amount: 100, from: '2000-01', to: '2001-01' },
    { amount: 1234567, from: '2000-06', to: '2005-12' },
    { amount: 1, from: '2003-03', to: '2003-04' },
  ]) {
    const a = answer(doubling(), params);
    const html = primaryHtml(a);
    assert.equal(html.replace(/<[^>]+>/g, ''), a.primary);
    // Both figures are wrapped, and only the second is the result.
    assert.equal((html.match(/class="rtm-fig/g) ?? []).length, 2);
    assert.equal((html.match(/rtm-result/g) ?? []).length, 1);
  }
});

test('the marked-up inverse sentence is the plain one with its answer wrapped', () => {
  // Same guard as the primary: the teal figure must never be a second copy of
  // the wording that can drift from `inverseLine`.
  for (const params of [
    { amount: 100, from: '2000-01', to: '2001-01' },
    { amount: 1234567, from: '2000-06', to: '2005-12' },
    { amount: 1, from: '2003-03', to: '2003-04' },
  ]) {
    const a = answer(doubling(), params);
    const html = inverseHtml(a);
    assert.equal(html.replace(/<[^>]+>/g, ''), a.inverseLine);
    // Exactly one figure is wrapped, and it is the backwards answer.
    assert.equal((html.match(/class="rtm-inv-fig"/g) ?? []).length, 1);
    assert.match(html, /<span class="rtm-inv-fig">₹[\d,.]+<\/span> in /);
  }
});

test('the chart kicker names the amount and the month it was spent', () => {
  assert.equal(chartKicker(100, 'January 2000'),
    'What ₹100 from January 2000 amounts to, month by month');
  assert.equal(chartKicker(5000, 'June 1975'),
    'What ₹5,000 from June 1975 amounts to, month by month');
});
