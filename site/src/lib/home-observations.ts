import { readFileSync } from 'node:fs';
import { fmtCountProse } from './units-prose';

type Point = { date: string; value: number; x: number; y: number };
export type Observation = { short: string; title: string; metric: string; basis: string; period: string; source: string; href: string; action: string; graphic: string; detail: string; series?: Point[]; rainfall?: { actual: number; normal: number; receivedPct: number; shortfallPct: number; normalPeriod: string }; count?: number; columns?: { date: string; month: string; count: number; x: number; y: number; height: number }[]; columnMax?: number };
const month = (value: string) => new Date(`${value.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf8'));

// Each observation can survive a missing, unrelated data snapshot.
export function homeObservations(readData: (name: string) => any = read): Observation[] {
  const items: Observation[] = [];
  try {
    const inflation = readData('economy/inflation-board.json');
    const series = inflation.headline.modern.combined.filter((p: any) => Number.isFinite(p.infl)).slice(-8);
    const latest = series.at(-1);
    if (latest) {
      const lo = Math.min(...series.map((p: any) => p.infl));
      const hi = Math.max(...series.map((p: any) => p.infl));
      const points: Point[] = series.map((p: any, i: number) => ({ date: month(p.date), value: p.infl, x: 10 + i * 240 / Math.max(1, series.length - 1), y: 70 - (p.infl - lo) / (hi - lo || 1) * 55 }));
      items.push({ short: 'Inflation', title: 'India’s inflation rate', metric: `${latest.infl.toFixed(2)}%`, basis: 'Year-on-year · Combined CPI', period: month(latest.date), source: 'MoSPI · CPI, base 2024=100', href: '/economy/explore/inflation#headline', action: 'Explore inflation', graphic: 'line', detail: '', series: points });
    }
  } catch { /* Other observations remain available. */ }
  try {
    // The existing monthly generator sums unrounded daily counts and excludes
    // the current incomplete month. Avoid summing rounded product-view rows.
    const currentMonth = new Date().toISOString().slice(0, 7);
    const rows = readData('economy/reads.json').rows.filter((row: any) => row.key === 'UPI' && row.date.slice(0, 7) < currentMonth).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-12);
    if (rows.length !== 12) throw new Error('Twelve complete UPI months are required.');
    rows.forEach((row: any, i: number) => {
      if (!/^\d{4}-\d{2}-01$/.test(row.date) || !Number.isFinite(row.volume_cr) || row.volume_cr < 0) throw new Error('Invalid monthly UPI count.');
      const expected = new Date(`${rows[0].date}T00:00:00Z`);
      expected.setUTCMonth(expected.getUTCMonth() + i);
      if (expected.toISOString().slice(0, 10) !== row.date) throw new Error('UPI months must be unique and consecutive.');
    });
    const latest = rows.at(-1);
    const count = Math.round(latest.volume_cr * 1e7);
    const columnMax = Math.max(500, Math.ceil(Math.max(...rows.map((row: any) => row.volume_cr)) / 500) * 500) * 1e7;
    const columns = rows.map((row: any, i: number) => {
      const value = Math.round(row.volume_cr * 1e7);
      const height = value / columnMax * 80;
      return { date: month(row.date), month: new Date(`${row.date}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }), count: value, x: 58 + i * (234 / 12) + (234 / 12 - 11) / 2, y: 90 - height, height };
    });
    items.push({ short: 'Payments', title: 'Monthly UPI payments', metric: fmtCountProse(count, false, 'abbr'), count, basis: 'Number of payments during the month', period: month(latest.date), source: 'RBI · Payment-system data', href: '/economy/explore/payments#product', action: 'Explore UPI payments', graphic: 'columns', detail: '', columns, columnMax });
  } catch { /* Other observations remain available. */ }
  try {
    const { actualMm, normalMm, normalPeriod, period, source } = readData('environment/home-monsoon.json');
    if (![actualMm, normalMm].every(value => Number.isFinite(value) && value > 0) || actualMm > normalMm) throw new Error('Invalid national rainfall shortfall.');
    const receivedPct = actualMm / normalMm * 100;
    const shortfallPct = 100 - receivedPct;
    const normalYears = `${normalPeriod.start}–${normalPeriod.end}`;
    items.unshift({ short: 'Monsoon', title: 'India’s monsoon rainfall', metric: `${shortfallPct.toFixed(1)}%`, basis: 'Below normal · All India', period: `June–September ${period.start.slice(0, 4)}`, source: `IMD · ${normalYears} normal`, href: source.url, action: 'IMD seasonal report', graphic: 'rainfall-gap', detail: '', rainfall: { actual: actualMm, normal: normalMm, receivedPct, shortfallPct, normalPeriod: normalYears } });
  } catch { /* Other observations remain available. */ }
  return items;
}
