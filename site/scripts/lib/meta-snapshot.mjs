import { readFile, mkdir, rename, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

export const META_LIVE_URL = 'https://timeseriesofindia.com/data/live/traffic.json';
const DAY = 86_400_000;
const dateOf = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const HISTORIES = [
  ['daily', row => row.day], ['beacon_daily', row => row.day],
  ['hourly', row => row.ts], ['formats_daily', row => `${row.day}|${row.format}`],
  ['countries_daily', row => `${row.day}|${row.country}`],
  ['countries_human_daily', row => `${row.day}|${row.country}`],
  ['referrers_daily', row => `${row.day}|${row.host}`],
];

const mergeRows = (previous, fresh, key) => {
  const rows = new Map((previous || []).map(row => [key(row), row]));
  for (const row of fresh) rows.set(key(row), row);
  return [...rows.values()].sort((a, b) => key(a).localeCompare(key(b)));
};

// The public feed can omit older sparse hourly buckets that a DB snapshot
// retained. Keep those archival rows; live values win wherever keys overlap.
export function retainMetaHistory(data, previous) {
  if (!previous) return data;
  const merged = { ...data };
  for (const [field, key] of HISTORIES) merged[field] = mergeRows(previous[field], data[field], key);
  const pieces = new Map((previous.content || []).map(item => [item.slug, item]));
  for (const item of data.content) {
    pieces.set(item.slug, { ...item,
      daily: mergeRows(pieces.get(item.slug)?.daily, item.daily, row => row.day) });
  }
  merged.content = [...pieces.values()];
  merged.dispatches = mergeRows(previous.dispatches, data.dispatches, row => row.id);
  return merged;
}

export async function readMetaSnapshot(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// A new build timestamp cannot make old observations fresh. Check the data
// windows themselves, and keep the history already available to the fallback.
/**
 * @param {Record<string, any>} data
 * @param {{now?: number, previous?: Record<string, any>|null, live?: boolean}} [options]
 */
export function validateMetaSnapshot(data, { now = Date.now(), previous = null, live = false } = {}) {
  if (!data || typeof data !== 'object') throw Error('Meta snapshot must be an object.');
  const built = Date.parse(data.built_at);
  if (!Number.isFinite(built) || built > now + 5 * 60_000
      || (live && now - built > 60 * 60_000)) {
    throw Error('Meta source timestamp is invalid or more than one hour old.');
  }
  const today = new Date(now).toISOString().slice(0, 10);
  const minimumDay = new Date(now - 2 * DAY).toISOString().slice(0, 10);
  const arrays = ['daily', 'hourly', 'beacon_daily', 'countries_daily',
    'countries_human_daily', 'referrers_daily', 'formats_daily', 'content', 'dispatches'];
  for (const field of arrays) {
    if (!Array.isArray(data[field])) throw Error(`Meta snapshot is missing ${field}.`);
  }
  for (const field of ['daily', 'beacon_daily', 'formats_daily']) {
    const rows = data[field];
    if (!rows.length || rows.some(row => !dateOf(row.day) || row.day >= today)) {
      throw Error(`Meta ${field} must contain sealed UTC observation days.`);
    }
    const latest = rows.reduce((day, row) => row.day > day ? row.day : day, '');
    if (latest < minimumDay) {
      throw Error(`Meta ${field} ends ${latest}; need ${minimumDay} or later. Refresh telemetry or use --live.`);
    }
  }
  if (!data.hourly.length || data.hourly.some(row => !Number.isFinite(Date.parse(row.ts)))) {
    throw Error('Meta hourly observations are missing or invalid.');
  }
  const latestHour = Math.max(...data.hourly.map(row => Date.parse(row.ts)));
  if (latestHour < now - 12 * 60 * 60_000 || latestHour > now + 5 * 60_000) {
    throw Error('Meta hourly observations are stale or in the future.');
  }
  if (!data.content.length || data.content.some(item => !item.slug || !item.title
      || !['play', 'read', 'explore'].includes(item.format)
      || typeof item.url !== 'string' || !/^\/(?!\/)/.test(item.url)
      || !Array.isArray(item.daily)
      || item.daily.some(row => !dateOf(row.day) || row.day > today))) {
    throw Error('Meta content must include the full history with valid piece metadata.');
  }
  if (!dateOf(data.content_harvest_day) || data.content_harvest_day < minimumDay
      || data.content_harvest_day > today) {
    throw Error('Meta content harvest is stale or invalid.');
  }
  if (previous) {
    for (const [field, key] of HISTORIES) {
      const retained = new Set(data[field].map(key));
      if ((previous[field] || []).some(row => !retained.has(key(row)))) {
        throw Error(`Meta replacement would drop ${field} history.`);
      }
    }
    const pieces = new Map(data.content.map(item => [item.slug, new Set(item.daily.map(row => row.day))]));
    for (const item of previous.content || []) {
      const days = pieces.get(item.slug);
      if (!days || item.daily.some(row => !days.has(row.day))) {
        throw Error(`Meta replacement would drop content history for ${item.slug}.`);
      }
    }
  }
  return data;
}

export async function refreshMetaFromLive(path, { fetchImpl = fetch, now = Date.now() } = {}) {
  const previous = await readMetaSnapshot(path);
  const response = await fetchImpl(META_LIVE_URL, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Error(`Meta live fetch failed: HTTP ${response.status}. Existing fallback kept.`);
  const text = await response.text();
  const source = validateMetaSnapshot(JSON.parse(text), { now, live: true });
  const data = validateMetaSnapshot(retainMetaHistory(source, previous), { now, previous, live: true });
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(data) + '\n');
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
  return data;
}
