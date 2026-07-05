// Build-time "data through {month}" freshness stamp for a read, read from the
// generated dataset that the read renders (its `stats.asOf`, or the flagship's
// `throughput.label`). Runs in Astro's SSG server context (node:fs). Anchored
// to cwd (site/) so it survives Astro's bundling — see reading-time.ts.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = new Map<string, string | null>();

export function dataThrough(slug: string): string | null {
  if (cache.has(slug)) return cache.get(slug)!;
  let label: string | null = null;
  try {
    const file = slug === 'upi-architecture'
      ? 'public/data/economy/read-upi-architecture.json'
      : `public/data/economy/reads/${slug}.json`;
    const d = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
    label = d?.stats?.asOf ?? d?.throughput?.label ?? null;
  } catch {
    label = null;
  }
  cache.set(slug, label);
  return label;
}
