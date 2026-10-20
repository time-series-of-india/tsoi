import test from 'node:test';
import assert from 'node:assert/strict';
import { lead, publications, economyPublications } from '../../src/lib/publications';

test('the Weather Wings lead is separate from the catalogue and the Walk is playable', () => {
  assert.equal(lead.id, 'weather-wings');
  assert.equal(publications.find(piece => piece.id === 'walk')?.format, 'Play');
  assert.ok(economyPublications.every(piece => piece.section === 'economy'));
  assert.ok(!economyPublications.some(piece => piece.id === 'walk'));
  assert.equal(publications.length, 8);
  assert.equal(new Set(publications.map(piece => piece.id)).size, 8);
  assert.ok(publications.every(piece => piece.id !== lead.id));
});

test('the selected opening catalogue order remains unchanged', () => {
  assert.deepEqual(economyPublications.slice(0, 4).map(piece => piece.id), [
    'peaks', 'upi', 'inflation-explore', 'inflation-read',
  ]);
  assert.deepEqual(publications.map(piece => piece.initialRank), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('short card decks excerpt source copy without replacing the full description', () => {
  for (const piece of economyPublications) {
    assert.ok(piece.cardDescription, piece.id);
    assert.ok(piece.description.includes(piece.cardDescription), piece.id);
    assert.ok(piece.cardDescription.length < piece.description.length, piece.id);
    assert.ok(piece.cardDescription.split(/\s+/).length <= 14, piece.id);
  }
});
