// Canonical bank/entity names for the raw-NPCI-JSON generators. Single source:
// BANK_NAME_MAP in etl/npci/normalize.py (the DB path's canonicaliser), parsed
// at import so the two pipelines can't drift. Raw NPCI files carry many casing/
// suffix variants of the same bank ("State Bank Of India", "HDFC BANK LTD." …);
// aggregating on the raw string splits one bank into several. Always group by
// canonBank(name), never the raw field. (pre-launch-tasks §H)
import { readFileSync } from 'node:fs';

const py = readFileSync(new URL('../../../etl/npci/normalize.py', import.meta.url), 'utf8');
const body = py.match(/BANK_NAME_MAP[^{]*\{([\s\S]*?)\n\}/)?.[1];
if (!body) throw new Error('canon-bank: BANK_NAME_MAP not found in etl/npci/normalize.py');

const exact = new Map();
for (const m of body.matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) exact.set(m[1], m[2]);

// Case/suffix-insensitive fold: catches variants the explicit map doesn't
// enumerate ("Hdfc Bank Ltd." etc.).
const fold = (s) =>
  String(s).trim().replace(/\s+/g, ' ').replace(/\s*(ltd\.?|limited)$/i, '').replace(/[.\s]+$/, '').toLowerCase();

const byFold = new Map();
for (const [k, v] of exact) {
  byFold.set(fold(v), v); // canonical values win over key-derived entries
}
for (const [k, v] of exact) {
  if (!byFold.has(fold(k))) byFold.set(fold(k), v);
}

// Unmapped names: first-seen variant (suffix-stripped) becomes the display form,
// so all later casing variants of the same bank still group together.
const seen = new Map();

export function canonBank(name) {
  if (name == null) return name;
  const t = String(name).trim().replace(/\s+/g, ' ');
  if (exact.has(t)) return exact.get(t);
  const f = fold(t);
  if (byFold.has(f)) return byFold.get(f);
  if (!seen.has(f)) seen.set(f, t.replace(/\s*(Ltd\.?|Limited)$/i, '').replace(/[.\s]+$/, '').trim());
  return seen.get(f);
}
