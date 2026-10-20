// Dated, manually verified national facts. No network or database access.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/** @param {string} csv */
export function buildMonsoonSnapshot(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length !== 2 || lines[0] !== 'period_start,period_end,actual_mm,normal_mm,normal_start,normal_end,release_date,source_url') throw new Error('Expected one national monsoon source record.');
  const values = lines[1].split(',');
  if (values.length !== 8) throw new Error('Invalid monsoon source columns.');
  const [start, end, actualText, normalText, normalStartText, normalEndText, released, sourceUrl] = values;
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (![start, end, released].every(validDate) || start.slice(0, 4) !== end.slice(0, 4) || !start.endsWith('-06-01') || !end.endsWith('-09-30') || released < end) throw new Error('Invalid monsoon season or release date.');
  const actualMm = Number(actualText), normalMm = Number(normalText);
  if (![actualText, normalText].every(value => /^\d+(\.\d+)?$/.test(value)) || ![actualMm, normalMm].every(value => Number.isFinite(value) && value > 0)) throw new Error('Rainfall totals must be positive millimetres.');
  const normalStart = Number(normalStartText), normalEnd = Number(normalEndText);
  if (![normalStartText, normalEndText].every(value => /^\d{4}$/.test(value)) || normalEnd < normalStart || normalEnd >= Number(start.slice(0, 4))) throw new Error('Invalid normal reference period.');
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || !(url.hostname === 'imd.gov.in' || url.hostname.endsWith('.imd.gov.in')) || !url.pathname.endsWith('.pdf')) throw new Error('Expected an official IMD report URL.');
  return { period: { start, end }, actualMm, normalMm, normalPeriod: { start: normalStart, end: normalEnd }, departurePct: Math.round((actualMm / normalMm - 1) * 1000) / 10, source: { agency: 'IMD', title: `Salient Features of the ${start.slice(0, 4)} Southwest Monsoon Season`, url: sourceUrl, released, table: 'Table 1, page 4; normal reference period, page 19' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const snapshot = buildMonsoonSnapshot(readFileSync(new URL('../../data/monsoon/seasonal-rainfall.csv', import.meta.url), 'utf8'));
  const output = new URL('../public/data/environment/home-monsoon.json', import.meta.url);
  mkdirSync(new URL('.', output), { recursive: true });
  writeFileSync(output, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Wrote ${fileURLToPath(output)}: ${snapshot.actualMm} mm / ${snapshot.normalMm} mm; departure ${snapshot.departurePct}%.`);
}
