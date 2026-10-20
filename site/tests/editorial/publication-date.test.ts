import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationDate, requirePublicationDate } from '../../src/lib/publication-date.mjs';

test('an unpublished game has no RSS date and cannot pass release preflight', () => {
  assert.equal(publicationDate(null), null);
  assert.throws(() => requirePublicationDate(null), /agreed release date/);
});

test('publication day uses India midnight and remains fixed on later builds', () => {
  const date = requirePublicationDate('2026-10-20', new Date('2026-10-20T00:00:00Z'));
  assert.equal(date.toUTCString(), 'Mon, 19 Oct 2026 18:30:00 GMT');
  assert.equal(requirePublicationDate('2026-10-20', new Date('2026-11-01')).getTime(), date.getTime());
});

test('invalid and future publication days cannot ship', () => {
  for (const day of ['', '2026-2-1', '2026-02-30', '2026-13-01', undefined]) {
    assert.throws(() => publicationDate(day));
  }
  assert.throws(() => requirePublicationDate('2026-10-21', new Date('2026-10-20T00:00:00Z')), /future/);
});
