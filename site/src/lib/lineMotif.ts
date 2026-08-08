// Shared routine behind every thin-saffron data-line motif on the site: a
// card's cover art drawn from the real series it represents rather than an
// icon. Inflation Peaks' terrain (site/src/pages/economy/play.astro)
// pioneered this — downsample to a fixed sample count so the line's density
// doesn't quietly change as a series grows, then normalise into a viewBox so
// the shape holds whatever the numbers are. New per-item motifs (the read's
// rising price line, the explore board's headline line, the time machine's
// marked line) all read through this one function so they scale the same way.
export interface LineMotifOptions {
  samples?: number;
  width?: number;
  top?: number;
  bottom?: number;
}

export interface LineMotifResult {
  points: string;
  /** (x, y) of each downsampled point — for callers that place markers on the line. */
  coords: { x: number; y: number }[];
}

export function lineMotif(
  values: number[],
  { samples = 160, width = 100, top = 2, bottom = 28 }: LineMotifOptions = {},
): LineMotifResult {
  const n = Math.min(samples, values.length);
  const pts = Array.from({ length: n }, (_, i) =>
    values[Math.round((i / (n - 1)) * (values.length - 1))]);
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  const coords = pts.map((v, i) => ({
    x: (i / (n - 1)) * width,
    y: bottom - ((v - lo) / span) * (bottom - top),
  }));
  const points = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  return { points, coords };
}
