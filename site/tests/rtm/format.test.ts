// Every formatting branch the Rupee Time Machine has, including the ones a
// screenshot would never catch: the signed zero, the boundary at ten rupees,
// and Indian digit grouping on a figure large enough to have two commas in the
// wrong places under any other locale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtCum, fmtINR, fmtMult, fmtRate, fmtTick, spanLabel } from '../../src/lib/rtm.ts';

test('rupees group the Indian way', () => {
  // The whole reason this is not toLocaleString('en-US'): a crore reads
  // 1,00,00,000 here and 10,000,000 there, and the second is the wrong country.
  assert.equal(fmtINR(10000000), '1,00,00,000');
  assert.equal(fmtINR(1234567), '12,34,567');
  assert.equal(fmtINR(100000), '1,00,000');
  assert.equal(fmtINR(1000), '1,000');
  assert.equal(fmtINR(100), '100');
});

test('rupees round to the rupee from ten up, and keep paise below it', () => {
  assert.equal(fmtINR(456.35), '456');
  assert.equal(fmtINR(456.5), '457');
  assert.equal(fmtINR(10), '10');
  assert.equal(fmtINR(10.4), '10');
  // Just under the boundary is still a two-decimal figure.
  assert.equal(fmtINR(9.994), '9.99');
  assert.equal(fmtINR(1.5), '1.50');
  assert.equal(fmtINR(0.07), '0.07');
});

test('a rupee figure never carries a signed zero', () => {
  // −0.001 rounds to zero, and "−0.00" is an artefact of the arithmetic
  // rather than a price anybody paid.
  assert.equal(fmtINR(-0.001), '0.00');
  assert.equal(fmtINR(-0), '0.00');
  assert.equal(fmtINR(0), '0.00');
  // A real negative keeps its sign.
  assert.equal(fmtINR(-5.5), '−5.50');
  assert.equal(fmtINR(-4200), '−4,200');
});

test('multipliers drop the decimal once they pass ten', () => {
  assert.equal(fmtMult(4.5635), '4.6×');
  assert.equal(fmtMult(1), '1.0×');
  assert.equal(fmtMult(9.94), '9.9×');
  assert.equal(fmtMult(10), '10×');
  assert.equal(fmtMult(54.17), '54×');
  assert.equal(fmtMult(54.6), '55×');
  assert.equal(fmtMult(0.5), '0.5×');
});

test('rates print one decimal, always', () => {
  assert.equal(fmtRate(5.9157), '5.9');
  assert.equal(fmtRate(6), '6.0');
  assert.equal(fmtRate(0.04), '0.0');
  assert.equal(fmtRate(12.36), '12.4');
  assert.equal(fmtRate(-11.31), '−11.3');
  // A rate that rounds to nothing loses its sign, the same as a rupee does.
  assert.equal(fmtRate(-0.02), '0.0');
});

test('a cumulative change is unsigned and drops its decimal from 100 up', () => {
  // The sentence says "up" or "down"; the number never argues with it.
  assert.equal(fmtCum(356.35), '356');
  assert.equal(fmtCum(5317.09), '5,317');
  assert.equal(fmtCum(100), '100');
  assert.equal(fmtCum(99.96), '100.0');
  assert.equal(fmtCum(35.12), '35.1');
  assert.equal(fmtCum(-8.7), '8.7');
  assert.equal(fmtCum(-356.35), '356');
  assert.equal(fmtCum(0), '0.0');
});

test('chart-edge figures compact to crores from one crore up', () => {
  // A fourteen-character tick clips against the card's frame, which is where
  // this formatter lives; a sentence would simply wrap.
  assert.equal(fmtTick(1e7), '₹1.00 Cr');
  assert.equal(fmtTick(18460100), '₹1.85 Cr');
  assert.equal(fmtTick(1.2e9), '₹120 Cr');
  assert.equal(fmtTick(54.17e9), '₹5,417 Cr');
  // Below a crore nothing changes: whole ticks stay whole, readings keep
  // their paise, and the melt's end label still says "₹22".
  assert.equal(fmtTick(9999999), '₹99,99,999');
  assert.equal(fmtTick(120), '₹120');
  assert.equal(fmtTick(0), '₹0');
  assert.equal(fmtTick(21.913), '₹22');
  assert.equal(fmtTick(4.5), '₹4.50');
});

test('a span is said the way a person says it', () => {
  assert.equal(spanLabel(1), '1 month');
  assert.equal(spanLabel(2), '2 months');
  assert.equal(spanLabel(11), '11 months');
  assert.equal(spanLabel(12), 'a year');
  assert.equal(spanLabel(13), '13 months');
  assert.equal(spanLabel(23), '23 months');
  assert.equal(spanLabel(24), '2 years');
  assert.equal(spanLabel(29), '2 years');
  assert.equal(spanLabel(30), '3 years'); // 2.5 rounds up
  assert.equal(spanLabel(317), '26 years');
  assert.equal(spanLabel(683), '57 years');
  // Direction is the caller's business; the label is a length.
  assert.equal(spanLabel(-12), 'a year');
});
