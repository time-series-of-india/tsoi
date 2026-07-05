// Produces a Survey-of-India-aligned state map for the choropleth by swapping the
// three boundary-sensitive states (J&K, Ladakh, Arunachal Pradesh) in our base
// state map with the compliant geometry from india-official-geojson (vendored).
// Keeps every other current state (incl. Telangana) from the base. Idempotent.
//
// Boundary source: india-official-geojson by Abhinav Swami (MIT),
// https://github.com/AbhinavSwami28/india-official-geojson — which sources J&K /
// Ladakh from india-in-data/kashmir. Depicts India per the Government of India
// position (PoK, Gilgit-Baltistan, Siachen, Aksai Chin, full Arunachal Pradesh).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MAP = resolve(here, '../public/maps/india_states.json');
const OFF = resolve(here, 'vendor/india-official-states.geojson');

const base = JSON.parse(readFileSync(MAP, 'utf8'));
const off = JSON.parse(readFileSync(OFF, 'utf8'));
const offGeom = Object.fromEntries(off.features.map((f) => [f.properties.NAME_1, f.geometry]));

// our base `name` (uppercase) -> official NAME_1
const SWAP = {
  'JAMMU & KASHMIR': 'Jammu and Kashmir',
  LADAKH: 'Ladakh',
  'ARUNACHAL PRADESH': 'Arunachal Pradesh',
};

let n = 0;
for (const f of base.features) {
  const src = SWAP[f.properties.name];
  if (src && offGeom[src]) { f.geometry = offGeom[src]; n++; }
}
base.attribution =
  'State boundaries: india-official-geojson by Abhinav Swami (MIT); J&K & Ladakh via india-in-data/kashmir. Depicts India per the Government of India position.';

writeFileSync(MAP, JSON.stringify(base));
console.log(`swapped ${n} boundary-sensitive states; wrote ${MAP}`);
