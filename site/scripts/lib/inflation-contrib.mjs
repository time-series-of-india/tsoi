// The one piece of arithmetic the Inflation board does that MoSPI does not
// publish: how much of the headline year-on-year each of the twelve divisions
// accounts for, in percentage points.
//
// Kept apart from the generator so it can be tested on a fixed fixture without
// a database (tests/dashboards/inflation-contrib.test.ts), and so the formula
// sits in one readable place where a reviewer can check it against the spec
// (docs/explore-inflation-board-spec.md § Methodology).
//
// The rules, in order of how easy they are to break:
//
//  1. Published inflation is used as published. Nothing here recomputes a rate
//     from indices. The year-ago index levels the formula needs are BACKED OUT
//     of the published rate and the published current index, and they exist
//     only inside this arithmetic — they are never emitted as if MoSPI had
//     said them.
//  2. The denominator is Σw, not 100. The 2024 basket's combined division
//     weights sum to 99.999, and the two other sectors miss 100 in the other
//     direction. Hardcoding 100 would put a silent 1-in-100,000 tilt on every
//     contribution and would hide a real weight-table error if one ever landed.
//  3. The residual is disclosed, never absorbed. Σ contrib does not land exactly
//     on the published headline, and three separate roundings put it there:
//
//       - RATE rounding, which dominates. MoSPI publishes year-on-year to two
//         decimals, so a rate of 5.05 stands for anything in [5.045, 5.055),
//         and backing a year-ago level out of it carries that interval into
//         every contribution.
//       - INDEX rounding. The published index levels are themselves given to
//         one or two decimals, so idx_d − prev_d inherits a rounding of its own.
//       - AGGREGATION rounding, in the weights: the division weights are
//         published to three decimals and sum to 99.999 rather than to a round
//         hundred, so the denominator is itself a rounded quantity.
//
//     The last two are small and largely cancel — they push in both directions
//     across twelve divisions rather than one — which is why the reconstruction
//     gate, the one place they show up alone, measures at most 0.0075 index
//     points across every month and sector. Rate rounding does not cancel in the
//     same way, and it is what the residual mostly is.
//
//     Whatever its composition, the gap is returned and shown, not spread across
//     the divisions to make the bars add up.

/**
 * The year-ago index level implied by a published index and a published
 * year-on-year rate: idx / (1 + infl/100).
 *
 * This is the one derived quantity in the board. It is exact whenever the
 * published rate is exact, and off by whatever the rate's rounding hides
 * otherwise — which is the whole source of the residual below.
 */
export const yearAgoIndex = (idx, infl) => idx / (1 + infl / 100);

/**
 * @typedef {object} DivisionInput
 * @property {string} code
 * @property {string} [name]
 * @property {number} weight
 * @property {number} idx
 * @property {number} infl
 */

/**
 * @typedef {object} DivisionContribution
 * @property {string} code
 * @property {string|undefined} name
 * @property {number} weight  the published weight, passed straight through
 * @property {number} infl  the published year-on-year, passed straight through
 * @property {number} contrib  percentage points of the headline
 */

/**
 * Contribution of each division to the headline year-on-year, in percentage
 * points.
 *
 *   prev_d    = idx_d / (1 + infl_d/100)
 *   prev_gen  = idx_gen / (1 + infl_gen/100)
 *   contrib_d = w_d * (idx_d - prev_d) / (Σw * prev_gen) * 100
 *
 * @param {object} args
 * @param {{idx: number, infl: number}} args.gen  published General index and rate
 * @param {DivisionInput[]} args.divisions
 * @param {number} args.weightSum  Σw over the divisions passed in — 99.999 for
 *        the 2024 combined basket. Pass it explicitly rather than summing here
 *        so the caller's gate and this arithmetic can never use two different
 *        numbers.
 * @param {number} [args.decimals]  round each contribution to this many decimals
 *        and derive `sum` and `residual` from the ROUNDED values. Pass whatever
 *        the caller is about to ship. Omit for the exact arithmetic.
 * @returns {{divisions: DivisionContribution[], sum: number, residual: number}}
 *          `sum` is Σ contrib; `residual` is Σ contrib − published gen.
 */
export function divisionContributions({ gen, divisions, weightSum, decimals }) {
  if (!(weightSum > 0)) throw new Error(`weightSum must be positive, got ${weightSum}`);
  if (gen == null || gen.idx == null || gen.infl == null) {
    throw new Error('divisionContributions needs a published General index and rate');
  }
  const prevGen = yearAgoIndex(gen.idx, gen.infl);
  const out = divisions.map((d) => {
    if (d.idx == null || d.infl == null || d.weight == null) {
      throw new Error(`division ${d.code} is missing index, inflation or weight`);
    }
    const prev = yearAgoIndex(d.idx, d.infl);
    const contrib = (d.weight * (d.idx - prev)) / (weightSum * prevGen) * 100;
    return {
      code: d.code,
      name: d.name,
      weight: d.weight,
      infl: d.infl,
      contrib: decimals == null ? contrib : round(contrib, decimals),
    };
  });
  /* Summed AFTER rounding, deliberately. The residual is a claim the desk makes
     out loud — "the twelve bars add to gen ± this" — and a reader checking it
     adds up the numbers on screen, not the ones behind them. Summing the exact
     contributions and then rounding the residual made that claim wrong by a
     tenth of a basis point in four months out of six: true of the arithmetic,
     false of the chart. Rounding decides what ships, so rounding comes first. */
  const raw = out.reduce((a, d) => a + d.contrib, 0);
  const sum = decimals == null ? raw : round(raw, decimals);
  return { divisions: out, sum, residual: decimals == null ? sum - gen.infl : round(sum - gen.infl, decimals) };
}

/**
 * Reconstruct a published index from its parts: Σ(w·idx)/Σw.
 *
 * Used only as a gate. The board never ships this number in place of the
 * published one; if the two ever disagree by more than a rounding's worth, the
 * weight table and the index table have drifted apart and the build stops.
 */
export function reconstructIndex({ divisions, weightSum }) {
  if (!(weightSum > 0)) throw new Error(`weightSum must be positive, got ${weightSum}`);
  return divisions.reduce((a, d) => a + d.weight * d.idx, 0) / weightSum;
}

/** Round to `n` decimals and return a number, not a string. */
export const round = (v, n) => (v == null ? null : +v.toFixed(n));
