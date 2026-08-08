// The cartridge sparkline's geometry, shared because two sides now need it:
// the markup draws the line at build time, and the running game slides a dot
// along that same line. A dot placed by a second, nearly-identical formula
// would sit a pixel off the stroke and look like a bug, so there is one.

export const SPARK_W = 100;
export const SPARK_H = 26;
export const SPARK_N = 56; // samples per card, enough for the shape at 230px wide

/** A value's height in the sparkline's box. */
export const sparkY = (v: number, lo: number, hi: number): number =>
  1 + ((hi - v) / (hi - lo || 1)) * (SPARK_H - 2);

/** The drawn line's own y at any fraction along it, 0 to 1.
 *
 *  Interpolated between the two VERTICES either side rather than read off the
 *  underlying month, because the line is 56 straight segments and those are
 *  two different curves. On a spike between samples the difference is a couple
 *  of pixels, which is the whole height of the dot. */
export function sparkAt(values: number[], lo: number, hi: number, t: number): number {
  const u = Math.min(Math.max(t, 0), 1) * (SPARK_N - 1);
  const i = Math.min(Math.floor(u), SPARK_N - 2);
  const vertex = (k: number) => values[Math.round((k / (SPARK_N - 1)) * (values.length - 1))];
  const a = sparkY(vertex(i), lo, hi);
  const b = sparkY(vertex(i + 1), lo, hi);
  return a + (b - a) * (u - i);
}

/** The whole line as a path, sampled the way sparkAt assumes it is. */
export function sparkPath(values: number[], lo: number, hi: number): string {
  let d = '';
  for (let i = 0; i < SPARK_N; i++) {
    const t = i / (SPARK_N - 1);
    d += `${i ? 'L' : 'M'}${(t * SPARK_W).toFixed(2)} ${sparkAt(values, lo, hi, t).toFixed(2)}`;
  }
  return d;
}
