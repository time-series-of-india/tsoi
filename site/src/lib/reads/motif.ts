// A read's cover is normally a captured chart screenshot (see
// scripts/build-read-thumbs.mjs and public/thumbs/read/) — real art, but it
// only exists once a read has shipped long enough to run that capture. A read
// that is live before its thumbs are, needs a stand-in that is still real
// data rather than an empty box: a thin saffron line drawn from the read's
// own numbers, the same drawing method as Inflation Peaks' terrain
// (lib/lineMotif.ts). Once a read's PNGs are committed, callers should prefer
// those and never reach this.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lineMotif } from '../lineMotif';

const cache = new Map<string, string | null>();

/** The flagship's headline CPI index, month over month — a plainly rising
 *  line, which is the read's own subject. */
function priceOfNearlyEverythingSeries(): number[] | null {
  try {
    const path = resolve(process.cwd(), 'public/data/lab/inflation-read.json');
    const data = JSON.parse(readFileSync(path, 'utf8'));
    const months = data?.gap?.months as { headlineIdx: number }[] | undefined;
    return months?.length ? months.map((m) => m.headlineIdx) : null;
  } catch {
    return null;
  }
}

const SERIES: Record<string, () => number[] | null> = {
  'price-of-nearly-everything': priceOfNearlyEverythingSeries,
};

/** Cover-motif points for a read, or null when the read has no data-driven
 *  stand-in registered (i.e. every read that already carries real thumbs). */
export function readCoverMotif(slug: string): string | null {
  if (cache.has(slug)) return cache.get(slug)!;
  const series = SERIES[slug]?.();
  const points = series && series.length > 1 ? lineMotif(series, { samples: 60 }).points : null;
  cache.set(slug, points);
  return points;
}
