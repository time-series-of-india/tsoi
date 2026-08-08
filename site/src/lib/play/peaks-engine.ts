/**
 * Inflation Peaks — terrain, vehicle physics and canvas renderer.
 *
 * The terrain IS the series: monthly year-on-year inflation points joined by
 * monotone cubic interpolation (Fritsch–Carlson), so the curve never
 * overshoots a data point and never invents a peak the data does not have.
 * Everything below works in WORLD pixels with y pointing UP; the renderer is
 * the only place that flips into screen space.
 *
 * Two constraints shape the code more than anything else:
 *
 *  1. Determinism. There is no RNG anywhere. The simulation runs on a fixed
 *     120 Hz accumulator and the render interpolates between the last two
 *     states, so the same held/released input produces the same run on any
 *     machine at any frame rate.
 *  2. No allocation in the frame loop. Physics state is scalars, terrain is
 *     Float64Arrays, and every label the renderer draws (gridlines, years,
 *     peaks) is built into a string array once at init. The steady-state
 *     loop should not give the collector anything to do.
 *
 * Colours are read off the computed style of <html> at init and re-read when
 * the theme attribute flips, so both themes work without a second code path.
 */

export interface TerrainPoint {
  ym: string;
  yoy: number;
}

export interface TerrainEra {
  id: string;
  label: string;
  character: string;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  months: number;
  /** Mean absolute year-on-year over the era. A true fact about the era; it
   *  set the weight until Jul 2026 and no longer does. */
  meanAbsYoy: number;
  /** Mean absolute month-on-month change in the rate. This is what the era's
   *  weight is, normalized across the six: how far the ground moves is what
   *  the game is made of, where how high it sits is not. */
  climbPerMonth: number;
  peak: number;
  trough: number;
  weight: number;
}

export interface TerrainAnnotation {
  ym: string;
  label: string;
  /** Two or three words, drawn on the chart under the month it marks. */
  tag: string;
  yoy: number;
  era: string;
  /** The sentence, for the run-over card when a run ends nearby. */
  text: string;
}

export interface TerrainData {
  note: string;
  pxPerMonth: number;
  pxPerPct: number;
  points: TerrainPoint[];
  /** Present on the generated spine, absent on any hand-made slice handed to
   *  the engine directly. The engine reads points and nothing else; the rest
   *  is the page's business. */
  first?: string;
  last?: string;
  eras?: TerrainEra[];
  annotations?: TerrainAnnotation[];
  sources?: string;
  meta?: Record<string, unknown>;
}

export interface RunEnd {
  outcome: 'crash' | 'cleared';
  months: number;
  /** Seconds of driving, from the first press of the throttle to the end.
   *  Counted in physics steps rather than off the wall clock, so it is exact
   *  and the same input gives the same time on any machine at any frame rate.
   *  Only a cleared run does anything with it: on a crash this is a slower way
   *  of saying how far you got. */
  secs: number;
  /** Which fail state ended the run. M1 shows one crash card either way; the
   *  distinction is here because tuning needs it and M2's crash copy wants it. */
  reason: 'flip' | 'body' | 'none';
}

export interface GameMode {
  id: string;
  label: string;
  /** Multiplies the height of every hill. The shape is always the real
   *  series; this is the only thing difficulty is allowed to change about
   *  it. */
  exaggeration: number;
  /** Multiplies top speed, so a harder mode gives less time to read what is
   *  coming. Applied to drive force, not to the terrain. */
  pace: number;
}

export interface GameOptions {
  canvas: HTMLCanvasElement;
  terrain: TerrainData;
  mode?: GameMode;
  /** Fired only when the whole-month count changes, not every frame. */
  onMonths: (months: number) => void;
  onEnd: (end: RunEnd) => void;
}

export interface Game {
  start: () => void;
  setThrottle: (on: boolean) => void;
  refreshTheme: () => void;
  resize: () => void;
  destroy: () => void;
  /** Rolling average frame rate, for the ?fps=1 readout. */
  fps: () => number;
  monthCount: () => number;
  /** Read-only instantaneous state. The tuning harness drives the engine
   *  headlessly and reads this; nothing in the UI uses it. */
  probe: (out: Float64Array) => void;
}

/** Field order for the array passed to Game.probe: x, y, speed, pitch,
 *  airborne (1/0), deepest suspension compression this step. */
export const PROBE_LEN = 6;

/* ── Tuning ──────────────────────────────────────────────────────────────
   Hand-tuned by playtest at Medium (exaggeration 1.0). Three findings worth
   keeping, because each cost a round of retuning to discover:

   1. Gravity is the airtime dial, not speed. A car leaves the ground where
      v² exceeds g·(1+y'²)/|y''|, so at 1500 px/s² nothing on a monthly
      inflation series is sharp enough to launch at the speeds the car can
      reach. 500 makes the whole terrain jumpable and everything else here is
      scaled to it.
   2. Resistance applied at the contact patch pitches the car; resistance
      applied at the centre of mass does not. See the block below.
   3. Suspension travel is the difficulty. The car has ~11px of it, and that
      single number decides which landings are survivable — far more than
      spring rate or damping do. */

const DT = 1 / 120; // fixed physics step
const MAX_FRAME = 0.25; // never simulate more than a quarter-second of catch-up

const GRAVITY = 500; // world px / s²
const MASS = 1;
const BODY_HW = 20; // chassis half-width
const BODY_HH = 7; // chassis half-height
const WHEEL_DX = 16; // wheel anchor, from body centre
/* Small wheels, slung low. Contact depth is terrainH + WHEEL_R - anchorY, so
   it depends only on (WHEEL_R - WHEEL_DY): shrinking the wheel and dropping
   the axle by the same amount leaves ride height, ground clearance and every
   contact force untouched, and only lengthens the pitch arm slightly. Which
   is what lets the rickshaw have auto-sized wheels rather than pram ones. */
const WHEEL_DY = -13;
const WHEEL_R = 8;
/* How far below the chassis box the drawn body skirt hangs. Drawn, never
   simulated: the crash test is still the box at ±BODY_HH, with the tolerance
   at TOUCH_DEPTH. The body has 14px
   of ground clearance it cannot give up, because that clearance IS the
   belly-out fail state, and without a skirt the whole thing reads as a body
   on stilts. */
const SKIRT = 11;
/* Corner radius on the passenger openings. Checked once here rather than per
   frame: roundRect is everywhere the site supports, and a square-cornered
   opening is a fine thing to fall back to if it ever is not. */
const OPENING_R = 3;
const HAS_ROUND_RECT = typeof CanvasRenderingContext2D !== 'undefined'
  && 'roundRect' in CanvasRenderingContext2D.prototype;

/* The headlamp, drawn in dark theme only. Sited low on the front face, under
   the windscreen and above the mudguard, which is where an auto's actually
   is: any higher and it lands on the yellow canopy band, where a warm dot on
   a warm ground is nothing. Small and unringed: at forty-odd pixels a bezel
   around it is two dark pixels that read as a chip in the paintwork. */
const LAMP_DX = 18.5; // lens centre, body-local
const LAMP_DY = -1.5;
const LAMP_R = 1.4;
/* The beam. Struck from just outside the lens and aimed forward and down, the
   way a headlamp is actually aimed.

   26° of half-angle rather than the 33 that was also on the table: the area a
   cone covers goes with reach² × angle, so taking the reach past 46 already
   adds about 60%, and widening on top of that stops reading as a beam and
   starts reading as haze over the chart.

   The tilt is not a free number. It is set so the cone's TOP edge, which sits
   at (tilt − half), comes out exactly horizontal, which makes the tilt equal
   to the half-angle. It is written as that equality rather than as its value
   in degrees, so the two cannot drift apart if the width is ever retuned.

   The lens is 22.4px above the tyre contact (the wheel centre at 13 plus its
   8 radius, less the lens' own −1.4), which places the rest: on level ground
   the axis meets the road about 46px out and the bottom edge about 18px out,
   while the top edge runs level and never lands at all. So the near field is
   bright light on the road and the far field is faint haze hanging ahead of
   the vehicle, which is the split the falloff below is shaped around. */
const BEAM_X = 19.6; // apex, body-local — just proud of the lens
const BEAM_Y = -1.4;
const BEAM_HALF = (26 * Math.PI) / 180;
const BEAM_TILT = BEAM_HALF; // top edge horizontal, by construction
const BEAM_REACH = 66;
/* Rays across the cone, and the coarse march each one walks before bisecting
   onto the surface it hit. 20 × (22 + 5) is about 550 terrain lookups a frame,
   which heightAt absorbs without trouble; a fine march fine enough to avoid
   the bisection would cost several times that for the same answer. */
const BEAM_RAYS = 20;
const BEAM_STEPS = 22;
const BEAM_BISECT = 5;
/* Flicker cells per crash beat. Twenty-six over 0.9s is about 29 a second,
   fast enough to read as a fault rather than as a blinker. */
const LAMP_STUTTER = 26;

/* Where the rear wheel is DRAWN, which is not where it acts. The spring still
   works at ±WHEEL_DX; this only decides where the tyre is painted, and it is
   set so the back of the tyre lines up exactly with the back of the body
   (-20 + WHEEL_R) instead of hanging 4px out behind it. The alternative was
   stretching the body back to meet the tyre, which would have put the drawn
   rear corner well below and behind the corner the crash test uses, and on a
   steep climb the wreck would touch several pixels before the run ended. A
   4px difference between where a rigidly-drawn wheel sits and where its
   spring pulls costs about 1.5px of apparent float on a 20 degree slope. */
const REAR_WHEEL_DRAW_X = -20 + WHEEL_R;
const INERTIA = (MASS * ((2 * BODY_HW) ** 2 + (2 * BODY_HH) ** 2)) / 12;

/* Contact points on the shell, in body-local coordinates (y up, as physics
   has it, so the roof is positive).
   The first HULL_N are the body box: four corners plus the two mid-points of
   the bottom edge, which is what catches a high-centre on a sharp crest.
   These, and only these, decide that a run is over.
   The rest are the canopy: the rear pillar's top corner and the two ends of
   the roof edge. They exist because the box stops at BODY_HH and the canopy
   is drawn 13px above that, so a wreck resting on its roof had nothing to
   rest on and sank into the hill. Nothing upright can reach them, and the
   run-over test ignores them, so they change only what a crash looks like. */
const HULL_X = new Float64Array([
  -BODY_HW, -BODY_HW, BODY_HW, BODY_HW, -BODY_HW / 3, BODY_HW / 3,
  -20, -11, 12.5,
]);
const HULL_Y = new Float64Array([
  -BODY_HH, BODY_HH, -BODY_HH, BODY_HH, -BODY_HH, -BODY_HH,
  11, 20, 18.5,
]);
const HULL_N = 6; // body box: the run-over test
const SHELL_N = HULL_X.length; // box plus canopy: the wreck's collision

/* Traction acts at the contact patch, which is below the centre of mass, and
   that lever is what makes a vehicle wheelie under power. It is also, purely
   by accident, a function of wheel size: shrinking the wheels to make the
   rickshaw look right lengthened the lever 24% and the thing started
   backflipping up the steeper climbs. This factor pins the traction lever to
   where it was, so how much the rickshaw wheelies stays a tuning decision
   rather than a side effect of how big the wheels are drawn. Normal force
   still acts at the real contact point; only traction is pinned. */
const TRACTION_ARM = 10.5 / 13;

const SPRING = 88; // suspension stiffness, force per px of compression
/* Deliberately under-damped (about half critical). Damping force scales with
   impact speed, so a critically damped car absorbs any landing at all and
   nothing off a jump can ever go wrong; at this rate a hard landing runs the
   suspension out of travel and puts the chassis on the ground, which is the
   fail state the spec asks for. */
const SPRING_DAMP = 6.5;
const BUMP_STOP = 300; // extra rate past MAX_TRAVEL — the wheel running out of travel
const MAX_TRAVEL = 7;
const GRIP = 1.25; // tangential force ceiling as a multiple of normal force
const DRIVE = 620; // full-throttle tractive force
/* Resistance is split deliberately. The contact-patch terms are kept small,
   because a force applied at the contact patch is 20px below the centre of
   mass and therefore pitches the car: a big one reads as slamming the brakes
   and buries the nose on the first downslope. Top speed is set instead by
   quadratic drag applied at the centre of mass, which cannot pitch anything.
   sqrt(DRIVE / DRAG) is the flat-ground top speed, ~420 px/s ≈ 7.5 months/s. */
const ROLL = 0.5; // rolling resistance, at the contact
const BRAKE = 1.5; // extra engine braking on release, at the contact
const DRAG = 0.0035; // quadratic, at the centre of mass

/* Airborne attitude. The spec asks for "air rotation follows terrain-relative
   pitch": holding the throttle pitches the nose up (drive-torque reaction, the
   one air control a single-input game can have), and a weak alignment term
   rotates the car toward the slope it is falling onto so a clean landing is
   reachable rather than lucky. */
const AIR_TORQUE_UP = 1100;
const AIR_TORQUE_DOWN = 200;
const AIR_ALIGN = 45;
const AIR_ALIGN_DAMP = 30;
const AIR_SPIN_DAMP = 0.6;
const MAX_SPIN = 8; // rad / s

const FLIP_LIMIT = 1.95; // rad from level (~112°) — past this the run is over

/* The tolerance on the belly-out test, measured rather than picked. Across 48
   runs over all six stretches there were 19 episodes of the underside inside
   the hill, and they fall into two groups with a gap between them. Seven
   never went deeper than 2.23px and were out again within 0.075s — most of
   them an upright rickshaw whose suspension had bottomed out on a landing
   (11 to 12px of wheel compression) and pushed itself straight back off the
   ground. Nothing a player would read as a crash, and every one of them
   ended the run. Every episode that went deeper than that reached at least
   3.08px. 2.5px sits in the gap.
   The grace period is for the other shape, which the depth test alone would
   never end: a belly riding the hill at a pixel and a half indefinitely. At
   0.15s that is around 35px of scraping, most of a month. */
const TOUCH_DEPTH = 2.5; // px into the hill before the run is over
const TOUCH_GRACE = 0.15; // seconds of unbroken contact that ends it anyway

/* A crash is worth watching. The run is decided the moment the chassis is in
   the hill past tolerance, but the card waits while the rickshaw actually
   falls over, which is both more legible (you see WHAT went wrong) and better company than a
   dialog appearing over a still frame. During this beat the throttle is dead,
   the score is frozen, and the chassis gets the collision response it does not
   normally need, so the wreck settles on the ground instead of sinking
   through it. */
const DEATH_TIME = 0.9; // seconds
const CHASSIS_SPRING = 420;
const CHASSIS_DAMP = 14;
const CHASSIS_FRICTION = 1.15;
/* The trip. Left to itself the wreck simply levelled out and rolled to a
   stop, which on screen is indistinguishable from the game freezing. What
   actually happens when a vehicle's belly catches the ground at speed is that
   the contact point stops and the mass keeps going, so forward momentum turns
   into rotation and it pitches over its own nose. That is one impulse at the
   moment of the crash, scaled by how fast it was travelling: a slow scrape
   flops, a fast one cartwheels. */
const TRIP_SPIN = 4.5; // rad/s at TRIP_REF speed
const TRIP_REF = 300; // px/s
const TRIP_SCRUB = 0.55; // forward speed kept when the belly digs in
const TRIP_DECAY = 1.5; // per second — the tumble bleeds off so it settles

const CAM_LEAD = 0.34; // car sits this far across the viewport
const CAM_TAU = 0.22; // vertical camera smoothing time constant, seconds
const CAM_GROUND_PAD = 18; // world px of chart kept below the lowest ground
/* And the other end of the same idea: the share of the chart left empty above
   the highest ground in the terrain. Without a ceiling the camera frames every
   stretch by its floor, so an era whose whole range is shorter than the chart
   is drawn along the bottom edge with two thirds of the box empty above it —
   which is exactly what the 2020s looked like. The car keeps its own guard
   below, so a jump still raises the camera past this. */
const CAM_SKY = 0.32;
const CAM_CAR_TOP = 72; // world px of chart the car is never allowed above
const AXIS_H = 26; // bottom axis strip, css px
const SAMPLE_STEP = 6; // terrain sampling interval when drawing, css px
/* Gridline steps, smallest first. Which one a chart uses depends on how tall
   the series is drawn, not on a constant: at the shared scale a five-point
   step gave four lines on the seventies and none worth having on the 2020s,
   and per-era scaling widens that spread rather than closing it. */
const GRID_STEPS = [1, 2, 5, 10, 20];
const GRID_MAX_LINES = 6;

/* ── Vertical scale ──────────────────────────────────────────────────────
   Every era used to be drawn at the one scale the generator ships, which is
   the right choice for the rack — six sparklines you compare with your eye —
   and the wrong one inside the machine, where you only ever see one era at a
   time and the 2020s occupied the bottom sixth of the box.

   So the machine fits the scale to what is loaded: enough px per percentage
   point that the era's own range fills FIT_BAND of the chart. Two limits keep
   that from becoming a different game per cartridge.

   Nothing is ever drawn flatter than the shared scale, so no era is made
   easier than it was. And nothing is lifted more than FIT_MAX_LIFT, because
   vertical scale is slope and lifting a calm era far enough would make it the
   wildest terrain in the rack.

   Two measurements set that cap, and they do not agree, which is the whole
   reason it is 1.4 and not the 2.5 that would put every era in the 45-85% of
   the chart the spec asked for.

   Ordering holds a long way up: rank the six by 90th-percentile month-on-month
   slope, or by steepest sustained four-month climb, and at any lift to 2.0
   they come out in exactly the order they do at the shared scale — seventies
   hardest, 2000s calmest. At 2.2 the eighties overtake the seventies and it
   is gone.

   Absolute difficulty does not hold nearly that far. Driving all six headless
   on Medium under four fixed throttle plans, the mean share of an era survived
   falls off a cliff between 1.2 and 1.4: the nineties go 71% to 22%, the 2010s
   61% to 14%, the eighties 32% to 10%. Fixed plans are not players and they
   cliff harder than a person would, but the direction is not in doubt, and the
   spec's own hard constraint is difficulty rather than framing. So the cap
   sits at the near edge of that cliff. The calm eras reach 25-50% of the chart
   rather than 45-85%, and most of what fixed the empty-looking chart is the
   camera ceiling above, not this. */
const FIT_BAND = 0.7;
const FIT_MAX_LIFT = 1.4;
/* Module-level so the render loop allocates nothing. setLineDash copies what
   it is given, so handing it the same two arrays every frame is safe. */
const YEAR_DASH = [2, 4];
const NO_DASH: number[] = [];

export const MODES: GameMode[] = [
  /* Two dials, and the spec is firm that neither may touch the shape: the
     terrain is always the real series, exaggeration only scales it and pace
     only changes how fast you meet it.

     Exaggeration is the honest difficulty knob — a 34.7% month is a wall
     whatever you multiply it by, but at 0.6 the approach is a ramp and at
     1.4 it is a cliff. Pace is the second, quieter one: it buys or spends
     reaction time without changing a single height. Easy is slower as well
     as flatter because the two compound in the direction a beginner needs,
     and Hard is faster as well as steeper for the same reason. */
  { id: 'easy', label: 'Easy', exaggeration: 0.6, pace: 0.85 },
  { id: 'medium', label: 'Medium', exaggeration: 1.0, pace: 1.0 },
  { id: 'hard', label: 'Hard', exaggeration: 1.4, pace: 1.15 },
];

export function createGame(opts: GameOptions): Game {
  const { canvas, terrain, onMonths, onEnd } = opts;
  const mode = opts.mode ?? MODES[1];
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const PX_MONTH = terrain.pxPerMonth;
  /* Top speed goes as sqrt(DRIVE / DRAG), so squaring the pace multiplier
     here makes the flat-ground top speed scale by the pace itself. Drag is
     left alone: it acts at the centre of mass and is what keeps resistance
     from pitching the car. */
  const DRIVE_MODE = DRIVE * mode.pace * mode.pace;
  const pts = terrain.points;
  const N = pts.length;
  // N points bound N-1 months of driving; that span is the run's full score.
  const TOTAL_MONTHS = N - 1;
  const END_X = TOTAL_MONTHS * PX_MONTH;

  /* ── Canvas sizing ─────────────────────────────────────────────────────
     Measured here rather than further down because the vertical scale below
     is fitted to the chart, and everything after it — terrain heights, grid
     step, peak anchors — is built from that scale. */

  let cssW = 1;
  let cssH = 1;
  let dpr = 1;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, Math.round(rect.width));
    cssH = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
  }
  resize();

  function chartH(): number {
    return cssH - AXIS_H;
  }

  let loPct = pts[0].yoy;
  let hiPct = loPct;
  for (let i = 1; i < N; i++) {
    const v = pts[i].yoy;
    if (v < loPct) loPct = v;
    if (v > hiPct) hiPct = v;
  }

  /* The fit, per the block at the top of the file. It is decided once, from
     the chart as it is on arrival: a browser resized across a CSS breakpoint
     afterwards keeps the scale it was built with, which is a stale framing
     rather than a wrong one, and rebuilding the terrain under a player
     mid-run would be worse. Loading any cartridge builds a new game. */
  const PX_PCT = (() => {
    const base = terrain.pxPerPct;
    const range = hiPct - loPct;
    if (range <= 0) return base * mode.exaggeration;
    const want = (FIT_BAND * chartH()) / range;
    const fit = want < base ? base : Math.min(want, base * FIT_MAX_LIFT);
    return fit * mode.exaggeration;
  })();

  /* ── Terrain: monotone cubic over the monthly points ─────────────────── */

  const hs = new Float64Array(N); // world height per month index
  const tg = new Float64Array(N); // tangent, world px per month
  for (let i = 0; i < N; i++) hs[i] = pts[i].yoy * PX_PCT;

  /* The lowest and highest ground in this terrain. Monotone interpolation can
     neither undershoot nor overshoot a data point, so the curve's extremes are
     the extremes of the months. Both exist for the camera, which frames the
     chart between them: terrain height is signed, and deflation is below the
     zero line. */
  const TERRAIN_MIN = Math.min(0, loPct * PX_PCT);
  const TERRAIN_MAX = hiPct * PX_PCT;
  const CAM_FLOOR = TERRAIN_MIN - CAM_GROUND_PAD;

  {
    // Fritsch–Carlson: secants, then clamp each tangent into the circle of
    // radius 3 around the neighbouring secants. That clamp is the whole
    // reason for using this and not Catmull-Rom — it is what guarantees no
    // overshoot between two months, i.e. no peak that isn't in the data.
    const d = new Float64Array(N - 1);
    for (let i = 0; i < N - 1; i++) d[i] = hs[i + 1] - hs[i];
    tg[0] = d[0];
    tg[N - 1] = d[N - 2];
    for (let i = 1; i < N - 1; i++) {
      // A month that is a local max or min gets a flat tangent. Without this
      // the averaged tangent points against the secant and the curve humps
      // above the peak month — a peak the series does not contain.
      tg[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    }
    for (let i = 0; i < N - 1; i++) {
      if (d[i] === 0) {
        tg[i] = 0;
        tg[i + 1] = 0;
        continue;
      }
      const a = tg[i] / d[i];
      const b = tg[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tg[i] = t * a * d[i];
        tg[i + 1] = t * b * d[i];
      }
    }
  }

  // sample() writes here instead of returning a pair — the physics calls it
  // twice per wheel per step and this loop must not allocate.
  let sampleH = 0;
  let sampleS = 0;

  function sample(worldX: number): void {
    let x = worldX / PX_MONTH;
    if (x <= 0) {
      sampleH = hs[0];
      sampleS = 0;
      return;
    }
    if (x >= N - 1) {
      sampleH = hs[N - 1];
      sampleS = 0;
      return;
    }
    const i = x | 0;
    const t = x - i;
    const h0 = hs[i];
    const h1 = hs[i + 1];
    const m0 = tg[i];
    const m1 = tg[i + 1];
    const t2 = t * t;
    const t3 = t2 * t;
    sampleH =
      (2 * t3 - 3 * t2 + 1) * h0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * h1 + (t3 - t2) * m1;
    // d/dt of the same basis, then per world px rather than per month
    const dh =
      (6 * t2 - 6 * t) * h0 + (3 * t2 - 4 * t + 1) * m0 + (-6 * t2 + 6 * t) * h1 + (3 * t2 - 2 * t) * m1;
    sampleS = dh / PX_MONTH;
  }

  function heightAt(worldX: number): number {
    sample(worldX);
    return sampleH;
  }

  /* ── Static chart furniture, built once ──────────────────────────────── */

  /* The step that gives the chart at most GRID_MAX_LINES rules at whatever
     scale it ended up drawn at. The labels stay true percentages either way:
     scaling the axis is not the same as relabelling it. */
  let gridPct = GRID_STEPS[GRID_STEPS.length - 1];
  for (const s of GRID_STEPS) {
    if (chartH() / (s * PX_PCT) <= GRID_MAX_LINES) {
      gridPct = s;
      break;
    }
  }

  /* Rules for every step the camera can reach, a chart's height beyond the
     terrain at each end so a jump or a deep trough never drives off the last
     one. Built here, in the pass that allocates, so the render loop only
     indexes. Deflation gets its lines too — the seventies spend fifteen months
     below zero and used to drive across a blank. */
  const gridStep = gridPct * PX_PCT;
  const gFrom = Math.floor((TERRAIN_MIN - chartH()) / gridStep);
  const gTo = Math.ceil((TERRAIN_MAX + chartH()) / gridStep);
  const gridY: number[] = [];
  const gridLabels: string[] = [];
  for (let g = gFrom; g <= gTo; g++) {
    gridY.push(g * gridStep);
    gridLabels.push(`${g * gridPct}%`);
  }
  const gridCount = gridY.length;

  /* Year rules fall on real January boundaries, not every twelfth month from
     the start: an era beginning in August would otherwise draw its lines in
     August and label them with the wrong year. Each entry is a month index
     and the year that begins there. */
  const yearAt: number[] = [];
  const yearLabels: string[] = [];
  for (let i = 0; i < N; i++) {
    const [y, m] = pts[i].ym.split('-');
    if (m === '01' || i === 0) {
      // The first month of a mid-year era gets a rule but no label — the year
      // it belongs to started before the terrain did, so naming it there
      // would put the label a few months to the right of where it belongs.
      yearAt.push(i);
      yearLabels.push(m === '01' ? y : '');
    }
  }
  const yearCount = yearAt.length;

  // Notable peaks: a local maximum that clears the threshold and stands
  // clear of both neighbours. Each is labelled with the value of that month
  // and with the month itself, on a second line.
  const MONTH_NAMES = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

  function monthLabel(i: number): string {
    const [y, m] = pts[i].ym.split('-');
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  }

  /* What counts as notable is relative to the terrain you are on. A fixed
     8% cutoff labelled the right handful of peaks on a series that spends
     the seventies in double digits and would label nothing at all in the
     targeting era, where 6% is the local drama. The 75th percentile of the
     era's own months puts a handful of labels on every era, whatever its
     altitude, and 4 percentage points below the era's peak keeps the
     tallest hills labelled even where the distribution is flat. */
  const sorted = Float64Array.from(pts, (p) => p.yoy).sort();
  const q75 = sorted[Math.floor(sorted.length * 0.75)];
  const eraPeak = sorted[sorted.length - 1];
  const PEAK_FLOOR = Math.min(q75, eraPeak - 4);

  const peakX: number[] = [];
  const peakY: number[] = [];
  /* The month itself, rather than wherever its text had to be nudged to.
     Whether a label has been driven past is a fact about the month; where the
     caption sits is a layout accident, and the first month of a stretch has
     its caption pushed 72px right to clear the axis. */
  const markX: number[] = [];
  const peakLabel: string[] = [];
  const peakWhen: string[] = [];
  const peakTag: string[] = []; // '' unless the month is a flagged one
  const labelled = new Set<number>();

  /* Two labels closer than this collide: a label is roughly 70px wide and a
     month is PX_MONTH across, so three months is the first gap that clears
     even the three-line ones. Flagged months ignore it and go down first;
     ordinary peaks yield to whatever is already there. Without this, August
     1991 (flagged, not a local maximum) and September 1991 (a local maximum,
     0.4 points higher) both labelled and printed over each other. */
  const MIN_LABEL_GAP = 3;

  /* A label is centred on its month, so a label on the first month of a
     stretch is half off the left edge and prints across the percentage
     figures on the axis. The 2010s open on their own maximum — January 2010,
     the food-price surge — so this is not a rare corner. The anchor moves
     right until it clears the axis column, and only the anchor: the month it
     names and the figure it prints are the ones it always was, and it sits on
     the same opening rise. Far enough in that nothing is clipped, near enough
     that it is obviously about the hill you are standing on. */
  const LABEL_EDGE = 72;

  function addLabel(i: number, tag: string): void {
    if (!tag) {
      for (let k = i - MIN_LABEL_GAP; k <= i + MIN_LABEL_GAP; k++) {
        if (labelled.has(k)) return;
      }
    } else if (labelled.has(i)) {
      return;
    }
    labelled.add(i);
    const ax = i * PX_MONTH;
    markX.push(ax);
    peakX.push(ax < LABEL_EDGE ? LABEL_EDGE : ax);
    // Whichever of the two is lower keeps the text under the line at both
    // ends of the shift, rather than floating over the fill on a falling one.
    peakY.push(ax < LABEL_EDGE ? Math.min(hs[i], heightAt(LABEL_EDGE)) : hs[i]);
    peakLabel.push(`${pts[i].yoy.toFixed(1)}%`);
    peakWhen.push(monthLabel(i));
    peakTag.push(tag);
  }

  /* Flagged months first, so they own their label and a nearby local maximum
     cannot take the slot instead. These are the ten hand-written annotations
     the generator ships, and this is where the chart stops being a curve and
     starts being history: driving past a wall that says "Failed monsoon" is
     the whole idea of the game stated in two words.

     Only months inside this era appear, so no stretch carries more than three
     of them, which is the reason a third line of text under a peak is
     affordable at all. A trough gets one too — May 1976 is the deepest fall
     in the series and deserves naming as much as any summit does. */
  const tagOf = new Map<string, string>();
  for (const a of terrain.annotations ?? []) if (a.tag) tagOf.set(a.ym, a.tag);
  for (let i = 0; i < N; i++) {
    const tag = tagOf.get(pts[i].ym);
    if (tag) addLabel(i, tag);
  }

  for (let i = 1; i < N - 1; i++) {
    const v = pts[i].yoy;
    if (v < PEAK_FLOOR) continue;
    if (v <= pts[i - 1].yoy || v < pts[i + 1].yoy + 0.3) continue;
    addLabel(i, '');
  }

  /* ── When a label is readable ────────────────────────────────────────────
     Every one of these used to be printed the moment the page loaded, so a
     stretch nobody had driven yet arrived with its whole history already
     written across it: three lines of type under each of half a dozen hills,
     read all at once, none of it about anything you were doing.

     So the resting chart shows shape and the run tells you what the shape
     was. Until the car is within reach of a month, that month carries a tick
     on the curve and nothing else; the figures, the date and the event open as
     you come up on it, and stay open once they have. A retry, or another
     cartridge, closes them again — the terrain is new to you each time.

     The distance is generous on purpose. At a month and a half of viewport,
     a label at Medium pace is legible for around three seconds before the car
     reaches the hill it names, which is the point of putting it there. */
  const REVEAL_WIDTHS = 1.5;
  const revealed = new Uint8Array(peakX.length);

  /* ── Theme ───────────────────────────────────────────────────────────── */

  const col = {
    bg: '#fff',
    ink: '#000',
    fill: '#eee',
    grid: '#ddd',
    axis: '#666',
    // the series wears the site's saffron, the auto wears a CNG livery
    series: '#c50',
    carBody: '#2E7D3B',
    carRoof: '#ECA400',
    /* The headlamp. Empty means unlit, and it is empty in light theme, which
       is the whole switch: a lit lamp on a white chart is a smudge, and a
       glow needs a dark ground to be light rather than stain. */
    lamp: '',
    // the rate figure on a revealed peak, split out from the rest of the axis
    // so a palette can lift it without touching the percentage side
    rate: '#666',
  };
  let fontMono = 'ui-monospace, monospace';
  let labelFont = '';
  let peakFont = '';
  /* The glow, baked once and reused. It lives in the car's own local frame,
     which never moves relative to the car, so unlike every other gradient a
     scrolling chart might want this one is genuinely constant and does not
     have to be rebuilt per frame. Nulled on a theme change, since its stops
     carry the lamp colour. */
  let lampGrad: CanvasGradient | null = null;
  /* The lens' own gradient. Unlike the beam's this one is baked in the car's
     local frame and needs no translating, because the lens never moves
     relative to the bodywork. */
  let lensGrad: CanvasGradient | null = null;

  function refreshTheme(): void {
    /* Read off the canvas, not the root. Custom properties inherit, so every
       --tsoi-* token still resolves; what this buys is that the page can also
       hand the engine a value scoped to the component. The gridlines need
       that: one token drawn on two grounds lands at about twice the contrast
       step in light as in dark, and the per-theme choice belongs in CSS with
       the rest of the theme branching, not in here. */
    const cs = getComputedStyle(canvas);
    const read = (name: string, fallback: string) => {
      const v = cs.getPropertyValue(name).trim();
      return v || fallback;
    };
    col.bg = read('--tsoi-color-background', col.bg);
    col.ink = read('--tsoi-color-on-surface', col.ink);
    col.fill = read('--peaks-fill', read('--tsoi-color-surface-dim', col.fill));
    col.grid = read('--peaks-grid', read('--tsoi-color-outline-variant', col.grid));
    col.axis = read('--tsoi-color-on-surface-variant', col.axis);
    /* The series is saffron and the auto is not. The terrain is the data, and
       data on this site is drawn in the site's colour; the auto is the player,
       and it wears the green-and-yellow livery an Indian reader can name at a
       glance. The livery values come from the component so the covers and the
       canvas read from one definition; the fallback chain only matters if the
       canvas is ever mounted outside that scope. */
    col.series = read('--tsoi-color-primary', col.series);
    col.carBody = read('--peaks-car-body', col.series);
    col.carRoof = read('--peaks-car-roof', col.carBody);
    /* No fallback, deliberately: every other colour here degrades to a usable
       default if its token is missing, because a chart with one colour wrong
       is still a chart. The lamp degrades to absent instead. */
    col.lamp = read('--peaks-headlamp', '');
    // both gradients are baked from col.lamp, so a theme flip voids them
    lampGrad = null;
    lensGrad = null;
    /* The one saffron thing inside the chart area: the rate a revealed peak
       reached. It is the number the terrain is made of, so it takes the
       series' colour; the month under it is ink, because a date is not data.
       --primary-text, not --primary, per the house rule that saffron used as
       text takes the darker of the pair. */
    col.rate = read('--tsoi-color-primary-text', col.axis);

    fontMono = read('--tsoi-font-mono', fontMono);
    labelFont = `400 10px ${fontMono}`;
    peakFont = `500 11px ${fontMono}`;
  }

  /** A CSS colour as "r,g,b", by round-tripping it through fillStyle, which
   *  normalises anything the browser accepts to #rrggbb. */
  function rgbOf(colour: string, fallback: string): string {
    const prev = ctx.fillStyle;
    ctx.fillStyle = colour;
    const hex = /^#([0-9a-f]{6})$/i.exec(String(ctx.fillStyle));
    ctx.fillStyle = prev;
    if (!hex) return fallback;
    return `${parseInt(hex[1].slice(0, 2), 16)},${parseInt(hex[1].slice(2, 4), 16)},${parseInt(hex[1].slice(4, 6), 16)}`;
  }

  /** The beam's falloff, or null when the theme has no lamp. */
  function lampGradient(): CanvasGradient | null {
    if (lampGrad) return lampGrad;
    if (!col.lamp) return null;
    /* Two colours, not one. The beam is the lens' own pale cream where it is
       strong and shifts to the auto's canopy amber as it thins, which is what
       light does and, more practically, the only way it reads as light at all:
       a single amber stop added to the slate ground lands on olive at every
       alpha in the middle of its range, and every earlier attempt at this
       looked like brown fog for exactly that reason.

       Two separate things about the ramp, and they pull opposite ways. The
       root is held down because a hot core reads as a flare sitting on the
       bodywork rather than as the root of a beam, and it swallows the lens.
       But the decay starts early and runs long: most of the cone's LENGTH is
       faint, and only the first eighth or so is at strength. A beam that stays
       solid for half its reach and then stops has a shape you can see the end
       of, which is the thing that reads as a painted wedge instead of light.

       What cannot be economised is the tail's colour. Spending brightness is
       what separates light from haze; spending saturation only makes it
       browner, which is how every earlier version of this ended up as fog.

       Baked at the origin rather than at the lamp, because the lamp moves
       every frame and a gradient rebuilt per frame is an allocation per frame.
       The caller translates instead. A stop of `transparent` would be shorter
       than the explicit zero-alpha one, but it interpolates through transparent
       BLACK and puts a dirty ring around the edge. */
    const core = rgbOf(col.lamp, '255,231,163');
    const tail = rgbOf(col.carRoof, '242,177,23');
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, BEAM_REACH);
    g.addColorStop(0, `rgba(${core},0.48)`);
    g.addColorStop(0.12, `rgba(${core},0.34)`);
    g.addColorStop(0.35, `rgba(${tail},0.15)`);
    g.addColorStop(0.68, `rgba(${tail},0.055)`);
    g.addColorStop(1, `rgba(${tail},0)`);
    lampGrad = g;
    return g;
  }

  /** The lens' fill: a hotspot set off toward the front of the glass, falling
   *  to the auto's amber at the rim.
   *
   *  Three pixels across at 1×, so this is nearly homeopathic, but a flat disc
   *  of one colour is the one part of the drawing that reads as a sticker
   *  rather than as a part. Offsetting the hot point rather than centring it
   *  is what does the work: a centred highlight on a circle says sphere, an
   *  offset one says a lens with something lit behind it. The two colours are
   *  the same pair the beam uses, cream into amber, so the lamp and what it
   *  throws are made of the same thing. */
  function lensGradient(): CanvasGradient | null {
    if (lensGrad) return lensGrad;
    if (!col.lamp) return null;
    const g = ctx.createRadialGradient(
      LAMP_DX + LAMP_R * 0.3, LAMP_DY - LAMP_R * 0.22, LAMP_R * 0.15,
      LAMP_DX, LAMP_DY, LAMP_R,
    );
    g.addColorStop(0, col.lamp);
    g.addColorStop(0.45, col.lamp);
    g.addColorStop(1, col.carRoof);
    lensGrad = g;
    return g;
  }

  refreshTheme();

  /* ── Vehicle state ───────────────────────────────────────────────────── */

  let px = 0;
  let py = 0;
  let vx = 0;
  let vy = 0;
  let ang = 0;
  let spin = 0; // angular velocity
  let wheelSpin = 0; // visual only

  let prevPx = 0;
  let prevPy = 0;
  let prevAng = 0;

  let stepPen = 0; // deepest wheel compression in the current step, for tuning
  let touching = 0; // seconds the underside has been in the hill, unbroken
  let elapsed = 0; // seconds driven, from the first press of the throttle
  let throttle = false;
  let dying = 0; // seconds left of the crash beat; 0 when not crashing
  let lampOut = false; // the lamp has been knocked out and stays out till reset
  let pendingOutcome: RunEnd['outcome'] = 'crash';
  let pendingReason: RunEnd['reason'] = 'none';
  let running = false;
  let ended = false;
  let maxX = 0;
  let months = 0;
  let grounded = false;

  function reset(): void {
    const startX = PX_MONTH * 0.6;
    sample(startX);
    px = startX;
    py = sampleH + WHEEL_R - WHEEL_DY - GRAVITY * MASS / (2 * SPRING); // static sag
    vx = 0;
    vy = 0;
    ang = Math.atan(sampleS);
    spin = 0;
    wheelSpin = 0;
    prevPx = px;
    prevPy = py;
    prevAng = ang;
    maxX = startX;
    months = 0;
    elapsed = 0;
    touching = 0;
    revealed.fill(0);
    grounded = true;
    ended = false;
    dying = 0;
    lampOut = false;
    camY = py - 0.34 * chartH();
    camReady = false;
  }

  /* ── One physics step ────────────────────────────────────────────────── */

  function step(): void {
    prevPx = px;
    prevPy = py;
    prevAng = ang;

    /* The clock starts at the first press and does not stop for coasting: a
       run is over when the throttle is first held, not when the page loads,
       so time spent looking at the start line is not time on the terrain.
       The crash beat is not driving either, and does not count. */
    if (dying === 0 && (throttle || elapsed > 0)) elapsed += DT;

    const c = Math.cos(ang);
    const s = Math.sin(ang);

    let fx = 0;
    let fy = -GRAVITY * MASS;
    // Aero drag at the centre of mass: sets top speed without pitching the car.
    fx -= DRAG * vx * (vx < 0 ? -vx : vx);
    let torque = 0;
    grounded = false;
    stepPen = 0;

    // Two wheel contacts. Each is a spring-damper along the terrain normal
    // plus a tangential force capped by grip, applied at the anchor so it
    // pitches the body the way a real contact patch does.
    for (let w = 0; w < 2; w++) {
      const lx = w === 0 ? -WHEEL_DX : WHEEL_DX;
      const ax = px + lx * c - WHEEL_DY * s;
      const ay = py + lx * s + WHEEL_DY * c;

      sample(ax);
      const pen = sampleH + WHEEL_R - ay;
      if (pen <= 0) continue;
      grounded = true;

      const sl = sampleS;
      const inv = 1 / Math.sqrt(1 + sl * sl);
      const nx = -sl * inv;
      const ny = inv;
      const tx = inv;
      const ty = sl * inv;

      // velocity of the body at the anchor
      const rx = ax - px;
      const ry = ay - py;
      const vax = vx - spin * ry;
      const vay = vy + spin * rx;
      const vn = vax * nx + vay * ny;
      const vt = vax * tx + vay * ty;

      if (pen > stepPen) stepPen = pen;
      let fn = SPRING * pen - SPRING_DAMP * vn;
      if (pen > MAX_TRAVEL) fn += BUMP_STOP * (pen - MAX_TRAVEL);
      if (fn < 0) fn = 0;

      const driving = throttle && dying === 0;
      let ft = driving ? DRIVE_MODE * 0.5 : 0;
      ft -= (driving ? ROLL : ROLL + BRAKE) * 0.5 * vt;
      const cap = GRIP * fn;
      if (ft > cap) ft = cap;
      else if (ft < -cap) ft = -cap;

      const nfx = fn * nx;
      const nfy = fn * ny;
      const tfx = ft * tx;
      const tfy = ft * ty;
      fx += nfx + tfx;
      fy += nfy + tfy;
      torque += rx * nfy - ry * nfx;
      torque += rx * tfy - ry * TRACTION_ARM * tfx;
    }

    if (!grounded) {
      // Drive-torque reaction on hold, gravity-ish settle on release, and a
      // weak pull toward the pitch of the ground below.
      torque += throttle && dying === 0 ? AIR_TORQUE_UP : -AIR_TORQUE_DOWN;
      sample(px);
      const want = Math.atan(sampleS);
      torque += AIR_ALIGN * (want - ang) - AIR_ALIGN_DAMP * spin;
      spin -= spin * AIR_SPIN_DAMP * DT;
    }

    vx += (fx / MASS) * DT;
    vy += (fy / MASS) * DT;
    spin += (torque / INERTIA) * DT;
    if (spin > MAX_SPIN) spin = MAX_SPIN;
    else if (spin < -MAX_SPIN) spin = -MAX_SPIN;

    px += vx * DT;
    py += vy * DT;
    ang += spin * DT;
    wheelSpin += (vx / WHEEL_R) * DT;

    // The start line is a wall: rolling backwards off the left edge is not a
    // run, it is a stuck player.
    if (px < PX_MONTH * 0.2) {
      px = PX_MONTH * 0.2;
      if (vx < 0) vx = 0;
    }

    if (dying > 0) {
      // Watching the wreck settle, not driving it. Score is already banked.
      chassisResponse();
      // Crashes lose energy; without this the wreck is still spinning at full
      // rate when the card arrives.
      spin -= spin * TRIP_DECAY * DT;
      dying -= DT;
      if (dying <= 0) settle();
      return;
    }

    if (px > maxX) maxX = px;
    const m = Math.min(N - 1, Math.max(0, Math.floor(maxX / PX_MONTH)));
    if (m !== months) {
      months = m;
      onMonths(m);
    }

    if (ang > FLIP_LIMIT || ang < -FLIP_LIMIT) return crash('flip');

    /* Bellying out, not brushing past. A landing compresses the suspension
       and the underside can clip the hill by a pixel for a step or two before
       the spring pushes it back out — the rickshaw is upright, still moving,
       and nothing about it looks like a crash, so ending the run there reads
       as the game cheating. Either of two things is a real bottom-out: the
       body is driven in past TOUCH_DEPTH, or it is still in there after
       TOUCH_GRACE. Nothing pushes the body out during normal play, so a
       genuine one crosses the depth line within a step or two of touching and
       the timer is only there for the slow scrape along a crest. */
    const depth = chassisDepth();
    if (depth > 0) {
      touching += DT;
      if (depth > TOUCH_DEPTH || touching > TOUCH_GRACE) return crash('body');
    } else {
      touching = 0;
    }

    if (px >= END_X) return finish('cleared', 'none');
  }

  /** Starts the crash beat. The outcome is fixed here; the card comes later. */
  function crash(reason: RunEnd['reason']): void {
    if (ended || dying > 0) return;
    pendingOutcome = 'crash';
    pendingReason = reason;
    dying = DEATH_TIME;
    lampOut = true;
    throttle = false;

    // Trip it over its nose, hard enough to see and in proportion to speed.
    const speed = Math.sqrt(vx * vx + vy * vy);
    let trip = TRIP_SPIN * (speed / TRIP_REF);
    if (trip > MAX_SPIN) trip = MAX_SPIN;
    spin -= vx < 0 ? -trip : trip;
    vx *= TRIP_SCRUB;
  }

  function settle(): void {
    dying = 0;
    finish(pendingOutcome, pendingReason);
  }

  /** Shell-against-terrain response, used only while the wreck is falling.
   *  In normal play the chassis touching the ground ends the run, so it never
   *  needs to be pushed back out; here it does, or the body sinks away. This
   *  runs on the full shell, canopy included, because a wreck on its roof
   *  rests on the roof. */
  function chassisResponse(): void {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    for (let i = 0; i < SHELL_N; i++) {
      const lx = HULL_X[i];
      const ly = HULL_Y[i];
      const wx = px + lx * c - ly * s;
      const wy = py + lx * s + ly * c;
      sample(wx);
      const pen = sampleH - wy;
      if (pen <= 0) continue;
      const sl = sampleS;
      const inv = 1 / Math.sqrt(1 + sl * sl);
      const nx = -sl * inv;
      const ny = inv;
      const tx = inv;
      const ty = sl * inv;
      const rx = wx - px;
      const ry = wy - py;
      const vax = vx - spin * ry;
      const vay = vy + spin * rx;
      const vn = vax * nx + vay * ny;
      const vt = vax * tx + vay * ty;
      let fn = CHASSIS_SPRING * pen - CHASSIS_DAMP * vn;
      if (fn < 0) fn = 0;
      let ft = -CHASSIS_FRICTION * vt;
      const cap = fn;
      if (ft > cap) ft = cap;
      else if (ft < -cap) ft = -cap;
      const gx = fn * nx + ft * tx;
      const gy = fn * ny + ft * ty;
      vx += (gx / MASS) * DT;
      vy += (gy / MASS) * DT;
      spin += ((rx * gy - ry * gx) / INERTIA) * DT;
    }
  }

  /** How far the body box is inside the hill, in pixels, or 0 if it is clear.
   *  Body box only (HULL_N), never the canopy. */
  function chassisDepth(): number {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    let worst = 0;
    for (let i = 0; i < HULL_N; i++) {
      const lx = HULL_X[i];
      const ly = HULL_Y[i];
      const wx = px + lx * c - ly * s;
      const wy = py + lx * s + ly * c;
      const pen = heightAt(wx) - wy;
      if (pen > worst) worst = pen;
    }
    return worst;
  }

  function finish(outcome: 'crash' | 'cleared', reason: RunEnd['reason']): void {
    if (ended) return;
    ended = true;
    running = false;
    throttle = false;
    onEnd({
      outcome,
      months: outcome === 'cleared' ? TOTAL_MONTHS : months,
      reason,
      secs: elapsed,
    });
  }

  /* ── Camera ──────────────────────────────────────────────────────────── */

  let camX = 0;
  let camY = 0; // world y sitting on the chart's bottom edge
  let camReady = false;

  function updateCamera(carX: number, carY: number, frameDt: number): void {
    camX = carX - cssW * CAM_LEAD;
    const minCam = -PX_PCT * 3;
    const maxCam = END_X - cssW + 60;
    if (camX < minCam) camX = minCam;
    if (maxCam > minCam && camX > maxCam) camX = maxCam;

    const h = chartH();
    let want = carY - h * 0.42;
    /* The floor stops the camera sinking below the ground, so that low
       country is framed with the terrain near the bottom of the chart rather
       than floating in the middle of it.

       It used to be the constant -18, which quietly assumed the ground never
       goes below zero. Five of the six eras oblige. The seventies do not:
       May 1976 is -11.3%, which at Medium is 102 world px under the zero line
       and at Hard is 143, so the camera stopped at zero while the rickshaw
       drove on out of the bottom of the chart for fifteen months of 1976.
       Measuring the pad from the lowest ground instead of from zero keeps the
       framing the -18 was chosen for, and leaves it at exactly -18 wherever
       the terrain never goes negative. */
    if (want < CAM_FLOOR) want = CAM_FLOOR;
    /* And the ceiling, which is the floor's answer for calm country. An era
       whose whole range is shorter than the chart cannot avoid slack; this
       decides which end of the box it goes to. Above the line it is sky, and
       the chart reads as empty. Below it, the area fill runs on down to the
       axis and the same terrain reads as ground. So the sky is capped and the
       slack falls beneath, which is why this is applied after the floor and
       allowed to overrule it. */
    const ceil = TERRAIN_MAX - (1 - CAM_SKY) * h;
    if (want > ceil) want = ceil;
    /* Except that the car outranks the framing: a jump off a peak, or the
       climb up one taller than the chart, has to stay on screen. */
    const carLimit = carY - h + CAM_CAR_TOP;
    if (want < carLimit) want = carLimit;
    if (!camReady) {
      camY = want;
      camReady = true;
      return;
    }
    // Frame-rate independent exponential follow.
    camY += (want - camY) * (1 - Math.exp(-frameDt / CAM_TAU));
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  // world → screen. Hoisted rather than defined per frame: a closure built
  // inside render() is an allocation on every one of them.
  let viewH = 0;
  function sy(worldY: number): number {
    return viewH - (worldY - camY);
  }

  function render(alpha: number, frameDt: number): void {
    const carX = prevPx + (px - prevPx) * alpha;
    const carY = prevPy + (py - prevPy) * alpha;
    const carA = prevAng + (ang - prevAng) * alpha;
    updateCamera(carX, carY, frameDt);

    const h = chartH();
    viewH = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    // Everything above the axis is clipped to the plot area. Without this the
    // area fill spills into the year-axis strip wherever the terrain runs off
    // the bottom of the view, which on a steep descent is most of the time.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cssW, h);
    ctx.clip();

    // gridlines, horizontal (percentage) then vertical (year boundary)
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = 0; g < gridCount; g++) {
      const y = Math.round(sy(gridY[g])) + 0.5;
      if (y < 0 || y > h) continue;
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
    }
    ctx.stroke();

    // Year rules, dotted: ink at a third duty cycle, so time is furniture and
    // not annotation. setLineDash is canvas state, so it is put back before
    // anything else is stroked.
    ctx.strokeStyle = col.ink;
    ctx.setLineDash(YEAR_DASH);
    ctx.beginPath();
    for (let y = 0; y < yearCount; y++) {
      const x = Math.round(yearAt[y] * PX_MONTH - camX) + 0.5;
      if (x < 0 || x > cssW) continue;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.setLineDash(NO_DASH);

    // terrain: one path, sampled across the visible width only
    ctx.beginPath();
    ctx.moveTo(0, sy(heightAt(camX)));
    for (let x = SAMPLE_STEP; x < cssW; x += SAMPLE_STEP) {
      ctx.lineTo(x, sy(heightAt(camX + x)));
    }
    ctx.lineTo(cssW, sy(heightAt(camX + cssW)));
    ctx.strokeStyle = col.series;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // quiet fill beneath, closing the same path down to the axis
    ctx.lineTo(cssW, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = col.fill;
    ctx.fill();

    // Percentage labels, pinned to the left edge like a chart's y-axis, and
    // drawn AFTER the terrain fill: below the line they would otherwise be
    // buried by it, which is exactly where the low gridlines sit.
    ctx.fillStyle = col.axis;
    ctx.font = labelFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (let g = 0; g < gridCount; g++) {
      const y = sy(gridY[g]);
      if (y < 12 || y > h) continue;
      ctx.fillText(gridLabels[g], 4, y - 2);
    }

    /* Peak values, set INSIDE the hill rather than above it. Two things fall
       out of that: the label can never collide with the rickshaw standing on
       the peak, which above the line it always did, and the annotation reads
       as belonging to the shape it names rather than floating over it.

       An unread one draws nothing at all. It carried a small saffron tick on
       the curve for a while, on the argument that a chart should say where its
       annotations are before you reach them. It should not: the tick is a mark
       the chart did not have before, sitting in the series' own colour on the
       series itself, and half a dozen of them across a resting stretch is a
       second row of furniture standing in for the first. The terrain is the
       thing to look at before a run, and it says everything the game needs. */
    const reach = REVEAL_WIDTHS * cssW;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < peakX.length; i++) {
      if (!revealed[i] && running && Math.abs(markX[i] - carX) < reach) revealed[i] = 1;
      if (!revealed[i]) continue;
      const x = peakX[i] - camX;
      if (x < -50 || x > cssW + 50) continue;
      const y = sy(peakY[i]) + 9;
      if (y < 0 || y > h - 8) continue;
      ctx.fillStyle = col.rate;
      ctx.font = peakFont;
      ctx.fillText(peakLabel[i], x, y);
      ctx.fillStyle = col.ink;
      ctx.font = labelFont;
      ctx.fillText(peakWhen[i], x, y + 14);
      // The event, on the months that have one. Same face and size as the
      // date above it, at full ink, so it reads as the line that matters of
      // the three without becoming a second saffron thing on the chart.
      if (peakTag[i]) {
        ctx.fillStyle = col.ink;
        ctx.fillText(peakTag[i], x, y + 26);
      }
    }

    drawBeam(carX - camX, sy(carY), carA);
    drawCar(carX - camX, sy(carY), carA);

    ctx.restore();

    // axis strip
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h + 0.5);
    ctx.lineTo(cssW, h + 0.5);
    ctx.stroke();
    ctx.fillStyle = col.ink;
    ctx.font = labelFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let y = 0; y < yearCount; y++) {
      if (!yearLabels[y]) continue; // a mid-year first rule carries no year
      const x = yearAt[y] * PX_MONTH - camX;
      if (x < -60 || x > cssW) continue;
      ctx.fillText(yearLabels[y], x + 4, h + 8);
    }
  }

  /* A passenger opening: a rectangle with its corners taken off, because an
     auto's frame is bent tube and every corner on it is a radius. Hoisted for
     the same reason drawWheel is. */
  function opening(x: number, y: number, w: number, hh: number): void {
    ctx.beginPath();
    if (HAS_ROUND_RECT) ctx.roundRect(x, y, w, hh, OPENING_R);
    else ctx.rect(x, y, w, hh);
    ctx.fill();
  }

  /* Both wheels are the same size, because an auto's are. Hoisted out of
     drawCar rather than written as a closure inside it: a function defined
     per frame is an allocation per frame. */
  function drawWheel(wx: number): void {
    const wy = -WHEEL_DY;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = col.bg;
    ctx.beginPath();
    ctx.arc(wx, wy, WHEEL_R - 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // one spoke, so rotation is legible in the air
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(wheelSpin) * (WHEEL_R - 3), wy + Math.sin(wheelSpin) * (WHEEL_R - 3));
    ctx.stroke();
  }

  /** How hard the lamp is burning, 0 to 1. Steady for the whole run; on a
   *  crash it stutters out across the death beat and stays out until the next
   *  reset, so the wreck settles dark.
   *
   *  The stutter is hashed off the beat's own clock rather than drawn from
   *  Math.random, because everything else here is deterministic at a fixed
   *  timestep and a replay ought to flicker the same way. The cutoff climbs
   *  with the beat, so the dark gaps lengthen on their own and the lamp is
   *  fully out at around 0.83 of the way through, before the tumble has
   *  finished. A filament failing rather than a switch being thrown. */
  function lampLevel(): number {
    if (!col.lamp) return 0;
    if (!lampOut) return 1;
    if (dying <= 0) return 0;
    const t = 1 - dying / DEATH_TIME;
    const h = Math.sin(Math.floor(t * LAMP_STUTTER) * 12.9898) * 43758.5453;
    return h - Math.floor(h) > t * 1.2 ? 1 - 0.5 * t : 0;
  }

  /* Hit distance per ray, reused across frames so the beam allocates nothing.
     BEAM_RAYS + 1 because both edges of the cone get a ray. */
  const beamR = new Float64Array(BEAM_RAYS + 1);

  /** Terrain height in screen y, at a screen x. */
  function groundAt(sx: number): number {
    return sy(heightAt(camX + sx));
  }

  /* The beam, which unlike everything else about the vehicle is drawn in
     SCREEN space rather than in the car's local frame. It has to be: the
     terrain cuts it, and the terrain is only addressable in screen space.

     Each ray is marched out until it passes under the ground, then bisected
     onto the surface; the polygon those hits make is the lit volume. That is
     more than clipping the cone to the air above the line, and the difference
     shows on exactly the shape this terrain is full of — a hump between the
     lamp and the ground beyond it. Clipped, the beam reappears past the hump,
     because air on the far side is still air. Marched, the hump shadows it.

     Called before drawCar so the bodywork paints over the apex, which is how
     the half of the cone pointing back into the vehicle is disposed of
     without a second clip. */
  function drawBeam(cx: number, cy: number, a: number): void {
    const lamp = lampLevel();
    if (lamp <= 0) return;
    const grad = lampGradient();
    if (!grad) return;

    // Lamp and aim, taken through the same rotation drawCar applies.
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const lx = cx + BEAM_X * ca + BEAM_Y * sa;
    const ly = cy - BEAM_X * sa + BEAM_Y * ca;
    const aim = BEAM_TILT - a;
    const step = (2 * BEAM_HALF) / BEAM_RAYS;

    for (let i = 0; i <= BEAM_RAYS; i++) {
      const th = aim - BEAM_HALF + step * i;
      const dx = Math.cos(th);
      const dy = Math.sin(th);
      let r = BEAM_REACH;
      for (let s = 1; s <= BEAM_STEPS; s++) {
        const t = (BEAM_REACH * s) / BEAM_STEPS;
        if (ly + dy * t > groundAt(lx + dx * t)) {
          let lo = (BEAM_REACH * (s - 1)) / BEAM_STEPS;
          let hi = t;
          for (let k = 0; k < BEAM_BISECT; k++) {
            const m = (lo + hi) / 2;
            if (ly + dy * m > groundAt(lx + dx * m)) hi = m;
            else lo = m;
          }
          r = hi;
          break;
        }
      }
      beamR[i] = r;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = lamp;
    // Translated to the lamp, because the gradient is baked at the origin.
    ctx.translate(lx, ly);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= BEAM_RAYS; i++) {
      const th = aim - BEAM_HALF + step * i;
      ctx.lineTo(Math.cos(th) * beamR[i], Math.sin(th) * beamR[i]);
    }
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(-BEAM_REACH, -BEAM_REACH, BEAM_REACH * 2, BEAM_REACH * 2);
    ctx.restore();
  }

  function drawCar(cx: number, cy: number, a: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-a); // world y is up, screen y is down

    /* An auto rickshaw, side on. The collision hull is still the plain
       ±BODY_HW × ±BODY_HH box the physics uses — the canopy above it is
       drawn, not simulated, which is the usual split between a vehicle's
       visual shape and its hull.

       At forty-odd pixels only three cues survive, so the drawing spends
       everything on them: the flat canopy roof, the round nose falling away
       to the front wheel, and the open passenger side. The last one is the
       giveaway, and it is cut out in the background colour rather than drawn,
       so it stays an opening in both themes. */
    /* One solid silhouette with the passenger openings cut back out of it,
       which is how the reference drawings do it and, at this size, the only
       version that survives: an open frame drawn in 2.5px strokes is four
       hairlines and a gap, and it read as a hatchback.

       The three cues, in the order they carry: the tall rounded rear shell
       rising straight off the back wheel into a flat roof; the roof running
       most of the length and turning down into a single steep windscreen
       post; and the small front wheel. Nothing else about an auto is legible
       at forty pixels, so nothing else is drawn. */
    /* Both wheels go down LAST, over the bodywork, and both are complete
       circles. An earlier pass drew the front one first so the mudguard could
       cover it; on the reference drawings the mudguard is the shape BEHIND
       the tyre, and a wheel clipped into a crescent reads as a broken shape
       rather than a wheel. */
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const lamp = lampLevel();

    ctx.fillStyle = col.carBody;
    ctx.beginPath();
    /* SKIRT is below the chassis box the physics tests, which means on the
       crest that finally beaches the rickshaw the drawn skirt touches a few
       pixels before the run ends. That is the right trade: the alternative is
       a body visibly on stilts, and the only ground that ever comes within
       reach of the skirt is ground already about to end the run. */
    ctx.moveTo(-20, SKIRT);
    ctx.lineTo(-20, -11); // rear face, overhanging the back wheel
    ctx.quadraticCurveTo(-19.5, -19.5, -11, -20); // rounded rear shoulder
    ctx.quadraticCurveTo(-2, -21, 12.5, -18.5); // canopy, running most of the length
    ctx.quadraticCurveTo(15.5, -16.5, 16.5, -9.5); // steep screen down to the scuttle
    ctx.lineTo(17.5, -5);
    /* The front is a wedge, not a rounded nose: a mudguard running down from
       the base of the windscreen to a point ahead of the wheel, widening as
       it goes back, so it is triangular and widest where it meets the cabin.
       The tip sits level with the axle rather than with the top of the tyre,
       which is the low reading of the shape. */
    ctx.quadraticCurveTo(21, -2, 23.5, 7);
    ctx.quadraticCurveTo(24.5, 11, 22.5, 14); // the tip, just past the tyre
    ctx.quadraticCurveTo(20, 17, 15, 16); // and back under it to the skirt
    ctx.lineTo(8, SKIRT);
    ctx.closePath();
    ctx.fill();
    /* The canopy. On a CNG auto the yellow is not a roof stripe: it comes
       down the rear, over the top, and down the windscreen, meeting the green
       at the window line about halfway up the shell. So it is painted as a
       band across the top half rather than as a shape of its own. The body
       path is still the current path after the fill above, so clipping to it
       and filling a rectangle gets the band trimmed to the silhouette for
       free, seam included. */
    ctx.save();
    ctx.clip();
    ctx.fillStyle = col.carRoof;
    ctx.fillRect(-22, -22, 48, 18);
    /* The lens, in the same clip, so it is trimmed to the silhouette and can
       never sit proud of the front face however the nose is shaped. Drawn
       whenever the theme has a lamp at all, not only when it is lit: an
       unlit auto still has a headlamp on it, and a dot that vanishes between
       flickers reads as damage to the bodywork rather than to the light. */
    if (col.lamp) {
      ctx.globalAlpha = 0.25 + 0.75 * lamp;
      ctx.fillStyle = lensGradient() ?? col.lamp;
      ctx.beginPath();
      ctx.arc(LAMP_DX, LAMP_DY, LAMP_R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* The openings, cut in the background colour so they stay holes in both
       themes. Nearly the full height of the body, which is the proportion an
       auto actually has: the sides are open from the roof down to the floor
       pan, with a solid rail along the bottom. Short windows high in a tall
       body read as a van.

       The pair runs forward to the base of the windscreen, so the front
       opening is the driver's side and not a second passenger window. Where
       they sit along the body is the whole difference between reading as an
       auto and reading as a small van: the solid rear panel behind them is
       11px against the front pillar's 2, which is the proportion a real one
       has. It used to be 4.5 against 3.9 — near enough equal, and wrong. */
    ctx.fillStyle = col.bg;
    opening(-9, -16, 9, 19);
    opening(2.5, -16, 10, 19);

    // Tyres in ink. On a two-colour body the rubber is the one part of an auto
    // that is actually black, and it keeps the wheels off the livery.
    ctx.strokeStyle = col.ink;
    drawWheel(WHEEL_DX);
    drawWheel(REAR_WHEEL_DRAW_X);
    ctx.restore();
  }

  /* ── Loop ────────────────────────────────────────────────────────────── */

  let raf = 0;
  let last = 0;
  let acc = 0;
  let fpsEma = 60;

  function tick(now: number): void {
    raf = requestAnimationFrame(tick);
    let frameDt = last ? (now - last) / 1000 : DT;
    last = now;
    if (frameDt > MAX_FRAME) frameDt = MAX_FRAME;
    if (frameDt > 0) fpsEma += (1 / frameDt - fpsEma) * 0.06;

    if (running) {
      acc += frameDt;
      let steps = 0;
      while (acc >= DT && steps < 40) {
        step();
        acc -= DT;
        steps++;
        if (!running) {
          acc = 0;
          break;
        }
      }
    }

    render(running ? acc / DT : 1, frameDt);

    if (!running && ended) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function start(): void {
    reset();
    running = true;
    onMonths(0);
    last = 0;
    acc = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // Draw the resting terrain before the first run, so the page shows the
  // chart rather than an empty box.
  reset();
  render(1, DT);

  const onVisibility = () => {
    last = 0;
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    start,
    setThrottle: (on: boolean) => {
      if (running) throttle = on;
    },
    refreshTheme: () => {
      refreshTheme();
      if (!running) render(1, DT);
    },
    resize: () => {
      resize();
      if (!running) render(1, DT);
    },
    destroy: () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      document.removeEventListener('visibilitychange', onVisibility);
    },
    fps: () => fpsEma,
    monthCount: () => months,
    probe: (out: Float64Array) => {
      out[0] = px;
      out[1] = py;
      out[2] = Math.sqrt(vx * vx + vy * vy);
      out[3] = ang;
      out[4] = grounded ? 1 : 0;
      out[5] = stepPen;
    },
  };
}
