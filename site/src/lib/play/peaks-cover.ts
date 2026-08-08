// Where the auto stands on the Inflation Peaks cover art.
//
// The front page and the Play rack draw the same object: the 2020-onward crop
// of the terrain with the game's own auto parked on it. Both used to carry
// their own copy of this search, which is how they drifted apart the first
// time; the placement now lives here and the two pages differ only in the
// stylesheet Astro scopes to each of them.
//
// The auto stands LEVEL on a flat stretch, which is a change from the earlier
// mid-climb pose. A tilted sprite reads as a phone game, and the tilt was
// competing with the terrain for the same signal: on a card this small the
// line's own shape is the drama, and a vehicle leaning across it just looks
// like the chart is falling over. Parked level, the auto says "this is the
// thing you drive" and leaves the reading of the line alone.
import type { LineMotifResult } from '../lineMotif';

/* The cover renders in two different scales at once, and the placement has to
   be solved in the scale the EYE sees, not in viewBox units. The line's box is
   100 units wide stretched over roughly 380 rendered px, and 30 units tall
   pinned to a fixed 58px band, so a slope in viewBox space is nothing like the
   slope on screen. These two factors carry the conversion. */
const X_PX = 3.8; // rendered px per viewBox x unit (typical card width)
const Y_PX = 58 / 30; // rendered px per viewBox y unit (fixed band)

/* The sprite is a 50-unit viewBox drawn 20px wide, so 0.4 rendered px per
   native unit of peaks-engine's drawCar. Everything below is measured from the
   REAR TYRE, because that is the point the markup anchors and rotates about
   (26% / 97.7% of the sprite box). Front tyre is 28 native units ahead of it;
   the body reaches 8 units behind and 35.5 ahead. */
const SPRITE_PX = 20 / 50;
const WHEELBASE = 28 * SPRITE_PX;
const NOSE = 35.5 * SPRITE_PX;
const TAIL = -8 * SPRITE_PX;

/* Where along the crop to look. Both ends are excluded: the auto is 20px wide
   and a window found hard against either edge hangs the sprite off the card.
   The bias is still to the left half, where a run starts. */
const FROM = 0.08;
const TO = 0.62;

export interface CoverAuto {
  /** rear-tyre contact point, in viewBox x units (doubles as a CSS percentage) */
  x: number;
  /** rear-tyre contact point, in viewBox y units */
  y: number;
  /** degrees, from the grade under the two tyres */
  angle: number;
}

export function coverAuto({ coords }: LineMotifResult): CoverAuto {
  // The line as rendered pixels, sampled at any x by walking the segment it
  // falls in. The polyline is drawn straight between samples, so linear
  // interpolation is not an approximation of the curve, it IS the curve.
  const lastX = coords[coords.length - 1].x * X_PX;
  const groundAt = (px: number): number => {
    const t = Math.min(Math.max(px / lastX, 0), 1) * (coords.length - 1);
    const i = Math.min(Math.floor(t), coords.length - 2);
    return (coords[i].y + (coords[i + 1].y - coords[i].y) * (t - i)) * Y_PX;
  };

  // The flattest window: least rise-and-fall of the line under the footprint
  // the auto actually covers. Sampled every 2px rather than per line-sample,
  // so a jag between two samples still counts against a window.
  const lo = Math.round(coords.length * FROM);
  const hi = Math.round(coords.length * TO);
  let at = lo;
  let flattest = Infinity;
  for (let i = lo; i <= hi; i++) {
    const anchor = coords[i].x * X_PX;
    let min = Infinity;
    let max = -Infinity;
    for (let dx = TAIL; dx <= NOSE; dx += 2) {
      const y = groundAt(anchor + dx);
      if (y < min) min = y;
      if (y > max) max = y;
    }
    if (max - min < flattest) {
      flattest = max - min;
      at = i;
    }
  }

  /* Rotation off both tyres rather than off the grade at a single point: a
     vehicle rests on what its wheels touch, and on anything but a straight
     stretch those two answers differ. The rear tyre is planted on the sample
     itself, so it needs no vertical solve of its own — the anchor puts it on
     the line by construction, and on a window this flat the front tyre lands
     within a stroke width of it. */
  const rear = coords[at].x * X_PX;
  const angle =
    (Math.atan2(groundAt(rear + WHEELBASE) - groundAt(rear), WHEELBASE) * 180) / Math.PI;

  return { x: coords[at].x, y: coords[at].y, angle };
}
