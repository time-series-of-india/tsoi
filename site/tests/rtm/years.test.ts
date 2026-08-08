// The year pages' arithmetic and their sentences.
//
// /economy/explore/rupee-time-machine/1990 is a static page built entirely
// from the dataset's year block, so everything a reader sees on it — the
// headline, the three restated lines, and every cell of the crawlable table —
// is computed in lib/rtm.ts and pinned here.
//
// The fixture is a staircase that doubles every January, which makes the
// answers checkable by eye: ₹100 of 2000 is ₹6,400 six doublings later, and
// every year-on-year on the way is exactly 100%.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YEAR_AMOUNT, fmtINR, latestYear, yearAnswer, yearHeadlineHtml, yearOf, yearRows,
} from '../../src/lib/rtm.ts';
import { build, doubling, yearly } from './fixture.ts';

test('the year block runs full years and ends on a part-year that says so', () => {
  const d = yearly();
  assert.deepEqual(d.years.map((e) => e.y), [2000, 2001, 2002, 2003, 2004, 2005, 2006]);
  assert.equal(d.years.at(-1)!.partial, 'to June');
  assert.equal(latestYear(d).y, 2006);
  // A part-year has no rate, and neither has the first year in the block.
  assert.equal(d.years[0].infl, null);
  assert.equal(d.years.at(-1)!.infl, null);
  // Every year in between doubles.
  for (const e of d.years.slice(1, -1)) assert.equal(e.infl, 100);
  // The averages are the staircase, renormalized so the last month is 100.
  assert.equal(yearOf(d, 2000).avg, 1.5625);
  assert.equal(yearOf(d, 2003).avg, 12.5);
  assert.equal(yearOf(d, 2006).avg, 100);
});

test('the headline prices at the month the line ends, not the part-year mean', () => {
  // A smooth line, so the current year's six-month average sits below the
  // last month's value: the staircase fixtures cannot tell these apart.
  const d = build('2000-01', '2001-06', (i) => 2 ** (i / 12));
  const a = yearAnswer(d, 2000);
  const avgBased = YEAR_AMOUNT * latestYear(d).avg / yearOf(d, 2000).avg;
  assert.equal(a.result, YEAR_AMOUNT * (d.idx[d.idx.length - 1] / yearOf(d, 2000).avg));
  assert.ok(a.result > avgBased, 'the June figure must beat the January–June mean on a rising line');
  // The table's last row keeps the part-year mean, labelled as one.
  const last = yearRows(d, 2000).at(-1)!;
  assert.equal(last.label, '2001 (to June)');
  assert.equal(last.becomes, `₹${fmtINR(avgBased)}`);
});

test('a year the price line does not carry is a build error, not a blank page', () => {
  assert.throws(() => yearOf(yearly(), 1947), /carries no year 1947/);
});

test('every year page prices the same hundred rupees', () => {
  assert.equal(YEAR_AMOUNT, 100);
  assert.equal(yearAnswer(yearly(), 2003).amount, 100);
});

test('the headline states the year at its twelve-month average', () => {
  const a = yearAnswer(yearly(), 2000);
  assert.equal(a.headline,
    '₹100 in 2000 amounts to about ₹6,400 in June 2006, taking 2000 at its twelve-month average.');
  assert.equal(a.mult, 64);
  assert.equal(a.result, 6400);
  assert.equal(a.monthsApart, 72);
});

test('the three machine lines are restated for the year pair', () => {
  const a = yearAnswer(yearly(), 2000);
  assert.equal(a.multiplierLine,
    'Prices multiplied 64× in 6 years: up 6,300%, an average of 100.0% a year.');
  assert.equal(a.inverseLine,
    'Run it backwards: ₹100 in June 2006 amounts to about ₹1.56 in 2000.');
  assert.equal(a.buysLine, 'A rupee in June 2006 buys 1.6% of what it bought in 2000.');
});

test('a nearer year states a shorter span and a smaller multiplier', () => {
  const a = yearAnswer(yearly(), 2005);
  assert.equal(a.mult, 2);
  assert.equal(a.monthsApart, 12);
  assert.equal(a.multiplierLine,
    'Prices multiplied 2.0× in a year: up 100%, an average of 100.0% a year.');
  assert.equal(a.headline,
    '₹100 in 2005 amounts to about ₹200 in June 2006, taking 2005 at its twelve-month average.');
});

test('a falling price line says down rather than up', () => {
  // The same staircase inverted: prices halve every January instead.
  const d = build('2000-01', '2006-06', (i) => 0.5 ** Math.floor(i / 12));
  assert.equal(yearAnswer(d, 2000).multiplierLine,
    'Prices multiplied 0.0× in 6 years: down 98.4%, an average of −50.0% a year.');
});

test('the marked-up headline is the plain one with two figures wrapped', () => {
  // Same guard as the machine's primary sentence: the page must never hold a
  // second copy of the wording that can drift from the tested one.
  for (const year of [2000, 2002, 2005]) {
    const a = yearAnswer(yearly(), year);
    const html = yearHeadlineHtml(a);
    assert.equal(html.replace(/<[^>]+>/g, ''), a.headline);
    assert.equal((html.match(/class="rtm-fig/g) ?? []).length, 2);
    assert.equal((html.match(/rtm-result/g) ?? []).length, 1);
  }
});

test('the table runs from the page year to the part-year, priced against the page year', () => {
  const rows = yearRows(yearly(), 2003);
  assert.deepEqual(rows.map((r) => r.label), ['2003', '2004', '2005', '2006 (to June)']);
  assert.deepEqual(rows.map((r) => r.becomes), ['₹100', '₹200', '₹400', '₹800']);
  // The page's own year is the base, so its row reads ₹100 exactly.
  assert.equal(rows[0].becomes, `₹${YEAR_AMOUNT}`);
});

test('the table leaves a year with no comparable rate blank', () => {
  const rows = yearRows(yearly(), 2003);
  assert.deepEqual(rows.map((r) => r.infl), ['100.0%', '100.0%', '100.0%', '']);
  // The first year of the block has no previous year to compare with.
  assert.equal(yearRows(yearly(), 2000)[0].infl, '');
});

test('the last row of a year page is the last year the block carries', () => {
  const d = yearly();
  for (const year of [2000, 2003, 2005]) {
    const rows = yearRows(d, year);
    assert.equal(rows.at(-1)!.y, latestYear(d).y);
    assert.equal(rows[0].y, year);
    assert.equal(rows.length, latestYear(d).y - year + 1);
  }
});

test('a block with no part-year labels every row plainly', () => {
  // `doubling` ends in December, so its last year is full.
  const rows = yearRows(doubling(), 2004);
  assert.deepEqual(rows.map((r) => r.label), ['2004', '2005']);
});
