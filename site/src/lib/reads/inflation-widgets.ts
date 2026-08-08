// Hand-built figures for the inflation read ("Inflation: The Price of Nearly
// Everything"). The basket widgets (your basket, the slopegraph) are shared
// with the food-read module — this file holds only what is new to this read.
//
// Same grammar as basket-widgets.ts: each init returns { refresh } so the page
// can redraw on theme flips and font load, and captions never rely on colour
// alone.
import { initTouchTipToggle, initTouchTooltipClose } from '../panel-chrome';

type Tokens = {
  mono: string; text: string; subtle: string; line: string; surfaceDim: string;
  c1: string; c6: string; palette: string[];
};
type Deps = { echarts: typeof import('echarts'); tokens: () => Tokens };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mLabel = (m: string) => `${MONTHS[+m.slice(5) - 1]} ${m.slice(2, 4)}`;

function el(tag: string, cls: string, html = '') {
  const n = document.createElement(tag);
  n.className = cls;
  if (html) n.innerHTML = html;
  return n;
}

// saffron as TEXT falls below 4.5:1 on the light surface; the -text variant
// keeps the hue at a readable weight (same rule as prose entity spans).
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---- one line (opening bookend) ------------------------------------------------
// The headline alone: real monthly YoY, Jan 2014 to the latest print, drawn
// slowly left to right and ending at the current number. No axes, no labels
// beyond the number — the read opens with the line exactly as the world
// meets it, a single fact. The closing bookend (initStrands, Part III)
// answers it: the same line revealed as the merge of twelve.

export type OneLineData = { asOf: string; latest: number | null; points: { m: string; v: number }[] };

export function initOneLine(fig: HTMLElement | null, ol: OneLineData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.hl-area')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 720, H = 230;
  const padT = 22, padB = 22, padL = 8;
  const xEnd = W - 108;

  const vs = ol.points.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const span = hi - lo || 1;
  const X = (k: number) => padL + (k / (ol.points.length - 1)) * (xEnd - padL);
  const Y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB);

  const svg = svgEl('svg', { class: 'hl-svg', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }) as SVGSVGElement;
  area.appendChild(svg);

  let dAttr = `M ${X(0).toFixed(1)} ${Y(vs[0]).toFixed(1)}`;
  for (let k = 1; k < vs.length; k++) dAttr += ` L ${X(k).toFixed(1)} ${Y(vs[k]).toFixed(1)}`;
  const line = svgEl('path', { d: dAttr, class: 'hl-line' }) as SVGPathElement;
  svg.appendChild(line);

  const yLast = Y(vs[vs.length - 1]);
  const dot = svgEl('circle', { cx: xEnd, cy: yLast, r: 4, class: 'hl-dot' });
  const sign = ol.latest != null && ol.latest > 0 ? '+' : '';
  const num = svgEl('text', { x: xEnd + 12, y: yLast + 1, class: 'st-num' });
  num.textContent = `${sign}${ol.latest?.toFixed(2)}%`;
  const sub = svgEl('text', { x: xEnd + 12, y: yLast + 17, class: 'st-sub' });
  sub.textContent = 'on the year';
  svg.append(dot, num, sub);

  const play = () => {
    // near-linear through the first two-thirds, then the ease-out — the
    // terminal slowdown stays but starts later, so the draw doesn't linger.
    line.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.33, 0.33, 0.12, 1)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      line.style.strokeDashoffset = '0';
      setTimeout(() => svg.classList.add('done'), 3200);
    }));
  };

  if (reduced) {
    svg.classList.add('done');
  } else {
    const L = line.getTotalLength();
    line.style.strokeDasharray = String(L);
    line.style.strokeDashoffset = String(L);
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
    }, { threshold: 0.45 });
    io.observe(svg);
    // a tap replays the draw, matching the closing bookend
    area.style.cursor = 'pointer';
    area.addEventListener('click', () => {
      svg.classList.remove('done');
      const L2 = line.getTotalLength();
      line.style.transition = 'none';
      line.style.strokeDasharray = String(L2);
      line.style.strokeDashoffset = String(L2);
      requestAnimationFrame(() => requestAnimationFrame(play));
    });
  }

  return { refresh() {} };
}

// ---- many lines, one line (closing bookend, Part III) --------------------------
// The read's motif: twelve thin ink strands, each seeded from a real
// division's index path, drift at their own heights and then converge into
// one saffron line that ends in the headline number. No axes, no labels — a
// drawing, not a chart; the figcaption carries the honesty. Draws in slowly
// on first view (stroke draw, staggered, ~3s total). Returns at the read's
// close fanned back out, with one strand highlighted as the reader's own.
// Reduced motion: renders fully drawn.

export type StrandsData = {
  asOf: string; headline: number | null;
  divisions: { name: string; idx: (number | null)[] }[];
};

const svgNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const n = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

export function initStrands(fig: HTMLElement | null, st: StrandsData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.st-area')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 720, H = 230;
  const padT = 16, padB = 16, padL = 6;
  const xMerge = W * 0.5;   // strands drift freely until here
  const xConv = W * 0.72;   // fully converged by here
  const xEnd = W - 108;     // saffron line ends here, label after
  const yConv = H / 2 + 8;  // convergence point
  const yEnd = yConv - 10;  // the one line rises gently

  const svg = svgEl('svg', { class: 'st-svg', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }) as SVGSVGElement;
  area.appendChild(svg);

  const n = st.divisions.length;
  const laneStep = (H - padT - padB) / Math.max(1, n - 1);
  const strandPaths: SVGPathElement[] = [];

  st.divisions.forEach((d, i) => {
    const vals = d.idx.filter((v): v is number => v != null);
    if (!vals.length) return;
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const laneY = padT + i * laneStep;
    const amp = 13;
    const pts = vals.map((v, k) => {
      const x = padL + (k / (vals.length - 1)) * (xMerge - padL);
      const y = laneY + (0.5 - (v - min) / span) * amp;
      return [x, y] as [number, number];
    });
    let dAttr = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let k = 1; k < pts.length; k++) dAttr += ` L ${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}`;
    // the slow pull into the one line: a symmetric S-curve to the meet point
    const yLast = pts[pts.length - 1][1];
    const dx = (xConv - xMerge) * 0.55;
    dAttr += ` C ${(xMerge + dx).toFixed(1)} ${yLast.toFixed(1)}, ${(xConv - dx).toFixed(1)} ${yConv}, ${xConv} ${yConv}`;
    const p = svgEl('path', { d: dAttr, class: 'st-strand' }) as SVGPathElement;
    svg.appendChild(p);
    strandPaths.push(p);
  });

  const one = svgEl('path', {
    d: `M ${xConv} ${yConv} C ${xConv + (xEnd - xConv) * 0.5} ${yConv}, ${xConv + (xEnd - xConv) * 0.55} ${yEnd}, ${xEnd} ${yEnd}`,
    class: 'st-one',
  }) as SVGPathElement;
  svg.appendChild(one);

  const sign = st.headline != null && st.headline > 0 ? '+' : '';
  const num = svgEl('text', { x: xEnd + 10, y: yEnd + 1, class: 'st-num' });
  num.textContent = `${sign}${st.headline?.toFixed(2)}%`;
  const sub = svgEl('text', { x: xEnd + 10, y: yEnd + 17, class: 'st-sub' });
  sub.textContent = 'on the year';
  svg.append(num, sub);

  const prep = (p: SVGPathElement) => {
    const L = p.getTotalLength();
    p.style.strokeDasharray = String(L);
    p.style.strokeDashoffset = String(L);
  };

  const play = () => {
    strandPaths.forEach((p, i) => {
      p.style.transition = `stroke-dashoffset 2.4s cubic-bezier(0.33, 0, 0.2, 1) ${i * 90}ms`;
    });
    one.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.33, 0, 0.2, 1) 2400ms';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      strandPaths.forEach((p) => { p.style.strokeDashoffset = '0'; });
      one.style.strokeDashoffset = '0';
      setTimeout(() => svg.classList.add('done'), 3400);
    }));
  };

  if (reduced) {
    svg.classList.add('done');
  } else {
    // hide the ink before the first paint so the draw-in is the first thing
    // the reader ever sees — no flash of the finished drawing.
    strandPaths.forEach(prep);
    prep(one);
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
    }, { threshold: 0.45 });
    io.observe(svg);
  }

  return { refresh() {} };
}

export type MixerData = {
  item: string; a: string; b: string;
  months: string[]; pa: number[]; pb: number[];
  carli: number[]; jevons: number[];
};

const fmtPct = (v: number, dp = 1) => `${v > 0 ? '+' : ''}${v.toFixed(dp)}%`.replace('-', '−');

// ---- four years of tomatoes (beat 6) -------------------------------------------
// REAL chain drift, standalone: tomato retail in Delhi and Kerala (monthly
// averages of daily state prices), 49 months. Top strip: the two
// price series, the only inputs. Bottom strip: each month the two states'
// price changes are averaged — once by adding, once by multiplying — and the
// 48 monthly averages are chained into two indices. The chained geometric
// index ends exactly where a direct start→end comparison lands; the chained
// arithmetic one does not, and the shaded wedge between them is the formula
// artefact. Paths ship precomputed from the generator so the drawing can
// never disagree with the prose.

export function initDrift(fig: HTMLElement | null, mx: MixerData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.df-area')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = svgEl('svg', { class: 'mx-svg mx-svg3' }) as SVGSVGElement;
  area.appendChild(svg);
  const n = mx.months.length;
  let played = reduced;
  let io: IntersectionObserver | null = null;

  const build = () => {
    const w = area.clientWidth;
    if (!w) return;
    io?.disconnect(); io = null;
    const narrow = w < 560;
    const H = 358;
    const x0 = narrow ? 10 : 14, x1 = w - (narrow ? 114 : 136);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';
    const X = (k: number) => x0 + (k / (n - 1)) * (x1 - x0);
    const lineOf = (vals: number[], Y: (v: number) => number) => {
      let d = `M ${X(0).toFixed(1)} ${Y(vals[0]).toFixed(1)}`;
      for (let k = 1; k < vals.length; k++) d += ` L ${X(k).toFixed(1)} ${Y(vals[k]).toFixed(1)}`;
      return d;
    };
    const endLab = (y: number, cls: string, t1: string, t2: string) => {
      const g1 = svgEl('text', { x: x1 + 8, y: y - 5, class: cls });
      g1.textContent = t1;
      const g2 = svgEl('text', { x: x1 + 8, y: y + 9, class: `${cls} mx-ellab2` });
      g2.textContent = t2;
      svg.append(g1, g2);
    };

    // top strip: the two price series
    const pT = 30, pB = 122;
    const pMax = Math.max(...mx.pa, ...mx.pb) * 1.06;
    const Yp = (v: number) => pB - (v / pMax) * (pB - pT);
    const priceTitle = svgEl('text', { x: x0, y: 16, class: 'mx-rtitle' });
    priceTitle.textContent = narrow
      ? `${mx.item.toLowerCase()}, ₹ per kg — the two inputs`
      : `${mx.item.toLowerCase()}, ₹ per kg — the two inputs, as the price monitors recorded them`;
    svg.appendChild(priceTitle);
    const paPath = svgEl('path', { d: lineOf(mx.pa, Yp), class: 'mx-pa' }) as SVGPathElement;
    const pbPath = svgEl('path', { d: lineOf(mx.pb, Yp), class: 'mx-pb' }) as SVGPathElement;
    svg.append(paPath, pbPath);
    // dodge the two price labels apart if the series end close together
    let yA = Yp(mx.pa[n - 1]), yB = Yp(mx.pb[n - 1]);
    if (Math.abs(yA - yB) < 26) { const mid = (yA + yB) / 2; yA = mid + (yA <= yB ? -13 : 13); yB = mid + (yA <= yB ? 13 : -13); }
    endLab(yA, 'mx-plab', mx.a, `₹${mx.pa[n - 1].toFixed(2)}`);
    endLab(yB, 'mx-plab', mx.b, `₹${mx.pb[n - 1].toFixed(2)}`);

    // bottom strip: the two chained indices
    const iT = 172, iB = 326;
    const iLo = Math.min(80, Math.floor(Math.min(...mx.jevons) / 10) * 10);
    const iHi = Math.max(...mx.carli) * 1.03;
    const Yi = (v: number) => iB - ((v - iLo) / (iHi - iLo)) * (iB - iT);
    const idxTitle = svgEl('text', { x: x0, y: 148, class: 'mx-rtitle' });
    idxTitle.textContent = narrow
      ? 'chained into an index (start = 100)'
      : 'the same months, chained into an index (start = 100)';
    svg.appendChild(idxTitle);
    const method = svgEl('text', { x: x0, y: 162, class: 'mx-rtitle2' });
    method.textContent = narrow
      ? 'monthly changes, made one step, chained'
      : 'each month the two states’ changes become one step, added or multiplied; every step is multiplied onto its chain';
    svg.appendChild(method);
    svg.appendChild(svgEl('line', { x1: x0, y1: Yi(100), x2: x1, y2: Yi(100), class: 'mx-base' }));
    const baseLab = svgEl('text', { x: x0 + 2, y: Yi(100) - 5, class: 'mx-ticklab' });
    baseLab.textContent = '100';
    svg.appendChild(baseLab);
    // the wedge between the two chains: pure formula artefact, shaded
    let wedge = `M ${X(0)} ${Yi(100)}`;
    for (let k = 0; k < n; k++) wedge += ` L ${X(k).toFixed(1)} ${Yi(mx.carli[k]).toFixed(1)}`;
    for (let k = n - 1; k >= 0; k--) wedge += ` L ${X(k).toFixed(1)} ${Yi(mx.jevons[k]).toFixed(1)}`;
    svg.appendChild(svgEl('path', { d: wedge + ' Z', class: 'mx-wedge' }));
    const carliP = svgEl('path', { d: lineOf(mx.carli, Yi), class: 'mx-carli' }) as SVGPathElement;
    const jevP = svgEl('path', { d: lineOf(mx.jevons, Yi), class: 'mx-jev' }) as SVGPathElement;
    svg.append(carliP, jevP);
    endLab(Yi(mx.carli[n - 1]), 'mx-ilab mx-ilab-am', fmtPct(mx.carli[n - 1] - 100), 'add-and-divide');
    endLab(Yi(mx.jevons[n - 1]), 'mx-ilab mx-ilab-gm', fmtPct(mx.jevons[n - 1] - 100), 'multiply-and-root');
    // june ticks along the shared x
    mx.months.forEach((m, k) => {
      if (!m.endsWith('-06')) return;
      svg.appendChild(svgEl('line', { x1: X(k), y1: iB, x2: X(k), y2: iB + 4, class: 'mx-tick' }));
      // the first label anchors from the left so it never clips offscreen;
      // narrow drops the month word so neighbouring junes stay apart
      const t = svgEl('text', { x: k === 0 ? x0 : X(k), y: iB + 17, class: 'mx-ticklab', 'text-anchor': k === 0 ? 'start' : 'middle' });
      t.textContent = narrow ? `'${m.slice(2, 4)}` : `Jun ${m.slice(2, 4)}`;
      svg.appendChild(t);
    });

    if (played) {
      svg.classList.add('done');
      return;
    }
    const paths = [paPath, pbPath, carliP, jevP];
    requestAnimationFrame(() => {
      if (!carliP.isConnected) return; // superseded by a newer build
      for (const p of paths) {
        const L = p.getTotalLength();
        p.style.strokeDasharray = String(L);
        p.style.strokeDashoffset = String(L);
      }
      const o = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        o.disconnect();
        if (played) return;
        played = true;
        paPath.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.33, 0.2, 0.15, 1)';
        pbPath.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.33, 0.2, 0.15, 1) 150ms';
        carliP.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(0.33, 0.25, 0.12, 1) 1100ms';
        jevP.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(0.33, 0.25, 0.12, 1) 1100ms';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          paths.forEach((p) => { p.style.strokeDashoffset = '0'; });
          setTimeout(() => svg.classList.add('done'), 3500);
        }));
      }, { threshold: 0.35 });
      io = o;
      o.observe(svg);
    });
  };

  let wD = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wD) { wD = w; build(); }
  }).observe(area);

  return { refresh() {} };
}


// ---- the semicircle proof (inside the methodology fold) ------------------------
// AM ≥ GM as a drawing the reader can push. The two moves lie end to end
// under a semicircle whose span is fixed at 2.5 (×2.0 + ×0.5 by default), so
// the added average — half the span, the radius — cannot move. The vertical
// at the joint is √(a·b), the multiplied average; drag the joint and it
// reaches the radius only at the centre, where the two moves are equal.
// Fixed viewBox (it scales as an image); everything recomputed from the
// geometry, no numbers staged.

export function initProof(fig: HTMLElement | null) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.pf-area')!;
  const W = 520, H = 258, y0 = 215, xL = 60, xR = 460;
  const cx = (xL + xR) / 2, R = (xR - xL) / 2;
  const UNIT = (xR - xL) / 2.5; // px per ×1.0 of move

  const svg = svgEl('svg', {
    class: 'pf-svg', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': 'Semicircle proof that the added average is never below the multiplied one',
  }) as SVGSVGElement;
  area.appendChild(svg);
  const add = (tag: string, attrs: Record<string, string | number>) => {
    const n = svgEl(tag, attrs); svg.appendChild(n); return n;
  };
  add('line', { x1: xL, y1: y0, x2: xR, y2: y0, class: 'pf-base' });
  add('path', { d: `M ${xL} ${y0} A ${R} ${R} 0 0 1 ${xR} ${y0}`, class: 'pf-arc' });
  const tri = add('path', { class: 'pf-tri' });
  add('line', { x1: cx, y1: y0, x2: cx, y2: y0 - R, class: 'pf-am' });
  const chord = add('line', { class: 'pf-gm' });
  [xL, xR].forEach((x) => add('line', { x1: x, y1: y0 - 4, x2: x, y2: y0 + 4, class: 'pf-tick' }));
  const labA = add('text', { y: y0 + 22, class: 'pf-lab', 'text-anchor': 'middle' });
  const labB = add('text', { y: y0 + 22, class: 'pf-lab', 'text-anchor': 'middle' });
  const labAm = add('text', { x: cx - 8, y: y0 - R + 15, class: 'pf-lab pf-lab-am', 'text-anchor': 'end' });
  labAm.textContent = 'added: 1.25, the radius';
  const labGm = add('text', { class: 'pf-lab pf-lab-gm' });
  const knob = add('circle', { cy: y0, r: 9, class: 'pf-knob' });

  let jx = xL + 2.0 * UNIT; // the joint; default splits the span ×2.0 / ×0.5
  const render = () => {
    const a = (jx - xL) / UNIT, b = (xR - jx) / UNIT;
    const gm = Math.sqrt(a * b);
    const hy = y0 - Math.sqrt(Math.max(0, R * R - (jx - cx) ** 2));
    chord.setAttribute('x1', jx.toFixed(1)); chord.setAttribute('y1', String(y0));
    chord.setAttribute('x2', jx.toFixed(1)); chord.setAttribute('y2', hy.toFixed(1));
    tri.setAttribute('d', `M ${xL} ${y0} L ${jx.toFixed(1)} ${hy.toFixed(1)} L ${xR} ${y0}`);
    knob.setAttribute('cx', jx.toFixed(1));
    labA.setAttribute('x', ((xL + jx) / 2).toFixed(1));
    labA.textContent = `×${a.toFixed(2)}`;
    labB.setAttribute('x', ((jx + xR) / 2).toFixed(1));
    labB.textContent = `×${b.toFixed(2)}`;
    const gmRight = jx < cx + 40;
    labGm.setAttribute('x', (jx + (gmRight ? 9 : -9)).toFixed(1));
    labGm.setAttribute('text-anchor', gmRight ? 'start' : 'end');
    labGm.setAttribute('y', String(Math.max(22, hy - 9)));
    labGm.textContent = `multiplied: ${gm.toFixed(2)}`;
  };
  render();

  knob.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    (knob as SVGGraphicsElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
    const rect = svg.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = ((ev.clientX - rect.left) / rect.width) * W;
      jx = Math.max(xL + 14, Math.min(xR - 14, x));
      render();
    };
    const up = () => {
      knob.removeEventListener('pointermove', move);
      knob.removeEventListener('pointerup', up);
      knob.removeEventListener('pointercancel', up);
    };
    knob.addEventListener('pointermove', move);
    knob.addEventListener('pointerup', up);
    knob.addEventListener('pointercancel', up);
  });

  return { refresh() {} };
}


// ---- the funnel (beat 7) -------------------------------------------------------
// The aggregation tree, climbed rather than broken open: 358 items at the wide
// bottom folding through sub-classes, classes, groups and divisions into the
// one headline at the top. Every cell is a real node carrying a real weight, so
// the strip widths ARE the ₹100 dividing — house rent is a tenth of the bottom
// row, tomato is a sliver.
//
// Two reveals, in the order the arithmetic happens:
//   1. the hundred — cells sized by their share, each floor in its own hue
//   2. the change  — the same cells re-inked by their year-on-year, so the
//      month's heat shows up against the weights that decide what it costs
//
// Any cell can be selected, not just the tomato's: clicking re-threads the
// funnel to that node's lineage and every floor's label follows. Below the
// group row the cells get too thin to aim at reliably, so a hover tooltip does
// the identifying work and the click is a bonus rather than the only way in.

export type PyramidNode = {
  code: string; parent: string | null; level: string; name: string;
  weight: number; idx: number | null; infl: number | null;
  // MoSPI flags imputation at ITEM level and nowhere above it, so the funnel is
  // the only figure on the site that can show one. Optional: absent from older
  // builds of the dataset, in which case nothing is marked and nothing is said.
  imputed?: boolean;
};

export type PyramidData = {
  asOf: string;
  levels: { key: string; label: string; n: number }[];
  tree?: PyramidNode[];
  path: { level: string; name: string; infl: number; w?: number }[];
};

const SHORT_NAMES: Record<string, string> = {
  'Vegetables, tubers, plantains, cooking bananas and pulses': 'Vegetables, tubers and pulses',
  'Fruit-bearing vegetables, fresh or chilled': 'Fruit-bearing vegetables',
};

// top-to-bottom, the way the funnel is drawn: the headline narrowest, the
// items widest. Keys match the level values the build script emits.
const FN_LEVELS = ['general', 'division', 'group', 'class', 'subclass', 'item'];
const FN_LABEL: Record<string, string> = {
  general: 'the headline', division: 'division', group: 'group',
  class: 'class', subclass: 'sub-class', item: 'item',
};
// 'class' + 's' is 'classs'; the floor counts need real plurals.
const FN_PLURAL: Record<string, string> = {
  division: 'divisions', group: 'groups', class: 'classes',
  subclass: 'sub-classes', item: 'items',
};
const TOMATO = '01.1.7.2.1.01';

/**
 * `opts.stageButton: false` drops the widget's own hundred/change button and
 * `opts.resetButton: false` its way back to the tomato. The explore board
 * mounts this funnel as a desk and carries both on the panel bar — the ink
 * switch and an item picker that reaches every one of the 358 strands, not
 * just the one the read happens to be about — so the figure would otherwise
 * offer the same choices twice, one of them weaker. `setStage` and `select` on
 * the returned handle are how a host drives it, and `opts.onSelect` is how it
 * hears the reader clicking a cell. The read passes no options and is
 * unchanged.
 */
export function initPyramid(
  fig: HTMLElement | null,
  py: PyramidData,
  opts: {
    stageButton?: boolean;
    resetButton?: boolean;
    onSelect?: (code: string, level: string) => void;
  } = {},
) {
  const noop = { refresh() {}, setStage(_s: number) {}, select(_c: string) { return null; } };
  if (!fig || !py) return noop;
  const area = fig.querySelector<HTMLElement>('.py-area')!;

  const nodes = py.tree ?? [];
  if (!nodes.length) return noop;

  const byCode = new Map(nodes.map((n) => [n.code, n]));
  // one row per floor, each sorted by code so a parent's children sit together
  // and a lineage reads as a single column rather than a zigzag
  const rows = FN_LEVELS.map((lvl) =>
    nodes.filter((n) => n.level === lvl).sort((a, b) => a.code.localeCompare(b.code)));
  const N = rows.length;
  const rowOf = new Map<string, number>();
  rows.forEach((r, j) => r.forEach((n) => rowOf.set(n.code, j)));

  // The change reveal's ink scale, on percentiles rather than the extremes.
  // A single item at +133% would push every ordinary cell down to the faintest
  // end of the ramp and the month would look uniformly flat; the 5th and 95th
  // give the bulk of the tree the full span, and the outliers simply saturate.
  const nImputed = nodes.filter((n) => n.imputed).length;
  const infls = nodes.filter((n) => n.infl != null)
    .map((n) => n.infl as number).sort((a, b) => a - b);
  const pct5 = infls[Math.floor(infls.length * 0.05)] ?? 0;
  const pct95 = infls[Math.floor(infls.length * 0.95)] ?? 1;
  const inkSpan = Math.max(pct95 - pct5, 1);

  const wrap = el('div', 'fn-wrap');
  const svg = svgEl('svg', { class: 'fn-svg' }) as SVGSVGElement;
  const tip = el('div', 'fn-tip'); tip.setAttribute('aria-hidden', 'true');
  wrap.append(svg, tip);
  const cap = el('p', 'fn-cap'); cap.setAttribute('aria-live', 'polite');
  const btns = el('div', 'fn-btns');
  const btn = el('button', 'fn-btn') as HTMLButtonElement; btn.type = 'button';
  const reset = el('button', 'fn-btn fn-reset', 'Back to the tomato') as HTMLButtonElement;
  reset.type = 'button';
  if (opts.stageButton !== false) btns.append(btn);
  if (opts.resetButton !== false) btns.append(reset);
  area.append(wrap, cap, btns);

  let stage = 0;              // 0 = the hundred, 1 = the change
  let sel = byCode.has(TOMATO) ? TOMATO : rows[N - 1][0].code;

  /** the selected node's ancestors, one per row, top row first */
  const lineage = () => {
    const out: (PyramidNode | null)[] = Array(N).fill(null);
    let n: PyramidNode | undefined = byCode.get(sel);
    while (n) {
      const j = rowOf.get(n.code);
      if (j != null) out[j] = n;
      n = n.parent ? byCode.get(n.parent) : undefined;
    }
    return out;
  };

  const short = (s: string) => SHORT_NAMES[s] ?? s;
  const pct = (v: number | null) => (v == null ? '—' : fmtPct(v, 2));

  // geometry, recomputed per draw so a resize is just another draw
  let layout: { x: number; w: number; y: number; h: number; node: PyramidNode }[][] = [];

  const draw = () => {
    const W = area.clientWidth;
    if (!W) return;
    const narrow = W < 560;
    // the gap has to clear a two-part label (the number and the name) sitting
    // under each strip, not just separate the strips: at 34px the descenders
    // were running into the band below
    const bandH = narrow ? 22 : 26;
    const rowGap = narrow ? 40 : 44;
    const padT = 18;
    const H = padT + N * (bandH + rowGap) - rowGap + 26;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = `${H}px`;
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    const widthF = [0.30, 0.45, 0.6, 0.74, 0.87, 0.98];
    const line = lineage();
    layout = [];

    rows.forEach((row, j) => {
      const bw = widthF[j] * W;
      const x0 = (W - bw) / 2;
      const y = padT + j * (bandH + rowGap);
      const g = svgEl('g', { class: `fn-row fn-row-${FN_LEVELS[j]}` });
      // widths are shares of the hundred; a gap only where the cells can spare
      // it, and a floor for the slivers so nothing vanishes entirely
      const gap = row.length > 60 ? 0 : row.length > 20 ? 1 : 2;
      const usable = bw - (row.length - 1) * gap;
      // A share of the hundred can be a hundredth of a pixel, so the slivers
      // take a visible floor — but the floor has to be PAID FOR, or the item
      // row draws 12% wider than its band and the widths stop being shares at
      // all. The cells above the floor give up the difference pro rata, which
      // keeps the row exactly as wide as its band.
      const FLOOR = 0.7;
      const raw = row.map((n) => (n.weight / 100) * usable);
      let owed = 0, spare = 0;
      for (const r of raw) { if (r < FLOOR) owed += FLOOR - r; else spare += r; }
      const shrink = spare > 0 ? Math.max(0, (spare - owed) / spare) : 1;
      const cells: typeof layout[0] = [];
      let cx = x0;
      row.forEach((n, k) => {
        const cw = raw[k] < FLOOR ? FLOOR : raw[k] * shrink;
        cells.push({ x: cx, w: cw, y, h: bandH, node: n });
        const on = line[j]?.code === n.code;
        const rect = svgEl('rect', {
          x: cx.toFixed(2), y, width: cw.toFixed(2), height: bandH,
          rx: row.length <= 12 ? 2 : 0,
          class: 'fn-cell' + (on ? ' on' : ''),
        }) as SVGRectElement;
        // the change reveal re-inks by year-on-year; the hundred keeps every
        // cell at one strength so width is the only thing being read
        const heat = stage === 1 && n.infl != null
          ? 0.16 + 0.84 * Math.max(0, Math.min(1, (n.infl - pct5) / inkSpan))
          : 0.62;
        rect.style.opacity = String(on ? Math.max(heat, 0.92) : heat);
        // An imputed price is the source's own estimate, so the cell keeps its
        // width and its ink and takes a dashed outline. Set inline rather than
        // by class: this widget is mounted by both the read and the explore
        // board, which style .fn-cell from two different stylesheets.
        if (n.imputed) {
          rect.style.stroke = 'currentColor';
          rect.style.strokeWidth = '1';
          rect.style.strokeDasharray = '2 2';
        }
        rect.dataset.code = n.code;
        g.appendChild(rect);
        cx += cw + gap;
      });
      layout.push(cells);

      // the floor's name and count, above the strip's right end
      const count = svgEl('text', { x: x0 + bw, y: y - 6, class: 'fn-count', 'text-anchor': 'end' });
      count.textContent = j === 0
        ? 'the headline'
        : `${row.length} ${row.length > 1 ? FN_PLURAL[FN_LEVELS[j]] : FN_LABEL[FN_LEVELS[j]]}`;
      g.appendChild(count);

      // the selected node's own numbers, under its floor
      const me = line[j];
      if (me) {
        const num = svgEl('text', { x: x0, y: y + bandH + 16, class: 'fn-num' });
        num.textContent = stage === 1
          ? `${pct(me.infl)} on the year`
          : `₹${me.weight.toFixed(me.weight < 1 ? 2 : 1)} of 100`;
        const nm = svgEl('text', { x: x0, y: y + bandH + 16, class: 'fn-name' });
        nm.textContent = short(me.name);
        g.append(num, nm);
        requestAnimationFrame(() => {
          try {
            const numW = (num as SVGTextElement).getComputedTextLength();
            // The pair sits under the LEFT end of its floor, and the upper
            // floors are narrow, so on a phone a name like "Fruit-bearing
            // vegetables, fresh or chilled" ran off the drawing entirely. Slide
            // the pair left until it fits, then trim the name a character at a
            // time until it does — the number is never trimmed, because it is
            // the reading and the name is only what it is a reading of.
            const nmEl = nm as SVGTextElement;
            const full = nmEl.textContent ?? '';
            const fits = () => numW + 7 + nmEl.getComputedTextLength() <= W - 8;
            for (let cut = full.length; !fits() && cut > 6; cut -= 2) {
              nmEl.textContent = full.slice(0, cut) + '…';
            }
            const left = Math.max(4, Math.min(x0, W - 8 - numW - 7 - nmEl.getComputedTextLength()));
            num.setAttribute('x', String(left));
            nmEl.setAttribute('x', String(left + numW + 7));
          } catch { /* not laid out yet */ }
        });
      }
      svg.appendChild(g);
    });

    // threads join each selected cell to its parent one floor up
    for (let j = N - 1; j > 0; j--) {
      const a = line[j], b = line[j - 1];
      if (!a || !b) continue;
      const ca = layout[j].find((c) => c.node.code === a.code);
      const cb = layout[j - 1].find((c) => c.node.code === b.code);
      if (!ca || !cb) continue;
      const xA = ca.x + ca.w / 2, yA = ca.y;
      const xB = cb.x + cb.w / 2, yB = cb.y + cb.h;
      // Under the floors, not over them. A thread only ever spans the gap
      // between two floors, which is exactly where the selected node's number
      // and name are printed, so drawn last it ruled a line straight through
      // its own caption.
      svg.insertBefore(svgEl('path', {
        d: `M ${xA.toFixed(1)} ${yA} C ${xA.toFixed(1)} ${((yA + yB) / 2).toFixed(1)}, `
          + `${xB.toFixed(1)} ${((yA + yB) / 2).toFixed(1)}, ${xB.toFixed(1)} ${yB}`,
        class: `fn-thread fn-thread-${FN_LEVELS[j]}`,
      }), svg.firstChild);
    }

    // the button names the gesture, so the caption has to name the VARIABLE —
    // bolded, because which of the two things you are looking at (a share or a
    // change) is the one fact the figure cannot show you by itself
    const leaf = byCode.get(sel);
    cap.innerHTML = (stage === 0
      ? `<strong>Cell width is its share of the ₹100.</strong> `
        + `${short(leaf?.name ?? '')}: ₹${(leaf?.weight ?? 0).toFixed(2)}.`
      : `<strong>Darker cells rose faster this year.</strong> `
        + `${short(leaf?.name ?? '')}: ${pct(leaf?.infl ?? null)} on the year.`)
      // The key earns its line only when the month actually contains one.
      + (nImputed ? ` <span class="fn-cap-key">Dashed outlines: ${nImputed} `
        + `item${nImputed > 1 ? 's whose prices were' : ' whose price was'} imputed by the source.</span>` : '');
    btn.textContent = stage === 0 ? 'Paint on the year' : 'Back to the hundred';
    reset.disabled = sel === TOMATO;
  };

  // ---- picking ----
  // hit-testing against the drawn layout rather than per-rect listeners: 668
  // cells is 668 listeners otherwise, and the thinnest are under a pixel wide
  const at = (ev: PointerEvent | MouseEvent) => {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sx = (ev.clientX - r.left) * (vb.width / r.width);
    const sy = (ev.clientY - r.top) * (vb.height / r.height);
    for (const row of layout) {
      if (!row.length) continue;
      const { y, h } = row[0];
      if (sy < y - 3 || sy > y + h + 3) continue;
      let best: typeof row[0] | null = null, bestD = Infinity;
      for (const c of row) {
        const d = sx < c.x ? c.x - sx : sx > c.x + c.w ? sx - (c.x + c.w) : 0;
        if (d < bestD) { bestD = d; best = c; }
        if (d === 0) break;
      }
      // a generous slop so the sub-pixel cells are still reachable
      return best && bestD <= 4 ? best : null;
    }
    return null;
  };

  svg.addEventListener('pointermove', (ev) => {
    const hit = at(ev);
    if (!hit) { tip.classList.remove('show'); return; }
    const n = hit.node;
    tip.innerHTML =
      `<span class="fn-tip-name">${short(n.name)}</span>`
      + `<span class="fn-tip-lvl">${FN_LABEL[n.level]}</span>`
      + `<span class="fn-tip-row">₹${n.weight.toFixed(n.weight < 1 ? 3 : 2)} of 100</span>`
      + `<span class="fn-tip-row">index ${n.idx == null ? '—' : n.idx.toFixed(2)}`
      + ` &middot; ${pct(n.infl)} on the year</span>`
      + (n.imputed ? `<span class="fn-tip-row">price imputed by the source</span>` : '');
    tip.classList.add('show');
    const r = area.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.max(4, Math.min(r.width - tw - 4, ev.clientX - r.left - tw / 2))}px`;
    // a finger covers what it is pointing at, so touch reads above the contact
    // point and a mouse cursor, which covers nothing, reads below it
    const touch = 'pointerType' in ev && ev.pointerType === 'touch';
    tip.style.top = touch
      ? `${ev.clientY - r.top - tip.offsetHeight - 18}px`
      : `${ev.clientY - r.top + 16}px`;
  });
  svg.addEventListener('pointerleave', () => tip.classList.remove('show'));
  svg.addEventListener('click', (ev) => {
    const hit = at(ev);
    if (hit) { sel = hit.node.code; draw(); opts.onSelect?.(sel, hit.node.level); }
  });

  btn.addEventListener('click', () => { stage = stage === 0 ? 1 : 0; draw(); });
  reset.addEventListener('click', () => { sel = TOMATO; draw(); });

  let wF = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wF) { wF = w; draw(); }
  }).observe(area);

  return {
    refresh() { draw(); },
    /** 0 = width is the share of the hundred, 1 = ink is the year-on-year. */
    setStage(s: number) { stage = s ? 1 : 0; draw(); },
    /**
     * Thread the funnel to a node by code, for a host driving it from its own
     * control. A code the tree does not carry is ignored rather than blanking
     * the figure. Returns the code actually selected, or null if nothing moved.
     */
    select(code: string) {
      if (!byCode.has(code) || sel === code) return null;
      sel = code;
      draw();
      return sel;
    },
  };
}


// ---- the balance beam (beat 7) -------------------------------------------------
// A weighted average as physics: the twelve divisions sit on a beam at their
// own year-on-year rate, sized by their share of the ₹100, and the fulcrum —
// the point where the beam balances — is the headline. Discs drag along the
// beam (the fulcrum answers from the true weights), stack with gravity so a
// pile whose base moves away falls back to the beam, and show their division
// name while active. One button doubles tomato's climb inside the food disc.

export function initBeam(
  fig: HTMLElement | null,
  yb: { headline: number | null; divisions: { name: string; w: number; infl: number; wv?: number }[] },
  tomato: { infl: number; w?: number },
) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.bm-area')!;

  const svg = svgEl('svg', { class: 'bm-svg' }) as SVGSVGElement;
  area.appendChild(svg);
  const cap = el('p', 'bm-cap');
  const CAP0 = 'The beam balances at the headline. Drag a disc along the beam, or tap it for its numbers.';
  cap.textContent = CAP0;
  const btns = el('div', 'bm-btns');
  const btn = el('button', 'bm-btn') as HTMLButtonElement;
  btn.type = 'button';
  const resetB = el('button', 'bm-btn', 'Put everything back') as HTMLButtonElement;
  resetB.type = 'button';
  btns.append(btn, resetB);
  area.append(cap, btns);

  const infls = yb.divisions.map((d) => d.infl);
  const lo = Math.min(0, Math.floor(Math.min(...infls))) - 0.4;
  const hi = Math.max(...infls) + 1.2;
  const h0 = yb.headline ?? 0;
  const tomW = tomato.w ?? 0;
  // The lever arm of each disc. A year-on-year rate is a ratio of index
  // levels, so the exact weight on a division's RATE is its share of what the
  // basket cost a year ago (`wv`), not its share of the base-year ₹100 (`w`).
  // The two differ by a few paise — food 36.75 against 36.51 — but only the
  // first makes the fulcrum move exactly as the published number would. Disc
  // size stays on `w`, the share the prose quotes.
  const lever = (d: { w: number; wv?: number }) => d.wv ?? d.w;
  // the item is the tomato, but it is not named until "Down the funnel" — the
  // reader meets the hierarchy there and can retro-fit what they played with
  // here. Naming it now would be a forward reference to machinery they have
  // not been shown.
  const BTN0 = `Spike one vegetable inside food (${fmtPct(tomato.infl, 1)} → ${fmtPct(tomato.infl * 2, 1)})`;

  // rebuilt at the container's width; the spike toggle and tap selection
  // reset on rebuild (a resize is rare and the reset state is the honest one)
  const build = () => {
    const w = area.clientWidth;
    if (!w) return;
    const narrow = w < 560;
    const H = 218, beamY = 158;
    const x0 = narrow ? 30 : 42, x1 = w - x0;
    const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    for (let v = Math.ceil(lo); v <= hi; v += narrow ? 4 : 2) {
      svg.appendChild(svgEl('line', { x1: X(v), y1: beamY, x2: X(v), y2: beamY + 5, class: 'mx-tick' }));
      if (Math.abs(X(v) - X(h0)) < 26) continue; // the fulcrum sits here; its own label carries the value
      const t = svgEl('text', { x: X(v), y: beamY + 18, class: 'mx-ticklab', 'text-anchor': 'middle' });
      t.textContent = fmtPct(v, 0);
      svg.appendChild(t);
    }
    svg.appendChild(svgEl('line', { x1: x0 - 6, y1: beamY, x2: x1 + 6, y2: beamY, class: 'bm-beam' }));

    // discs: radius by √weight; vertical positions come from layout() below,
    // which restacks with gravity every time anything moves
    type Disc = { d: { name: string; w: number; infl: number }; r: number; g: SVGElement };
    const placed: Disc[] = [];
    const sorted = [...yb.divisions].sort((a, b) => b.w - a.w);
    const rk = narrow ? 1.75 : 2.35;
    for (const d of sorted) {
      const r = 3.4 + Math.sqrt(d.w) * rk;
      const g = svgEl('g', { class: 'bm-disc-g' });
      g.appendChild(svgEl('circle', { cx: 0, cy: 0, r, class: 'bm-disc' }));
      if (/^Food/.test(d.name)) {
        // the prose leans on "food, the heaviest disc" — name the anchor
        const t = svgEl('text', { x: 0, y: 3.5, class: 'bm-disclab', 'text-anchor': 'middle' });
        t.textContent = 'food';
        g.appendChild(t);
      }
      svg.appendChild(g);
      placed.push({ d, r, g });
    }

    // fulcrum at the headline; its label clamps inside the drawing
    const clamp = (x: number) => Math.max(narrow ? 78 : 92, Math.min(w - (narrow ? 78 : 92), x));
    const ful = svgEl('g', { class: 'bm-ful-g' });
    ful.appendChild(svgEl('path', { d: 'M 0 2 L 9 20 L -9 20 Z', class: 'bm-ful' }));
    (ful as unknown as SVGGElement).style.transform = `translate(${X(h0)}px, ${beamY}px)`;
    svg.appendChild(ful);
    const fulLab = svgEl('text', { x: clamp(X(h0)), y: beamY + 36, class: 'bm-fullab', 'text-anchor': 'middle' });
    fulLab.textContent = `${fmtPct(h0, 2)} · the headline`;
    svg.appendChild(fulLab);
    const fulDelta = svgEl('text', { x: clamp(X(h0)), y: beamY + 52, class: 'bm-fuldelta', 'text-anchor': 'middle' });
    svg.appendChild(fulDelta);

    // each disc carries a live rate the reader can drag it to; the fulcrum
    // is recomputed from the true weights on every change, so the physics
    // is the actual weighted-average arithmetic, not a staging of it
    const cur = new Map<Disc, number>();
    placed.forEach((p) => cur.set(p, p.d.infl));
    let spiked = false;
    const food = placed.find((p) => /^Food/.test(p.d.name));
    // the fulcrum: the published headline, plus what the reader's changes are
    // worth at each disc's lever. The anchor is the ministry's own number, so
    // nothing here is a reconstruction of it.
    const headNow = () => {
      let h = h0 + (spiked ? (tomW * tomato.infl) / 100 : 0);
      for (const p of placed) h += (lever(p.d) * (cur.get(p)! - p.d.infl)) / 100;
      return h;
    };
    const pristine = () => !spiked && placed.every((p) => cur.get(p) === p.d.infl);
    const updateFul = () => {
      const h = headNow();
      (ful as unknown as SVGGElement).style.transform = `translate(${X(h)}px, ${beamY}px)`;
      fulLab.setAttribute('x', String(clamp(X(h))));
      fulLab.textContent = `${fmtPct(h, 2)} · the headline`;
      fulDelta.setAttribute('x', String(clamp(X(h))));
      const dh = h - h0;
      fulDelta.textContent = Math.abs(dh) >= 0.005 ? `moved ${dh > 0 ? '+' : '−'}${Math.abs(dh).toFixed(2)} points` : '';
      resetB.disabled = pristine();
    };

    // a disc's shown x: its live rate, plus the visual spike offset on food
    const xOf = (p: Disc) => {
      let v = cur.get(p)!;
      if (spiked && p === food) v += (tomW * tomato.infl) / p.d.w;
      return X(v);
    };
    // gravity: every disc falls until it rests on the beam or on a disc
    // already settled below it (heavier discs settle first, so they hold
    // the beam and the light ones land on top). A lifted disc is skipped,
    // so whatever was stacked on it drops the moment it moves away.
    const yOf = new Map<Disc, number>();
    const layout = (lifted?: Disc | null) => {
      const settled: { x: number; y: number; r: number }[] = [];
      for (const p of placed) {
        if (p === lifted) continue;
        const x = xOf(p);
        let y = beamY - p.r - 1;
        let clash = true;
        while (clash) {
          clash = settled.some((q) => (q.x - x) ** 2 + (q.y - y) ** 2 < (q.r + p.r + 1.5) ** 2);
          if (clash) y -= 2;
        }
        settled.push({ x, y, r: p.r });
        yOf.set(p, y);
        (p.g as unknown as SVGGElement).style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    // the active disc's division name, shown in the drawing itself
    const nameLab = svgEl('text', { class: 'bm-namelab', 'text-anchor': 'middle' });
    svg.appendChild(nameLab);
    const shortDiv = (n: string) => {
      let s = n.split(',')[0];
      if (s.length > 16) s = s.split(' and ')[0];
      return s.toLowerCase();
    };
    // food carries its name inside the disc at all times, so the floating
    // label would only print it twice; the other eleven need it
    const showName = (p: Disc | null, atX?: number, atY?: number) => {
      if (!p || p === food) { nameLab.textContent = ''; return; }
      const x = atX ?? xOf(p);
      nameLab.setAttribute('x', String(Math.max(36, Math.min(w - 36, x))));
      nameLab.setAttribute('y', String(Math.max(12, (atY ?? yOf.get(p) ?? beamY) - p.r - 8)));
      nameLab.textContent = shortDiv(p.d.name);
    };

    let sel: Disc | null = null;
    const select = (p: Disc | null) => {
      sel = p;
      placed.forEach((q) => q.g.classList.toggle('on', q === p));
      showName(p);
      cap.textContent = p
        ? `${p.d.name} — ₹${p.d.w.toFixed(2)} of the hundred, ${fmtPct(cur.get(p)!, 2)} on the year${cur.get(p) !== p.d.infl ? ` (really ${fmtPct(p.d.infl, 2)})` : ''}.`
        : CAP0;
    };

    // drag to move a disc's rate; a short press with no movement is a tap.
    //
    // The gesture is delegated to the SVG ROOT rather than bound to each disc.
    // WebKit ignores `touch-action` on SVG child elements and its pointer
    // capture on an inner <g> is unreliable, so a per-disc handler died the
    // moment iOS decided the swipe was a page gesture: taps worked, drags did
    // not. The root is an element whose `touch-action: pan-y` and pointer
    // capture both hold (vertical scrolling still passes through the figure,
    // horizontal movement is ours). It also fixes the aim — the lightest discs
    // are 11px across on a phone, well under a fingertip — by giving the press
    // to the nearest disc within reach instead of demanding a direct hit.
    const invX = (x: number) => lo + ((x - x0) / (x1 - x0)) * (hi - lo);
    const toSvg = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * w,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    };
    const nearest = (sx: number, sy: number) => {
      let best: Disc | null = null, bestGap = Infinity;
      for (const p of placed) {
        const gap = Math.hypot(sx - xOf(p), sy - (yOf.get(p) ?? beamY)) - p.r;
        if (gap < Math.max(9, 15 - p.r) && gap < bestGap) { bestGap = gap; best = p; }
      }
      return best;
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      const at = toSvg(e);
      const p = nearest(at.x, at.y);
      if (!p) { if (sel) select(null); return; }
      e.preventDefault();
      svg.setPointerCapture(e.pointerId);
      // the settle transition is for gravity and button-driven moves; a
      // drag must track the pointer directly
      (p.g as unknown as SVGGElement).style.transition = 'none';
      const grabDX = xOf(p) - at.x;   // grabbed off-centre stays off-centre
      const holdY = yOf.get(p)!;
      let moved = false;
      const move = (ev: PointerEvent) => {
        const mx = toSvg(ev).x;
        if (!moved && Math.abs(mx - at.x) < 4) return;
        moved = true;
        const v = Math.max(lo + 0.2, Math.min(hi - 0.6, invX(mx + grabDX)));
        cur.set(p, v);
        (p.g as unknown as SVGGElement).style.transform = `translate(${X(v)}px, ${holdY}px)`;
        layout(p); // everything that rested on it falls
        placed.forEach((q) => q.g.classList.toggle('on', q === p));
        showName(p, X(v), holdY);
        cap.textContent = `${p.d.name}, dragged to ${fmtPct(v, 2)} (really ${fmtPct(p.d.infl, 2)}) — ₹${p.d.w.toFixed(2)} of the hundred moves the balance point.`;
        updateFul();
      };
      const up = () => {
        svg.removeEventListener('pointermove', move);
        svg.removeEventListener('pointerup', up);
        svg.removeEventListener('pointercancel', up);
        (p.g as unknown as SVGGElement).style.transition = '';
        if (!moved) select(sel === p ? null : p);
        else { sel = p; layout(); showName(p); }
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    // the tomato toggle: fold a doubled tomato climb into the food disc and
    // let the fulcrum answer. Deltas computed from the real weights; the
    // spike lives in headNow()'s own term, the food disc only shows it.
    btn.textContent = BTN0;
    btn.onclick = () => {
      spiked = !spiked;
      layout();
      btn.textContent = spiked ? 'Put the vegetable back' : BTN0;
      if (spiked) select(null);
      updateFul();
    };

    resetB.onclick = () => {
      spiked = false;
      btn.textContent = BTN0;
      placed.forEach((p) => cur.set(p, p.d.infl));
      layout();
      select(null);
      updateFul();
    };

    layout();
    updateFul();
  };

  let wBm = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wBm) { wBm = w; build(); }
  }).observe(area);

  return { refresh() {} };
}

// ---- the gap (beat 1) ----------------------------------------------------------
// Education in Delhi against the all-India average, month by month, as a
// dumbbell strip: a saffron dot floating over an ink dot with the gap shaded
// between them. Plain YoY percent — the unit the read is setting out to
// explain — and no line connects the months, so there is no slope to
// misread; the eye gets only the distance, repeated all year.

export type GapMonth = {
  m: string; headlineIdx: number | null; eduIdx: number | null;
  headline: number | null; edu: number | null;
};
export type GapData = { months: GapMonth[] };

export function initGap(fig: HTMLElement | null, gap: GapData, deps: Deps) {
  if (!fig) return { refresh() {} };
  const { echarts, tokens } = deps;
  const area = fig.querySelector<HTMLElement>('.gap-area')!;
  const chartDiv = el('div', 'gap-chart');
  chartDiv.style.height = '300px';
  area.append(chartDiv);

  const inst = echarts.init(chartDiv);
  new ResizeObserver(() => inst.resize()).observe(chartDiv);

  // only months where both YoY figures exist (Jan 2026 onward)
  const rows = gap.months.filter((r) => r.headline != null && r.edu != null);

  // this figure runs BEFORE the prose christens the word "headline", so the
  // all-India series is named for what the reader has been told so far.
  // Entity hues (the read's system): saffron = the headline number, teal = the
  // reader's own numbers — here education in Delhi, the "your life" stand-in.
  const AIA = 'the all-India average';

  const render = () => {
    const t = tokens();
    const c1Text = cssVar('--tsoi-color-chart-1-text') || t.c1;
    const c2 = cssVar('--tsoi-color-chart-2') || '#2A8A84';
    const c2Text = cssVar('--tsoi-color-chart-2-text') || c2;
    const narrow = (area.clientWidth || 640) < 560;
    const lastI = rows.length - 1;
    const yMax = Math.ceil(Math.max(...rows.map((r) => r.edu!)) + 1.5);
    const ptLabel = (name: string, v: number, show: boolean, color: string, above: boolean) => ({
      show,
      formatter: `${name}\n+${v.toFixed(2)}%`,
      position: above ? ('top' as const) : ('bottom' as const),
      align: 'center' as const,
      color,
      fontFamily: t.mono,
      fontSize: 11,
      lineHeight: 15,
    });
    inst.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: t.mono, color: t.subtle },
      legend: narrow ? {
        top: 0, left: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, selectedMode: false,
        data: ['education in Delhi', AIA],
        textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 11 },
      } : { show: false },
      grid: { left: 8, right: narrow ? 12 : 76, top: narrow ? 36 : 30, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        // on a phone the box is nearly as wide as the chart and was hanging
        // off the left edge
        confine: true,
        formatter: (ps: any) => {
          const arr = Array.isArray(ps) ? ps : [ps];
          const r = rows[arr[0].dataIndex];
          return `<strong>${mLabel(r.m)}</strong><br/>education in Delhi +${r.edu!.toFixed(2)}%<br/>${AIA} +${r.headline!.toFixed(2)}%<br/>the gap ${(r.edu! - r.headline!).toFixed(1)} points`;
        },
      },
      xAxis: {
        type: 'category', data: rows.map((r) => mLabel(r.m)),
        axisTick: { show: false }, axisLine: { lineStyle: { color: t.line } },
        axisLabel: { color: t.subtle, fontFamily: t.mono },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax,
        axisLabel: { color: t.subtle, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: t.line, opacity: 0.3 } },
      },
      series: [
        // the shaded gap: an invisible base up to the headline, then a
        // translucent saffron column spanning headline → fees
        { name: 'base', type: 'bar', stack: 'gap', silent: true, barWidth: narrow ? 10 : 14,
          itemStyle: { color: 'transparent' },
          data: rows.map((r) => r.headline) },
        { name: 'the gap', type: 'bar', stack: 'gap', silent: true,
          itemStyle: { color: t.c1, opacity: 0.16 },
          data: rows.map((r) => r.edu! - r.headline!) },
        { name: 'education in Delhi', type: 'scatter', symbolSize: narrow ? 8 : 10, z: 5,
          itemStyle: { color: c2 },
          data: rows.map((r, i) => ({
            value: r.edu,
            label: ptLabel('education in Delhi', r.edu!, !narrow && i === lastI, c2Text, true),
          })) },
        { name: AIA, type: 'scatter', symbolSize: narrow ? 8 : 10, z: 5,
          itemStyle: { color: t.c1, borderColor: t.surfaceDim, borderWidth: 1 },
          data: rows.map((r, i) => ({
            value: r.headline,
            // the in-chart label drops the article: it is centred on the last
            // point and has only the right gutter to spread into
            label: ptLabel('all-India average', r.headline!, !narrow && i === lastI, c1Text, false),
          })) },
      ],
    }, true);
    // touch: a page scroll counts as a mousemove, so the tooltip was popping
    // open unasked. Switches to tap-to-open and gives the box a real × (the
    // same control the desks and /meta carry). setOption(…, true) drops the
    // merged tooltip, so this re-runs on every render.
    initTouchTooltipClose(inst);
  };
  render();
  initTouchTipToggle(inst);
  return { refresh: render };
}


// ================================ Part III =====================================

export type WildData = {
  base: { name: string; months: string[]; idx: number[]; yoy: (number | null)[]; home: string };
  contrib: {
    m: string; published: number; rebuilt: number; ex: number; jewelW: number;
    items: ContribItem[]; jewel: ContribItem[];
    series: { m: string; full: number; ex: number }[];
    silver: { name: string; w: number; months: string[]; idx: number[]; first: number; peak: number };
    reconWorst: number;
  };
  states: {
    latest: {
      m: string; lo: number; hi: number; ai: number | null; n: number;
      rows: { key: string; name: string; v: number; ai: boolean; show: boolean }[];
    };
    minSpread: number; maxSpread: number; nMonths: number; firstM: string;
    yearSpread: { y: string; avg: number }[];
    topHolders: { key: string; n: number }[];
  };
  repo: { steps: { m: string; r: number }[]; cpi: { m: string; yoy: number | null }[]; spliceAt: string };
};
type ContribItem = { code: string; name: string; w: number; yoy: number; c: number };

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtM = (m: string) => `${MON3[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

/** round tick values across a range, so a percent axis can carry numbers */
const niceTicks = (lo: number, hi: number, want = 4) => {
  const raw = (hi - lo) / want;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-6)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(6));
  return out;
};

// ---- the base-effect scrubber (beat 9) -----------------------------------------
// A year-on-year rate is this month divided by a mark set twelve months back.
// Top strip, the vegetables index as published; bottom strip, the same months
// as the YoY rate. The reader scrubs a month and the mark scrubs with it — at
// the home month (July 2024) the index jumps while the rate collapses,
// because last July's spike just entered the comparison.
//
// Both strips carry the SAME series, which readers were mistaking for two
// different ones. The fix is to put the numbers on the drawing: the index at
// the scrub point, the index at the mark, the division between them written
// on the arc that joins them, and the rate on the dot below. The arc is the
// lesson — the numerator holds still while the denominator moves.

export function initBase(fig: HTMLElement | null, bd: WildData['base']) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.bs-area')!;
  const svg = svgEl('svg', { class: 'bs-svg' }) as SVGSVGElement;
  const cap = el('p', 'bs-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const N = bd.months.length;
  let k = bd.months.indexOf(bd.home);
  let viewW = 0;

  const build = () => {
    const w = viewW;
    if (!w) return;
    const narrow = w < 560;
    const H = 352;
    const x0 = narrow ? 34 : 44, x1 = w - (narrow ? 10 : 16);
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    // the index strip sits low enough to leave headroom for the arc and the
    // division written on it
    const iT = { y0: 66, y1: 176 }, rT = { y0: 238, y1: 322 };
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    const iLo = Math.min(...bd.idx) * 0.96, iHi = Math.max(...bd.idx) * 1.03;
    const YI = (v: number) => iT.y1 - ((v - iLo) / (iHi - iLo)) * (iT.y1 - iT.y0);
    const ys = bd.yoy.filter((v): v is number => v != null);
    const rLo = Math.min(...ys) - 3, rHi = Math.max(...ys) + 3;
    const YR = (v: number) => rT.y1 - ((v - rLo) / (rHi - rLo)) * (rT.y1 - rT.y0);

    const t1 = svgEl('text', { x: x0, y: 20, class: 'mx-rtitle' });
    t1.textContent = narrow ? 'vegetables, index' : 'vegetables, the index itself (2012 = 100)';
    const t2 = svgEl('text', { x: x0, y: rT.y0 - 14, class: 'mx-rtitle' });
    t2.textContent = narrow ? 'the same months, as a rate' : 'the same months, read as a year-on-year rate';
    svg.append(t1, t2);

    // year ticks on both strips
    bd.months.forEach((m, i) => {
      if (!m.endsWith('-01')) return;
      for (const strip of [iT, rT]) {
        svg.appendChild(svgEl('line', { x1: X(i), y1: strip.y1 + 2, x2: X(i), y2: strip.y1 + 6, class: 'mx-tick' }));
      }
      const t = svgEl('text', { x: X(i), y: rT.y1 + 18, class: 'mx-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
      t.textContent = `’${m.slice(2, 4)}`;
      svg.appendChild(t);
      const ti = svgEl('text', { x: X(i), y: iT.y1 + 16, class: 'mx-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
      ti.textContent = `’${m.slice(2, 4)}`;
      svg.appendChild(ti);
    });

    // zero line on the rate strip
    if (rLo < 0 && rHi > 0) {
      svg.appendChild(svgEl('line', { x1: x0, y1: YR(0), x2: x1, y2: YR(0), class: 'bs-zero' }));
    }

    const path = (vals: (number | null)[], Y: (v: number) => number, cls: string) => {
      let d = '', pen = false;
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? ' L' : ' M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        pen = true;
      });
      svg.appendChild(svgEl('path', { d: d.trim(), class: cls }));
    };
    path(bd.idx, YI, 'bs-idx');
    path(bd.yoy, YR, 'bs-yoy');

    // the movable furniture: guide, current dots, the mark, and the numbers
    // that make the two strips legible as one series read two ways
    const guide = svgEl('line', { class: 'bs-guide', y1: iT.y0 - 30, y2: rT.y1 });
    const dotI = svgEl('circle', { r: 4.5, class: 'bs-dot bs-dot-idx' });
    const dotR = svgEl('circle', { r: 4.5, class: 'bs-dot bs-dot-rate' });
    const mark = svgEl('circle', { r: 4.5, class: 'bs-mark' });
    const markLab = svgEl('text', { class: 'bs-marklab', 'text-anchor': 'middle' });
    markLab.textContent = 'the mark';
    const markNum = svgEl('text', { class: 'bs-val bs-val-mark', 'text-anchor': 'middle' });
    const idxNum = svgEl('text', { class: 'bs-val bs-val-idx', 'text-anchor': 'middle' });
    const rateNum = svgEl('text', { class: 'bs-val bs-val-rate', 'text-anchor': 'middle' });
    const sumLab = svgEl('text', { class: 'bs-sum', 'text-anchor': 'middle' });
    const link = svgEl('path', { class: 'bs-link' });
    svg.append(link, guide, mark, markLab, markNum, dotI, dotR, idxNum, rateNum, sumLab);

    const update = () => {
      const m = bd.months[k], i = bd.idx[k], y = bd.yoy[k];
      const i12 = bd.idx[k - 12];
      const gx = X(k), hx = X(k - 12);
      guide.setAttribute('x1', gx.toFixed(1)); guide.setAttribute('x2', gx.toFixed(1));
      dotI.setAttribute('cx', gx.toFixed(1)); dotI.setAttribute('cy', YI(i).toFixed(1));
      if (y != null) { dotR.setAttribute('cx', gx.toFixed(1)); dotR.setAttribute('cy', YR(y).toFixed(1)); }
      mark.setAttribute('cx', hx.toFixed(1)); mark.setAttribute('cy', YI(i12).toFixed(1));

      // the two operands sit on their own dots, pushed to whichever side has
      // room so they never collide with the arc between them
      const place = (t: Element, x: number, yy: number, dy: number) => {
        t.setAttribute('x', x.toFixed(1)); t.setAttribute('y', (yy + dy).toFixed(1));
      };
      place(markLab, hx, YI(i12), 22);
      place(markNum, hx, YI(i12), 35);
      place(idxNum, gx, YI(i), 22);
      if (y != null) place(rateNum, gx, YR(y), -12);
      markNum.textContent = i12.toFixed(1);
      idxNum.textContent = i.toFixed(1);
      rateNum.textContent = y != null ? fmtPct(y, 1) : '';

      const apex = Math.max(36, Math.min(YI(i12), YI(i)) - 26);
      link.setAttribute('d', `M ${hx.toFixed(1)} ${YI(i12).toFixed(1)} C ${((hx + gx) / 2).toFixed(1)} ${apex.toFixed(1)}, `
        + `${((hx + gx) / 2).toFixed(1)} ${apex.toFixed(1)}, ${gx.toFixed(1)} ${YI(i).toFixed(1)}`);
      // the arc says "these two are compared"; which two, and what comes out,
      // is carried by colour that the prose uses for the same numbers
      place(sumLab, (hx + gx) / 2, apex, narrow ? 4 : 2);
      sumLab.textContent = 'twelve months';

      const mom = ((i - bd.idx[k - 1]) / bd.idx[k - 1]) * 100;
      const dyoy = y != null && bd.yoy[k - 1] != null ? y - (bd.yoy[k - 1] as number) : null;
      let s = `${fmtM(m)}: the index is ${i.toFixed(1)}, ${mom >= 0 ? 'up' : 'down'} ${Math.abs(mom).toFixed(1)}% in the month. `
        + `The mark, twelve months back, is ${i12.toFixed(1)}, so the rate prints ${y != null ? fmtPct(y, 1) : '—'}.`;
      if (dyoy != null && mom > 0.5 && dyoy < -4) {
        s += ' Prices rose; the rate collapsed anyway. What changed is the mark.';
      } else if (dyoy != null && mom < -0.5 && dyoy > 4) {
        s += ' Prices fell; the rate climbed anyway. What changed is the mark.';
      }
      cap.textContent = s;
    };

    // scrub anywhere on the drawing; the mark needs a year of runway
    const scrubTo = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      k = Math.max(12, Math.min(N - 1, Math.round(((x - x0) / (x1 - x0)) * (N - 1))));
      update();
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      (svg as SVGSVGElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    update();
  };

  let wB = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wB) { wB = w; viewW = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}// ---- the index and its headline (Part II opening) -------------------------------
// initBase's two-strip lesson, promoted from the parked base-effect section
// into the descent. The INDEX rides on top and the rate beneath it, because
// the second is a derivation of the first — the reader watches the division
// happen downward. Ink for the index, saffron for the headline, the same
// code the prose wears. Scrub a month; the mark scrubs twelve behind; the
// division is written on the arc. No toggles — this figure exists to make
// the grammar familiar before the figures after it repeat it.

export type IndexRateData = { months: string[]; idx: (number | null)[] };

export function initIndexRate(fig: HTMLElement | null, ir: IndexRateData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.rl-area')!;
  const svg = svgEl('svg', { class: 'ix-svg' }) as SVGSVGElement;
  const cap = el('p', 'ix-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const N = ir.months.length;
  let k = N - 1;
  let viewW = 0;

  const build = () => {
    const w = viewW;
    if (!w) return;
    const narrow = w < 560;
    const H = 316;
    const x0 = narrow ? 34 : 44, x1 = w - (narrow ? 12 : 18);
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    // the index on top, the rate it produces beneath
    const iT = { y0: 62, y1: 172 }, rT = { y0: 226, y1: 292 };
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    const rates = ir.idx.map((v, i) =>
      i >= 12 && v != null && ir.idx[i - 12] != null ? (v / (ir.idx[i - 12] as number) - 1) * 100 : null);

    const ds = ir.idx.filter((v): v is number => v != null);
    const iSpan = Math.max(...ds) - Math.min(...ds, 100) || 1;
    const iLo = Math.min(...ds, 100) - iSpan * 0.08 - 0.2;
    const iHi = Math.max(...ds) + iSpan * 0.1 + 0.2;
    const YI = (v: number) => iT.y1 - ((v - iLo) / (iHi - iLo)) * (iT.y1 - iT.y0);
    const rs = rates.filter((v): v is number => v != null);
    const rLo = Math.min(...rs, 0) - 0.8, rHi = Math.max(...rs) + 0.8;
    const YR = (v: number) => rT.y1 - ((v - rLo) / (rHi - rLo)) * (rT.y1 - rT.y0);

    const t1 = svgEl('text', { x: x0, y: 20, class: 'ix-title' });
    t1.textContent = narrow ? 'the index (2024 = 100)' : 'the index: what the ministry actually publishes (2024 = 100)';
    const t2 = svgEl('text', { x: x0, y: rT.y0 - 14, class: 'ix-title' });
    t2.textContent = narrow ? 'the headline it produces' : 'the headline it produces, year-on-year: the number the news reads out';
    svg.append(t1, t2);

    // the base year's floor; the label stops short of the right edge so the
    // default guide (latest month) never rules through it
    svg.appendChild(svgEl('line', { x1: x0, y1: YI(100), x2: x1, y2: YI(100), class: 'ix-base' }));
    const bl = svgEl('text', { x: x1 - 34, y: YI(100) - 5, class: 'ix-baselab', 'text-anchor': 'end' });
    bl.textContent = '2024 = 100';
    svg.appendChild(bl);

    // quarter ticks on both strips, month labels on the halves
    ir.months.forEach((m, i) => {
      if (!/-(01|04|07|10)$/.test(m)) return;
      for (const strip of [iT, rT]) {
        svg.appendChild(svgEl('line', { x1: X(i), y1: strip.y1 + 2, x2: X(i), y2: strip.y1 + 6, class: 'ix-tick' }));
      }
      if (!/-(01|07)$/.test(m)) return;
      for (const yy of [iT.y1 + 17, rT.y1 + 17]) {
        const t = svgEl('text', { x: X(i), y: yy, class: 'ix-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
        t.textContent = `${MON3[+m.slice(5) - 1]} ’${m.slice(2, 4)}`;
        svg.appendChild(t);
      }
    });
    if (rLo < 0 && rHi > 0) {
      svg.appendChild(svgEl('line', { x1: x0, y1: YR(0), x2: x1, y2: YR(0), class: 'ix-zero' }));
    }

    const path = (vals: (number | null)[], Y: (v: number) => number, cls: string) => {
      let d = '', pen = false;
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? ' L' : ' M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        pen = true;
      });
      if (d) svg.appendChild(svgEl('path', { d: d.trim(), class: cls }));
    };
    path(ir.idx, YI, 'ix-line');
    path(rates, YR, 'ix-rline');

    const guide = svgEl('line', { class: 'ix-guide', y1: iT.y0 - 26, y2: rT.y1 });
    const link = svgEl('path', { class: 'ix-arc' });
    const mark = svgEl('circle', { r: 4.5, class: 'ix-markdot' });
    const markLab = svgEl('text', { class: 'ix-marklab', 'text-anchor': 'middle' });
    markLab.textContent = 'the mark';
    const markNum = svgEl('text', { class: 'ix-val', 'text-anchor': 'middle' });
    const dotI = svgEl('circle', { r: 4.5, class: 'ix-dot' });
    const dotR = svgEl('circle', { r: 4.5, class: 'ix-dot ix-dot-rate' });
    const idxNum = svgEl('text', { class: 'ix-val', 'text-anchor': 'middle' });
    const rateNum = svgEl('text', { class: 'ix-val ix-val-rate', 'text-anchor': 'middle' });
    const sumLab = svgEl('text', { class: 'ix-sum', 'text-anchor': 'middle' });
    svg.append(link, guide, mark, markLab, markNum, dotI, dotR, idxNum, rateNum, sumLab);

    const update = () => {
      const i = ir.idx[k], i12 = ir.idx[k - 12], y = rates[k];
      if (i == null || i12 == null) return;
      const gx = X(k), hx = X(k - 12);
      guide.setAttribute('x1', gx.toFixed(1)); guide.setAttribute('x2', gx.toFixed(1));
      dotI.setAttribute('cx', gx.toFixed(1)); dotI.setAttribute('cy', YI(i).toFixed(1));
      if (y != null) { dotR.setAttribute('cx', gx.toFixed(1)); dotR.setAttribute('cy', YR(y).toFixed(1)); }
      mark.setAttribute('cx', hx.toFixed(1)); mark.setAttribute('cy', YI(i12).toFixed(1));
      // number labels are centre-anchored, so clamp them clear of both edges
      // (the latest month is the default selection, hard against the right)
      const place = (t: Element, x: number, yy: number, dy: number) => {
        t.setAttribute('x', Math.max(x0 + 26, Math.min(x, x1 - 28)).toFixed(1));
        t.setAttribute('y', (yy + dy).toFixed(1));
      };
      place(markLab, hx, YI(i12), 22);
      place(markNum, hx, YI(i12), 35);
      place(idxNum, gx, YI(i), -12);
      if (y != null) place(rateNum, gx, YR(y), -12);
      markNum.textContent = i12.toFixed(narrow ? 1 : 2);
      idxNum.textContent = i.toFixed(narrow ? 1 : 2);
      rateNum.textContent = y != null ? fmtPct(y, 2) : '';
      const apex = Math.max(narrow ? 40 : 36, Math.min(YI(i12), YI(i)) - 24);
      link.setAttribute('d', `M ${hx.toFixed(1)} ${YI(i12).toFixed(1)} C ${((hx + gx) / 2).toFixed(1)} ${apex.toFixed(1)}, `
        + `${((hx + gx) / 2).toFixed(1)} ${apex.toFixed(1)}, ${gx.toFixed(1)} ${YI(i).toFixed(1)}`);
      place(sumLab, (hx + gx) / 2, apex, -4);
      sumLab.textContent = 'twelve months';
      // "works out to", not "the news said": the ministry computes its rate
      // from the unrounded index, so the last digit can differ from this
      // division of the published two-decimal levels (Jan 2026: 2.73 v 2.74)
      cap.innerHTML = `<strong>${fmtM(ir.months[k])}: the rate works out to <span class="ix-h">${y != null ? fmtPct(y, 2) : '—'}</span>.</strong> `
        + `That is the index, <strong>${i.toFixed(2)}</strong>, divided by its mark twelve months back, <strong>${i12.toFixed(2)}</strong>.`;
    };

    // scrub anywhere; the mark needs a year of runway
    const scrubTo = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      k = Math.max(12, Math.min(N - 1, Math.round(((x - x0) / (x1 - x0)) * (N - 1))));
      update();
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      (svg as SVGSVGElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    update();
  };

  let wB = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wB) { wB = w; viewW = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}

// ---- the long run (after the base-year paragraph) -------------------------------
// The same two strips, run back to 2013, index above as ever: the retired
// series continued past the rebuild by the linking factor, so "prices have
// roughly doubled since 2012" is a line the reader can see end at ~203,
// with the spliced headline rate beneath it. Scrubbing works exactly as in
// the figure above — the hollow mark rides twelve months behind and every
// dot carries its number — and the seam wears its own colour (the red
// chart hue, unclaimed by any other meaning in this read); past it the
// current dot adds its arithmetic: merged = published ÷ factor.

export type LongRunData = {
  months: string[]; idx: (number | null)[]; yoy: (number | null)[];
  newIdx: (number | null)[]; spliceAt: string | null;
};

export function initLongRun(fig: HTMLElement | null, lr: LongRunData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.lr-area')!;
  const svg = svgEl('svg', { class: 'ix-svg' }) as SVGSVGElement;
  const cap = el('p', 'ix-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const N = lr.months.length;
  const sk = lr.spliceAt ? lr.months.indexOf(lr.spliceAt) : -1;
  // the multiplier, recovered from the data itself so the label can never
  // disagree with the generator's constant
  const kNew = lr.newIdx.findIndex((v) => v != null);
  const LF = kNew >= 0 ? (lr.newIdx[kNew]! / lr.idx[kNew]!) : null;
  let k = N - 1;
  let viewW = 0;

  const build = () => {
    const w = viewW;
    if (!w) return;
    const narrow = w < 560;
    const H = 300;
    const x0 = narrow ? 34 : 44, x1 = w - (narrow ? 12 : 18);
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    const iT = { y0: 56, y1: 168 }, rT = { y0: 214, y1: 276 };
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    const ds = lr.idx.filter((v): v is number => v != null);
    const iLo = Math.min(...ds, 100) - 6, iHi = Math.max(...ds) + 8;
    const YI = (v: number) => iT.y1 - ((v - iLo) / (iHi - iLo)) * (iT.y1 - iT.y0);
    const rs = lr.yoy.filter((v): v is number => v != null);
    const rLo = Math.min(...rs, 0) - 0.8, rHi = Math.max(...rs) + 0.8;
    const YR = (v: number) => rT.y1 - ((v - rLo) / (rHi - rLo)) * (rT.y1 - rT.y0);

    const t1 = svgEl('text', { x: x0, y: 20, class: 'ix-title' });
    t1.textContent = narrow ? 'the index, on the 2012 ruler' : 'the index, the whole way back on the retired 2012 ruler';
    const t2 = svgEl('text', { x: x0, y: rT.y0 - 12, class: 'ix-title' });
    t2.textContent = narrow ? 'the headline, both series' : 'the headline it produces, year-on-year, both series spliced';
    svg.append(t1, t2);

    // the label lives at the RIGHT end of the floor: the line starts at ~100
    // on the left and would run straight through it there, while by the right
    // edge the line rides two hundred, far overhead
    svg.appendChild(svgEl('line', { x1: x0, y1: YI(100), x2: x1, y2: YI(100), class: 'ix-base' }));
    const bl = svgEl('text', { x: x1 - 34, y: YI(100) - 5, class: 'ix-baselab', 'text-anchor': 'end' });
    bl.textContent = '2012 = 100';
    svg.appendChild(bl);

    // year ticks on both strips
    lr.months.forEach((m, i) => {
      if (!m.endsWith('-01')) return;
      const yr = +m.slice(0, 4);
      for (const strip of [iT, rT]) {
        svg.appendChild(svgEl('line', { x1: X(i), y1: strip.y1 + 2, x2: X(i), y2: strip.y1 + 6, class: 'ix-tick' }));
      }
      if (narrow && yr % 2 !== 0) return;
      for (const yy of [iT.y1 + 16, rT.y1 + 16]) {
        const t = svgEl('text', { x: X(i), y: yy, class: 'ix-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
        t.textContent = `’${m.slice(2, 4)}`;
        svg.appendChild(t);
      }
    });
    if (rLo < 0 && rHi > 0) {
      svg.appendChild(svgEl('line', { x1: x0, y1: YR(0), x2: x1, y2: YR(0), class: 'ix-zero' }));
    }

    // the seam: where the retired series hands over to the rescaled new one.
    // Its label sits low in the index strip, which is empty at the right
    // (the line rides two hundred, near the strip's ceiling) — the corner
    // above belongs to the current dot's ÷-factor annotation, and the band
    // between the strips to the tick labels
    if (sk > 0) {
      svg.appendChild(svgEl('line', { x1: X(sk), y1: iT.y0 - 8, x2: X(sk), y2: rT.y1, class: 'lr-seam' }));
      const st = svgEl('text', { x: X(sk) - 6, y: iT.y1 - 22, class: 'lr-seamlab', 'text-anchor': 'end' });
      st.textContent = 'the rebuild';
      svg.appendChild(st);
    }

    const path = (vals: (number | null)[], Y: (v: number) => number, cls: string) => {
      let d = '', pen = false;
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? ' L' : ' M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        pen = true;
      });
      if (d) svg.appendChild(svgEl('path', { d: d.trim(), class: cls }));
    };
    path(lr.idx, YI, 'ix-line');
    path(lr.yoy, YR, 'ix-rline');

    const guide = svgEl('line', { class: 'ix-guide', y1: iT.y0 - 6, y2: rT.y1 });
    // the same moving furniture as the figure above: the mark rides twelve
    // months behind the selection, every dot carries its number, and past
    // the seam the current dot adds its ÷-factor arithmetic in splice red
    const mark = svgEl('circle', { r: 4, class: 'ix-markdot' });
    const markNum = svgEl('text', { class: 'ix-val', 'text-anchor': 'middle' });
    const dotI = svgEl('circle', { r: 4, class: 'ix-dot' });
    const dotR = svgEl('circle', { r: 4, class: 'ix-dot ix-dot-rate' });
    const idxNum = svgEl('text', { class: 'ix-val', 'text-anchor': 'middle' });
    const rateNum = svgEl('text', { class: 'ix-val ix-val-rate', 'text-anchor': 'middle' });
    const dotMath = svgEl('text', { class: 'lr-math', 'text-anchor': 'end' });
    svg.append(guide, mark, markNum, dotI, dotR, idxNum, rateNum, dotMath);

    const update = () => {
      const i = lr.idx[k], i12 = lr.idx[k - 12], y = lr.yoy[k], ni = lr.newIdx[k];
      const gx = X(k), hx = X(k - 12);
      guide.setAttribute('x1', gx.toFixed(1)); guide.setAttribute('x2', gx.toFixed(1));
      const clampX = (x: number) => Math.max(x0 + 26, Math.min(x, x1 - 28));
      if (i != null) {
        dotI.setAttribute('cx', gx.toFixed(1)); dotI.setAttribute('cy', YI(i).toFixed(1));
        idxNum.setAttribute('x', clampX(gx).toFixed(1));
        idxNum.setAttribute('y', (YI(i) - (ni != null ? 26 : 12)).toFixed(1));
        idxNum.textContent = i.toFixed(narrow ? 1 : 2);
      }
      if (i12 != null) {
        mark.setAttribute('cx', hx.toFixed(1)); mark.setAttribute('cy', YI(i12).toFixed(1));
        markNum.setAttribute('x', clampX(hx).toFixed(1));
        markNum.setAttribute('y', (YI(i12) + 20).toFixed(1));
        markNum.textContent = i12.toFixed(narrow ? 1 : 2);
        mark.style.display = ''; markNum.style.display = '';
      } else {
        mark.style.display = 'none'; markNum.style.display = 'none';
      }
      if (y != null) {
        dotR.setAttribute('cx', gx.toFixed(1)); dotR.setAttribute('cy', YR(y).toFixed(1));
        rateNum.setAttribute('x', clampX(gx).toFixed(1));
        rateNum.setAttribute('y', (YR(y) - 12).toFixed(1));
        rateNum.textContent = fmtPct(y, 2);
        rateNum.style.display = '';
      } else {
        rateNum.style.display = 'none';
      }
      if (i != null && ni != null && LF != null) {
        dotMath.setAttribute('x', Math.min(gx + 8, x1 - 4).toFixed(1));
        dotMath.setAttribute('y', (YI(i) - 11).toFixed(1));
        dotMath.textContent = `= ${ni.toFixed(2)} ÷ ${LF.toFixed(4)}`;
        dotMath.style.display = '';
      } else {
        dotMath.style.display = 'none';
      }
      const own = ni != null && LF != null
        ? `, from <strong>${ni.toFixed(2)}</strong> ÷ <span class="lr-lf">${LF.toFixed(4)}</span>`
        : '';
      cap.innerHTML = `<strong>${fmtM(lr.months[k])}: the headline printed `
        + `<span class="ix-h">${y != null ? fmtPct(y, 2) : '—'}</span>.</strong> `
        + `The index: <strong>${i != null ? i.toFixed(narrow ? 1 : 2) : '—'}</strong> on the 2012 ruler${own}.`;
    };

    // the mark needs a year of runway, exactly as in the figure above
    const scrubTo = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      k = Math.max(12, Math.min(N - 1, Math.round(((x - x0) / (x1 - x0)) * (N - 1))));
      update();
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      (svg as SVGSVGElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    update();
  };

  let wB = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wB) { wB = w; viewW = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}

// ---- rural and urban (the blend paragraph) --------------------------------------
// The two sector indices in the prose's own green and purple, with the
// published blend between them as a dashed ink line — a plain chart, not
// the two-strip interactive: the lesson here is only that the headline
// walks between its parents, weighted by the wallet. The y-axis hugs the
// data (no forced floor at 100) so the gap between the three is legible.
// Each line's end label carries its name AND its latest value ("rural
// 107.24"), nudged apart where the lines finish close — floating value
// labels at the scrub point were tried and read as clutter; the scrubbed
// month's numbers live in the caption, colour-coded. Tap a month and the
// caption does the blend arithmetic.

export type RulerData = {
  months: string[]; combined: (number | null)[]; rural: (number | null)[]; urban: (number | null)[];
};

export function initSectors(fig: HTMLElement | null, rl: RulerData, shares: { rural: number; urban: number }) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.sx-area')!;
  const svg = svgEl('svg', { class: 'sx-svg' }) as SVGSVGElement;
  const cap = el('p', 'ix-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const N = rl.months.length;
  let k = N - 1;
  let viewW = 0;

  const build = () => {
    const w = viewW;
    if (!w) return;
    const narrow = w < 560;
    const H = 300;
    // the right margin holds "the blend 107.00"-style combined labels
    const x0 = narrow ? 30 : 38, x1 = w - (narrow ? 82 : 122);
    const yB = H - 28, yT = 34;
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    const all = [...rl.rural, ...rl.urban, ...rl.combined].filter((v): v is number => v != null);
    const lo = Math.min(...all) - 0.4, hi = Math.max(...all) + 0.4;
    const Y = (v: number) => yB - ((v - lo) / (hi - lo)) * (yB - yT);

    const t1 = svgEl('text', { x: x0, y: 18, class: 'ix-title' });
    t1.textContent = narrow ? 'two Indias, one blend' : 'the two sector indices, and the blend the news is read from';
    svg.appendChild(t1);

    // the 2024 floor only if the zoomed window still reaches it
    if (100 >= lo && 100 <= hi) {
      svg.appendChild(svgEl('line', { x1: x0, y1: Y(100), x2: x1, y2: Y(100), class: 'ix-base' }));
      const bl = svgEl('text', { x: x0 + 2, y: Y(100) - 5, class: 'ix-baselab' });
      bl.textContent = '2024 = 100';
      svg.appendChild(bl);
    }

    rl.months.forEach((m, i) => {
      if (!/-(01|04|07|10)$/.test(m)) return;
      svg.appendChild(svgEl('line', { x1: X(i), y1: yB + 2, x2: X(i), y2: yB + 6, class: 'ix-tick' }));
      if (!/-(01|07)$/.test(m)) return;
      const t = svgEl('text', { x: X(i), y: yB + 18, class: 'ix-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
      t.textContent = `${MON3[+m.slice(5) - 1]} ’${m.slice(2, 4)}`;
      svg.appendChild(t);
    });

    const path = (vals: (number | null)[], cls: string) => {
      let d = '', pen = false;
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? ' L' : ' M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        pen = true;
      });
      if (d) svg.appendChild(svgEl('path', { d: d.trim(), class: cls }));
    };
    path(rl.combined, 'sx-blend');
    path(rl.rural, 'sx-rural');
    path(rl.urban, 'sx-urban');

    // named ends, name and latest value in one label, nudged apart when the
    // lines finish close together
    const ends = [
      { v: rl.rural[N - 1], cls: 'sx-endlab sx-endlab-rural', word: 'rural' },
      { v: rl.urban[N - 1], cls: 'sx-endlab sx-endlab-urban', word: 'urban' },
      { v: rl.combined[N - 1], cls: 'sx-endlab sx-endlab-blend', word: narrow ? 'blend' : 'the blend' },
    ].filter((e): e is typeof e & { v: number } => e.v != null);
    ends.sort((a, b) => Y(a.v) - Y(b.v));
    let prevY = -99;
    for (const e of ends) {
      const yy = Math.max(Y(e.v) + 3.5, prevY + 13);
      prevY = yy;
      const t = svgEl('text', { x: x1 + 7, y: yy, class: e.cls });
      t.textContent = `${e.word} ${e.v.toFixed(narrow ? 1 : 2)}`;
      svg.appendChild(t);
    }

    const guide = svgEl('line', { class: 'ix-guide', y1: yT - 6, y2: yB });
    const dR = svgEl('circle', { r: 4, class: 'sx-dot sx-dot-rural' });
    const dU = svgEl('circle', { r: 4, class: 'sx-dot sx-dot-urban' });
    const dB = svgEl('circle', { r: 3.5, class: 'sx-dot sx-dot-blend' });
    svg.append(guide, dR, dU, dB);

    const update = () => {
      const r = rl.rural[k], u = rl.urban[k], c = rl.combined[k];
      const gx = X(k);
      guide.setAttribute('x1', gx.toFixed(1)); guide.setAttribute('x2', gx.toFixed(1));
      if (r != null) { dR.setAttribute('cx', gx.toFixed(1)); dR.setAttribute('cy', Y(r).toFixed(1)); }
      if (u != null) { dU.setAttribute('cx', gx.toFixed(1)); dU.setAttribute('cy', Y(u).toFixed(1)); }
      if (c != null) { dB.setAttribute('cx', gx.toFixed(1)); dB.setAttribute('cy', Y(c).toFixed(1)); }
      cap.innerHTML = `<strong>${fmtM(rl.months[k])}:</strong> `
        + `<span class="ix-r">rural ${r?.toFixed(2)}</span> × ₹${shares.rural.toFixed(2)} + `
        + `<span class="ix-u">urban ${u?.toFixed(2)}</span> × ₹${shares.urban.toFixed(2)} → `
        + `<strong>${c?.toFixed(2)}</strong>, the blend the news is read from.`;
    };

    const scrubTo = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      k = Math.max(0, Math.min(N - 1, Math.round(((x - x0) / (x1 - x0)) * (N - 1))));
      update();
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      (svg as SVGSVGElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    update();
  };

  let wB = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wB) { wB = w; viewW = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}

// ---- the aisles (the divisions beat) --------------------------------------------
// One division's index at a time behind three tabs, in the division teal
// the prose already wears — a single strip, not the two-strip interactive:
// the previous figures taught the division, so here the scrubbed month
// shows its mark on the same line and the caption does the arithmetic.
// Three tabs, not twelve, and not a dropdown: the section narrates, the
// explore board enumerates, and the funnel below reaches every cell.

const AISLES: { name: string; label: string }[] = [
  { name: 'Food and beverages', label: 'Food & beverages' },
  { name: 'Housing, water, electricity, gas and other fuels', label: 'Housing & utilities' },
  { name: 'Education services', label: 'Education' },
];

export function initAisles(
  fig: HTMLElement | null,
  months: string[],
  divisions: { name: string; idx: (number | null)[] }[],
) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.ai-area')!;
  const rows = AISLES
    .map((a) => ({ ...a, idx: divisions.find((d) => d.name === a.name)?.idx }))
    .filter((a): a is typeof a & { idx: (number | null)[] } => a.idx != null);
  if (!rows.length) return { refresh() {} };
  const svg = svgEl('svg', { class: 'ai-svg' }) as SVGSVGElement;
  const cap = el('p', 'ix-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const N = months.length;
  let sel = 0;
  let k = N - 1;
  let viewW = 0;

  const build = () => {
    const w = viewW;
    if (!w) return;
    const narrow = w < 560;
    const H = 264;
    const x0 = narrow ? 30 : 38, x1 = w - (narrow ? 12 : 18);
    const yB = H - 28, yT = 36;
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    const vals = rows[sel].idx;
    const ds = vals.filter((v): v is number => v != null);
    const span = Math.max(...ds) - Math.min(...ds, 100) || 1;
    const lo = Math.min(...ds, 100) - span * 0.1 - 0.2, hi = Math.max(...ds) + span * 0.12 + 0.2;
    const Y = (v: number) => yB - ((v - lo) / (hi - lo)) * (yB - yT);

    const t1 = svgEl('text', { x: x0, y: 18, class: 'ix-title' });
    t1.textContent = `${rows[sel].label.toLowerCase()}, the index (2024 = 100)`;
    svg.appendChild(t1);

    svg.appendChild(svgEl('line', { x1: x0, y1: Y(100), x2: x1, y2: Y(100), class: 'ix-base' }));
    const bl = svgEl('text', { x: x1 - 34, y: Y(100) - 5, class: 'ix-baselab', 'text-anchor': 'end' });
    bl.textContent = '2024 = 100';
    svg.appendChild(bl);

    months.forEach((m, i) => {
      if (!/-(01|04|07|10)$/.test(m)) return;
      svg.appendChild(svgEl('line', { x1: X(i), y1: yB + 2, x2: X(i), y2: yB + 6, class: 'ix-tick' }));
      if (!/-(01|07)$/.test(m)) return;
      const t = svgEl('text', { x: X(i), y: yB + 18, class: 'ix-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
      t.textContent = `${MON3[+m.slice(5) - 1]} ’${m.slice(2, 4)}`;
      svg.appendChild(t);
    });

    let d = '', pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? ' L' : ' M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
      pen = true;
    });
    if (d) svg.appendChild(svgEl('path', { d: d.trim(), class: 'ai-line' }));

    const guide = svgEl('line', { class: 'ix-guide', y1: yT - 8, y2: yB });
    const mark = svgEl('circle', { r: 4, class: 'ix-markdot' });
    const dot = svgEl('circle', { r: 4.5, class: 'ai-dot' });
    const num = svgEl('text', { class: 'ix-val', 'text-anchor': 'middle' });
    const markNum = svgEl('text', { class: 'ix-val ai-marknum', 'text-anchor': 'middle' });
    svg.append(guide, mark, dot, num, markNum);

    const update = () => {
      const i = vals[k], i12 = vals[k - 12];
      if (i == null) return;
      const gx = X(k);
      guide.setAttribute('x1', gx.toFixed(1)); guide.setAttribute('x2', gx.toFixed(1));
      dot.setAttribute('cx', gx.toFixed(1)); dot.setAttribute('cy', Y(i).toFixed(1));
      const clampX = (x: number) => Math.max(x0 + 26, Math.min(x, x1 - 28));
      num.setAttribute('x', clampX(gx).toFixed(1)); num.setAttribute('y', (Y(i) - 12).toFixed(1));
      num.textContent = i.toFixed(narrow ? 1 : 2);
      if (i12 != null) {
        const hx = X(k - 12);
        mark.setAttribute('cx', hx.toFixed(1)); mark.setAttribute('cy', Y(i12).toFixed(1));
        markNum.setAttribute('x', clampX(hx).toFixed(1)); markNum.setAttribute('y', (Y(i12) + 22).toFixed(1));
        markNum.textContent = i12.toFixed(narrow ? 1 : 2);
        mark.style.display = ''; markNum.style.display = '';
      } else {
        mark.style.display = 'none'; markNum.style.display = 'none';
      }
      const rate = i12 != null ? (i / i12 - 1) * 100 : null;
      cap.innerHTML = `<strong>${rows[sel].label}, ${fmtM(months[k])}: <strong>${i.toFixed(2)}</strong>.</strong> `
        + (rate != null
          ? `Its mark, twelve months back, is <strong>${i12!.toFixed(2)}</strong>: divide, and the aisle prints `
            + `<span class="ai-r">${fmtPct(rate, 2)}</span> on the year.`
          : `Its mark lies before the series starts, so no rate prints yet.`);
    };

    const scrubTo = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      k = Math.max(12, Math.min(N - 1, Math.round(((x - x0) / (x1 - x0)) * (N - 1))));
      update();
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      (svg as SVGSVGElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    update();
  };

  const tabs = el('div', 'ai-tabs');
  const bs = rows.map((a, j) => {
    const b = el('button', 'ai-tab', a.label) as HTMLButtonElement;
    b.type = 'button';
    b.addEventListener('click', () => { sel = j; sync(); build(); });
    tabs.appendChild(b);
    return b;
  });
  const sync = () => bs.forEach((b, j) => b.classList.toggle('on', j === sel));
  sync();
  area.appendChild(tabs);

  let wB = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wB) { wB = w; viewW = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}// ---- headline against core (the divisions beat) ---------------------------------
// The headline on the retired 2012 series, the only one long enough to show
// the shape, with the prose's subtraction made pressable. The figure RESTS
// at core (both subtractions made — the claim the prose just stated), and
// the buttons put food and fuel back one at a time; the gold line relabels
// itself as the set changes — "minus food", "minus fuel", "core". The
// headline stays put throughout as the reference. Ends where the old
// series ends (Dec 2025); categories are never spliced across the rebase.
// Core wears the gold chart hue: ink is reserved for the index in this
// read's colour code, and every other hue already means something.

export type CoreData = {
  // nulls are a break: a month the source cannot resolve carries no figure,
  // the month axis stays calendar-true, and the lines stop and restart
  // rather than bridge. The current build has none; the handling stays.
  months: string[]; headline: (number | null)[]; exFood: (number | null)[];
  exFuel: (number | null)[]; core: (number | null)[];
};

export function initCore(fig: HTMLElement | null, cd: CoreData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.co-area')!;
  const svg = svgEl('svg', { class: 'co-svg' }) as SVGSVGElement;
  const cap = el('p', 'ix-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const N = cd.months.length;
  // the scrub only ever rests on a month that has figures
  const valid: number[] = [];
  cd.months.forEach((_, i) => { if (cd.headline[i] != null) valid.push(i); });
  let k = valid[valid.length - 1];
  // both subtractions start MADE: the resting figure shows core, the claim
  // the prose just made, and the buttons put food and fuel back in
  let food = true, fuel = true;
  let viewW = 0;

  // which derived line the toggles currently produce
  const derived = (): { vals: (number | null)[]; label: string } | null =>
    food && fuel ? { vals: cd.core, label: 'core' }
      : food ? { vals: cd.exFood, label: 'minus food' }
        : fuel ? { vals: cd.exFuel, label: 'minus fuel' }
          : null;

  const build = () => {
    const w = viewW;
    if (!w) return;
    const narrow = w < 560;
    const H = 250;
    const x0 = narrow ? 30 : 38, x1 = w - (narrow ? 62 : 92);
    const yB = H - 26, yT = 16;
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    // the domain covers every state of the toggles, so the axis never jumps
    const all = [...cd.headline, ...cd.exFood, ...cd.exFuel, ...cd.core]
      .filter((v): v is number => v != null);
    const lo = Math.min(...all, 0), hi = Math.max(...all) + 0.5;
    const Y = (v: number) => yB - ((v - lo) / (hi - lo)) * (yB - yT);

    for (const g of niceTicks(lo, hi, 4)) {
      svg.appendChild(svgEl('line', { x1: x0, y1: Y(g), x2: x1, y2: Y(g), class: g === 0 ? 'co-zero' : 'co-grid' }));
      const t = svgEl('text', { x: x0 - 6, y: Y(g) + 3, class: 'ix-ticklab', 'text-anchor': 'end' });
      t.textContent = `${g}%`;
      svg.appendChild(t);
    }
    cd.months.forEach((m, i) => {
      if (!m.endsWith('-01')) return;
      const yr = +m.slice(0, 4);
      svg.appendChild(svgEl('line', { x1: X(i), y1: yB, x2: X(i), y2: yB + 4, class: 'ix-tick' }));
      if (narrow && yr % 2 !== 0) return;
      const t = svgEl('text', { x: X(i), y: yB + 16, class: 'ix-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
      t.textContent = `’${m.slice(2, 4)}`;
      svg.appendChild(t);
    });

    // the pen lifts over the break and sets down again on the far side
    const path = (vals: (number | null)[], cls: string) => {
      let d = '', pen = false;
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? ' L' : ' M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        pen = true;
      });
      svg.appendChild(svgEl('path', { d: d.trim(), class: cls }));
    };
    path(cd.headline, 'co-head');
    const dv = derived();
    if (dv) path(dv.vals, 'co-core');

    // named ends, nudged apart when the two finish close together; the last
    // month always carries figures, the generator ends the span on one
    const ends = [{ v: cd.headline[N - 1]!, cls: 'co-endlab co-endlab-head', word: 'the headline' }];
    if (dv) ends.push({ v: dv.vals[N - 1]!, cls: 'co-endlab co-endlab-core', word: dv.label });
    ends.sort((a, b) => Y(a.v) - Y(b.v));
    let prevY = -99;
    for (const e of ends) {
      const yy = Math.max(Y(e.v) + 3.5, prevY + 13);
      prevY = yy;
      const t = svgEl('text', { x: x1 + 7, y: yy.toFixed(1), class: e.cls });
      t.textContent = e.word;
      svg.appendChild(t);
    }

    const guide = svgEl('line', { class: 'ix-guide', y1: yT, y2: yB });
    const dH = svgEl('circle', { r: 4, class: 'co-dot co-dot-head' });
    const dC = svgEl('circle', { r: 4, class: 'co-dot co-dot-core' });
    svg.append(guide, dH, dC);

    const update = () => {
      const gx = X(k);
      guide.setAttribute('x1', gx.toFixed(1)); guide.setAttribute('x2', gx.toFixed(1));
      dH.setAttribute('cx', gx.toFixed(1)); dH.setAttribute('cy', Y(cd.headline[k]!).toFixed(1));
      const d2 = derived();
      if (d2) {
        dC.setAttribute('cx', gx.toFixed(1)); dC.setAttribute('cy', Y(d2.vals[k]!).toFixed(1));
        dC.style.display = '';
      } else {
        dC.style.display = 'none';
      }
      const head = `<strong>${fmtM(cd.months[k])}: the headline prints <span class="ix-h">${fmtPct(cd.headline[k]!, 2)}</span>`;
      if (!d2) {
        cap.innerHTML = `${head}.</strong> Subtract food, then fuel: what remains is core.`;
      } else if (d2.label !== 'core') {
        cap.innerHTML = `${head}; ${d2.label}, <span class="co-g">${fmtPct(d2.vals[k]!, 2)}</span>.</strong>`;
      } else {
        const gapV = cd.headline[k]! - d2.vals[k]!;
        cap.innerHTML = `${head}; core <span class="co-g">${fmtPct(d2.vals[k]!, 2)}</span>.</strong> ${Math.abs(gapV) < 0.75
          ? 'Here the two agree: food and fuel are moving with everything else.'
          : gapV > 0
            ? 'The gap is food and fuel pulling the headline up.'
            : 'The gap is food and fuel pulling the headline down.'}`;
      }
    };

    const scrubTo = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      const raw = Math.max(0, Math.min(N - 1, Math.round(((x - x0) / (x1 - x0)) * (N - 1))));
      // the guide never rests inside the break; it takes the nearer shore
      k = valid.reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a), valid[0]);
      update();
    };
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      (svg as SVGSVGElement & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    });

    update();
  };

  // each button is labelled with the action it would take NEXT — "Add food"
  // while food sits outside, "Subtract food" once it is back in — so the
  // label carries the state and no highlight is needed
  const btns = el('div', 'co-btns');
  const mk = (noun: string, get: () => boolean, flip: () => void) => {
    const b = el('button', 'co-btn') as HTMLButtonElement;
    b.type = 'button';
    b.addEventListener('click', () => { flip(); sync(); build(); });
    btns.appendChild(b);
    return { b, noun, get };
  };
  const bs = [
    mk('food', () => food, () => { food = !food; }),
    mk('fuel', () => fuel, () => { fuel = !fuel; }),
  ];
  const sync = () => bs.forEach(({ b, noun, get }) => {
    b.textContent = get() ? `Add ${noun}` : `Subtract ${noun}`;
  });
  sync();
  area.appendChild(btns);

  let wB = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wB) { wB = w; viewW = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}

// ---- what the average hides (beat 10) ------------------------------------------
// Part II taught the reader that every item carries a weight. This is what a
// weight does when the price behind it moves: each bar is one item's
// contribution to the month's headline, its own rate times its share of the
// hundred. Silver jewellery is thirty-one paise of that hundred and beats
// petrol, which is fourteen times its size.
//
// The button is the argument. Taking the two jewellery items out re-runs the
// index the way the ministry runs it — a ratio of two weighted sums of index
// levels — over the remaining 356 items, and the headline moves. The number
// it lands on is not a subtraction; it is the same arithmetic on a smaller
// basket, which is why the reader can be shown it at all. (The build script
// refuses to emit unless the full rebuild reproduces the published headline.)

export function initContrib(fig: HTMLElement | null, ct: WildData['contrib']) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.ct-area')!;

  const wrap = el('div', 'ct-wrap');
  const head = el('div', 'ct-head');
  const bigN = el('div', 'ct-big');
  const bigL = el('div', 'ct-biglab');
  head.append(bigN, bigL);
  const svg = svgEl('svg', { class: 'ct-svg' }) as SVGSVGElement;
  const btn = el('button', 'ct-btn') as HTMLButtonElement;
  btn.type = 'button';
  const cap = el('p', 'ct-cap'); cap.setAttribute('aria-live', 'polite');
  wrap.append(head, svg, btn, cap);
  area.append(wrap);

  const JEWEL = new Set(ct.jewel.map((j) => j.code));
  const rows = ct.items;
  const maxC = Math.max(...rows.map((r) => r.c));
  let out = false;             // have the jewellery items been taken out?

  // the headline counts between the two numbers rather than jumping, so the
  // reader sees the size of what two items were doing
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, snap = 0;
  const setBig = (v: number) => { bigN.textContent = `${v.toFixed(2)}%`; };
  const goTo = (v: number) => {
    cancelAnimationFrame(raf);
    clearTimeout(snap);
    const from = parseFloat(bigN.textContent || '') || ct.published;
    if (reduced || from === v) { setBig(v); return; }
    const t0 = performance.now(), dur = 420;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setBig(from + (v - from) * (1 - (1 - p) * (1 - p)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // rAF is throttled or stopped in a backgrounded tab; the number has to be
    // right whether or not a single frame ever runs
    snap = window.setTimeout(() => { cancelAnimationFrame(raf); setBig(v); }, dur + 120);
  };

  const shortName = (s: string) => s
    .replace('Gold /diamond /platinum jewellery', 'Gold jewellery')
    .replace('LPG cylinder and piped natural gas', 'LPG, piped gas')
    .replace('Milk: liquid', 'Milk');

  const draw = () => {
    const W = area.clientWidth;
    if (!W) return;
    const narrow = W < 560;
    const rowH = narrow ? 26 : 28;
    const padT = 8;
    const labW = narrow ? 112 : 148;      // item name
    // the readout is right-ALIGNED to the frame edge, so it cannot overrun it
    // however long the widest row's numbers turn out to be
    const numW = narrow ? 60 : 178;
    const H = padT + rows.length * rowH + 6;
    const x0 = labW, x1 = W - numW;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = `${H}px`;
    svg.innerHTML = '';

    rows.forEach((r, i) => {
      const y = padT + i * rowH;
      const gone = out && JEWEL.has(r.code);
      const g = svgEl('g', { class: 'ct-row' + (gone ? ' gone' : '') + (JEWEL.has(r.code) ? ' jewel' : '') });

      const nm = svgEl('text', { x: x0 - 8, y: y + rowH / 2 + 4, class: 'ct-name', 'text-anchor': 'end' });
      nm.textContent = shortName(r.name);
      const bw = Math.max(1, (r.c / maxC) * (x1 - x0));
      const bar = svgEl('rect', {
        x: x0, y: y + 5, width: bw.toFixed(1), height: rowH - 12, rx: 2, class: 'ct-bar',
      });
      const val = svgEl('text', { x: W - 2, y: y + rowH / 2 + 4, class: 'ct-num', 'text-anchor': 'end' });
      val.textContent = narrow
        ? `${r.c.toFixed(2)} pt`
        : `${r.c.toFixed(3)} pt  ·  ₹${r.w.toFixed(2)}  ·  ${fmtPct(r.yoy, 0)}`;
      g.append(nm, bar, val);
      svg.appendChild(g);
    });
  };

  const render = () => {
    bigL.innerHTML = out
      ? `the same month, without gold and silver jewellery`
      : `retail inflation, ${fmtM(ct.m)}`;
    btn.textContent = out ? 'Put the jewellery back' : 'Take the jewellery out';
    cap.textContent = out
      ? `Two items, ₹${ct.jewelW.toFixed(2)} of the hundred between them, were worth `
        + `${(ct.published - ct.ex).toFixed(2)} points of the headline.`
      : `Each bar is one item's contribution: its own rate times its share of the ₹100. `
        + `${shortName(rows[0].name)} carries ₹${rows[0].w.toFixed(2)} and out-drives `
        + `${shortName(rows[1].name)}, which carries ₹${rows[1].w.toFixed(2)}.`;
    draw();
  };

  btn.addEventListener('click', () => {
    out = !out;
    goTo(out ? ct.ex : ct.published);
    render();
  });

  bigN.textContent = `${ct.published.toFixed(2)}%`;

  let wC = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wC) { wC = w; render(); }
  }).observe(area);

  return { refresh() { render(); } };
}

// ---- many Indias (beat 11) -----------------------------------------------------
// One month, one axis, one dot per state. The earlier version drew a decade
// of percentile bands and readers had to be told what they were looking at;
// this needs no key. The dots pile up where states actually are, All India
// stands as a single line through them, and the point — that the average
// describes no one in particular — is the picture rather than the caption.
//
// The persistence claim (the spread has never closed) moved to the prose,
// where it is a computed number rather than a shape someone has to decode.

export function initStates(fig: HTMLElement | null, sd: WildData['states']) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.sd-area')!;
  const svg = svgEl('svg', { class: 'sd-svg' }) as SVGSVGElement;
  const cap = el('p', 'sd-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const lt = sd.latest;
  const rows = lt.rows.filter((r) => !r.ai);
  const defaultCap = `${lt.n} states and union territories, ${fmtM(lt.m)}. `
    + `The lowest is ${rows[0].name} at ${rows[0].v.toFixed(2)}%, the highest `
    + `${rows[rows.length - 1].name} at ${rows[rows.length - 1].v.toFixed(2)}%. `
    + `The All-India number is ${lt.ai?.toFixed(2)}%.`;

  let layout: { x: number; y: number; r: typeof rows[number] }[] = [];
  let hot = -1;

  const draw = () => {
    const W = area.clientWidth;
    if (!W) return;
    const narrow = W < 560;
    const R = narrow ? 5 : 6;
    const x0 = narrow ? 10 : 16, x1 = W - (narrow ? 10 : 16);
    const lo = Math.min(lt.lo, lt.ai ?? lt.lo) - 0.6;
    const hi = Math.max(lt.hi, lt.ai ?? lt.hi) + 0.6;
    const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);

    // a beeswarm: each dot takes the lowest free row where nothing already
    // placed is within a diameter of it, so the pile-up IS the distribution
    const rowsUsed: number[][] = [];
    layout = rows.map((r) => {
      const x = X(r.v);
      let k = 0;
      while (rowsUsed[k]?.some((px) => Math.abs(px - x) < R * 2 + 1)) k++;
      (rowsUsed[k] ??= []).push(x);
      return { x, y: k, r };
    });

    const stack = rowsUsed.length;
    // headroom for the All-India label above the tallest column, plus a second
    // tier for state names that would otherwise collide
    const axisY = 44 + stack * (R * 2 + 2);
    const H = axisY + 40;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = `${H}px`;
    svg.innerHTML = '';

    // the percent axis the dots sit on
    for (const v of niceTicks(lo, hi, narrow ? 4 : 6)) {
      svg.appendChild(svgEl('line', { x1: X(v), y1: 20, x2: X(v), y2: axisY, class: 'sd-grid' }));
      const t = svgEl('text', { x: X(v), y: axisY + 16, class: 'mx-ticklab', 'text-anchor': 'middle' });
      t.textContent = `${v}%`;
      svg.appendChild(t);
    }
    svg.appendChild(svgEl('line', { x1: x0, y1: axisY, x2: x1, y2: axisY, class: 'sd-axis' }));

    // All India, straight through the middle of everybody
    if (lt.ai != null) {
      const ax = X(lt.ai);
      svg.appendChild(svgEl('line', { x1: ax, y1: 20, x2: ax, y2: axisY, class: 'sd-ai' }));
      const t = svgEl('text', { x: ax, y: 14, class: 'sd-ailab', 'text-anchor': ax > W - 90 ? 'end' : 'middle' });
      t.textContent = `All India ${lt.ai.toFixed(2)}%`;
      svg.appendChild(t);
    }

    for (const [i, p] of layout.entries()) {
      const cy = axisY - R - 1 - p.y * (R * 2 + 2);
      svg.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1), cy: cy.toFixed(1), r: R,
        class: 'sd-dot' + (p.r.show ? ' named' : '') + (i === hot ? ' on' : ''),
      }));
    }
    // the three states the prose names carry their own label. Two of them can
    // land a fraction of a point apart, so a name that would overlap the last
    // one placed goes up a tier and gets a leader down to its dot.
    const named = layout.filter((p) => p.r.show).sort((a, b) => a.x - b.x);
    let lastRight = -Infinity, tier = 0;
    for (const p of named) {
      const cy = axisY - R - 1 - p.y * (R * 2 + 2);
      const half = (p.r.name.length * 5.6) / 2;
      tier = p.x - half < lastRight ? 1 - tier : 0;
      lastRight = p.x + half + 10;
      const ty = cy - R - 6 - tier * 13;
      if (tier > 0) {
        svg.appendChild(svgEl('line', {
          x1: p.x.toFixed(1), y1: (ty + 3).toFixed(1), x2: p.x.toFixed(1), y2: (cy - R - 1).toFixed(1),
          class: 'sd-leader',
        }));
      }
      const t = svgEl('text', {
        x: p.x.toFixed(1), y: ty.toFixed(1), class: 'sd-name', 'text-anchor': 'middle',
      });
      t.textContent = p.r.name;
      svg.appendChild(t);
    }
  };

  // hit-test the swarm rather than binding 36 listeners
  const at = (ev: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sx = (ev.clientX - rect.left) * (vb.width / rect.width);
    const sy = (ev.clientY - rect.top) * (vb.height / rect.height);
    const R = vb.width < 560 ? 5 : 6;
    const stack = Math.max(...layout.map((p) => p.y)) + 1;
    const axisY = 44 + stack * (R * 2 + 2);
    let best = -1, bestD = Infinity;
    layout.forEach((p, i) => {
      const cy = axisY - R - 1 - p.y * (R * 2 + 2);
      const d = (p.x - sx) ** 2 + (cy - sy) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    return bestD <= (R + 5) ** 2 ? best : -1;
  };

  const say = () => {
    const p = layout[hot];
    // the hovered state's name wears the same saffron its dot just took
    cap.innerHTML = p
      ? `<span class="sd-hot">${p.r.name}</span>: ${p.r.v.toFixed(2)}% in ${fmtM(lt.m)}`
        + (lt.ai != null ? `, against ${lt.ai.toFixed(2)}% for the country.` : '.')
      : defaultCap;
  };

  svg.addEventListener('pointermove', (ev) => {
    const h = at(ev);
    if (h === hot) return;
    hot = h; draw(); say();
  });
  svg.addEventListener('pointerleave', () => { if (hot !== -1) { hot = -1; draw(); say(); } });

  let wS = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wS) { wS = w; draw(); say(); }
  }).observe(area);

  return { refresh() { draw(); say(); } };
}

// ---- the staircase (beat 12) ---------------------------------------------------
// The repo rate as a staircase over headline inflation, 2014 to now. The
// policy rate is hand-keyed from RBI MPC announcements (administrative
// record); the CPI line is the published YoY, 2012-base to Dec 2025 and
// 2024-base after — the figcaption owns the seam. No interaction: the shape
// is the story, a rate answering a rate.

export function initRepo(fig: HTMLElement | null, rp: WildData['repo']) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.ro-area')!;
  const svg = svgEl('svg', { class: 'ro-svg' }) as SVGSVGElement;
  area.appendChild(svg);

  const months = rp.cpi.map((r) => r.m);
  const N = months.length;

  const build = () => {
    const w = area.clientWidth;
    if (!w) return;
    const narrow = w < 560;
    // on narrow the end labels move to a legend above the plot: they were
    // eating a quarter of the width, which is what squeezed the staircase
    // into a picket fence
    const H = narrow ? 296 : 280;
    const x0 = narrow ? 32 : 40, x1 = w - (narrow ? 10 : 118);
    const y0 = narrow ? 40 : 22, y1 = H - 34;
    const vals = rp.cpi.map((r) => r.yoy).filter((v): v is number => v != null);
    const lo = Math.min(0, ...vals, ...rp.steps.map((s) => s.r)) - 0.4;
    const hi = Math.max(...vals, ...rp.steps.map((s) => s.r)) + 0.6;
    const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
    const Y = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
    const mi = (m: string) => months.indexOf(m);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.classList.toggle('narrow', narrow);
    svg.innerHTML = '';

    months.forEach((m, i) => {
      if (!m.endsWith('-01') || +m.slice(2, 4) % 2 !== 0) return;
      svg.appendChild(svgEl('line', { x1: X(i), y1: y1 + 2, x2: X(i), y2: y1 + 6, class: 'mx-tick' }));
      const t = svgEl('text', { x: X(i), y: y1 + 18, class: 'mx-ticklab', 'text-anchor': i === 0 ? 'start' : 'middle' });
      t.textContent = `’${m.slice(2, 4)}`;
      svg.appendChild(t);
    });
    // a percent axis; the mandate rules below then read as positions on it
    for (const v of niceTicks(lo, hi, narrow ? 3 : 4)) {
      if (v === 0) svg.appendChild(svgEl('line', { x1: x0, y1: Y(0), x2: x1, y2: Y(0), class: 'bs-zero' }));
      const t = svgEl('text', { x: x0 - 4, y: Y(v) + 3.5, class: 'mx-ticklab', 'text-anchor': 'end' });
      t.textContent = `${v}%`;
      svg.appendChild(t);
    }
    // the mandate, as three rules rather than a wash. The old 5%-opacity fill
    // was invisible, and worse, it drew 2 and 6 as edges and never drew 4 —
    // the one number the section is actually about.
    for (const v of [2, 6]) {
      svg.appendChild(svgEl('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: 'ro-tol' }));
    }
    svg.appendChild(svgEl('line', { x1: x0, y1: Y(4), x2: x1, y2: Y(4), class: 'ro-target' }));
    const tgtLab = svgEl('text', { x: x0 + 4, y: Y(4) - 5, class: 'ro-bandlab' });
    tgtLab.textContent = narrow ? 'target 4%' : 'the target: 4%';
    svg.appendChild(tgtLab);
    const tolLab = svgEl('text', { x: x0 + 4, y: Y(6) - 5, class: 'ro-bandlab' });
    tolLab.textContent = narrow ? '± 2' : 'give or take 2';
    svg.appendChild(tolLab);

    let dC = '', pen = false;
    rp.cpi.forEach((r, i) => {
      if (r.yoy == null) { pen = false; return; }
      dC += `${pen ? ' L' : ' M'} ${X(i).toFixed(1)} ${Y(r.yoy).toFixed(1)}`;
      pen = true;
    });
    svg.appendChild(svgEl('path', { d: dC.trim(), class: 'ro-cpi' }));

    let dR = '';
    rp.steps.forEach((s, si) => {
      const i = Math.max(0, mi(s.m));
      const xs = X(i);
      if (si === 0) { dR = `M ${xs.toFixed(1)} ${Y(s.r).toFixed(1)}`; return; }
      dR += ` H ${xs.toFixed(1)} V ${Y(s.r).toFixed(1)}`;
    });
    dR += ` H ${x1.toFixed(1)}`;
    svg.appendChild(svgEl('path', { d: dR, class: 'ro-repo' }));

    const last = rp.steps.at(-1)!;
    const lastC = [...rp.cpi].reverse().find((r) => r.yoy != null)!;
    if (narrow) {
      // a legend along the top, one swatch each, so the plot keeps the width
      let lx = x0;
      const key = (cls: string, txt: string) => {
        svg.appendChild(svgEl('line', { x1: lx, y1: 14, x2: lx + 16, y2: 14, class: cls }));
        const t = svgEl('text', { x: lx + 21, y: 18, class: 'ro-lab ro-lab2' });
        t.textContent = txt;
        svg.appendChild(t);
        lx += 21 + txt.length * 5.6 + 16;
      };
      key('ro-repo', `repo ${last.r.toFixed(2)}%`);
      key('ro-cpi', `CPI ${fmtPct(lastC.yoy as number, 2)}`);
      return;
    }
    let yRepo = Y(last.r), yCpi = Y(lastC.yoy as number);
    if (Math.abs(yRepo - yCpi) < 30) { const mid = (yRepo + yCpi) / 2; yRepo = mid + (yRepo >= yCpi ? 15 : -15); yCpi = mid + (yCpi > yRepo ? 15 : -15); }
    const lab = (y: number, l1: string, l2: string, cls: string) => {
      const a = svgEl('text', { x: x1 + 8, y: y - 2, class: `ro-lab ${cls}` }); a.textContent = l1;
      const b = svgEl('text', { x: x1 + 8, y: y + 12, class: `ro-lab ro-lab2 ${cls}` }); b.textContent = l2;
      svg.append(a, b);
    };
    lab(yRepo, `${last.r.toFixed(2)}%`, 'the repo rate', 'ro-lab-repo');
    lab(yCpi, fmtPct(lastC.yoy as number, 2), 'CPI, on the year', 'ro-lab-cpi');
  };

  let wR = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wR) { wR = w; build(); }
  }).observe(area);

  return { refresh() { build(); } };
}

// ---- the close: the tree, merged (beat 12) -------------------------------------
// The read opens on one saffron line and says nothing about where it comes
// from. It closes on the same line with the whole tree behind it: 358 item
// strands in green folding into sub-classes, into classes, into groups, into
// divisions, into the headline. Not a motif — the topology is the real
// parent-child structure from `pyramid.tree`, so every junction in the
// drawing is a merge that actually happens.
//
// The floors are smooth curves; only the last stretch is a real series. A
// tree of 667 jagged lines reads as noise, and the jaggedness has nowhere to
// come from anyway — the 2024-base COICOP series is eighteen months old. The
// headline has 148 months, so it alone runs as its published path, which is
// the same line the read opened on, arriving at the same number.
//
// The reveal is a pen, not a pan. A single drawing front sits at a fixed
// point about seven-tenths across the frame, and the camera is slaved to it:
// strands grow at the pen line, the paper ahead of it is visibly blank, and
// finished floors slide out to the left. Green is still leaving while purple
// is still merging. When the pen reaches the last stretch the camera parks,
// and the headline's jagged line draws the rest of the way into the number
// on its own — the same finish as the opening.
//
// The pen must sit well inside the frame. An earlier cut drove the drawing
// from the camera instead, and the maths pinned every floor's front to the
// frame's right edge — strands materialised exactly where the frame ended,
// which is indistinguishable from panning over prebuilt art. Empty canvas
// ahead of the front is what proves the ink is being laid down now.
//
// The clock has two phases, split where the tree hands over to the headline.
// One easing over the whole travel cannot serve both: the opening's curve
// covers most of its distance in the first half, and stretched across two
// and a half screen-widths that crammed all five merges into one blurred
// second — a fast pan, with the only watchable drawing starting mid-
// headline. So the tree gets a near-linear phase at a pace the eye can
// follow, and the headline stretch then replays the opening bookend's own
// curve, so the read ends exactly the way it began: the same line, slowing
// the same way, into the same number fading in at the end.

const MERGE_LEVELS = ['item', 'subclass', 'class', 'group', 'division', 'general'];
const MERGE_MS = 6000;
/** the tree's share of the pen's travel — treeEnd in build() must agree */
const TREE_D = 0.66;
/** the tree's share of the clock */
const TREE_T = 0.55;

const bez = (x1: number, y1: number, x2: number, y2: number) => {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;
  const at = (s: number, a: number, b: number) => ((A(a, b) * s + B(a, b)) * s + C(a)) * s;
  const slope = (s: number, a: number, b: number) => 3 * A(a, b) * s * s + 2 * B(a, b) * s + C(a);
  return (t: number) => {
    let s = t;
    for (let i = 0; i < 6; i++) {
      const d = slope(s, x1, x2);
      if (!d) break;
      s -= (at(s, x1, x2) - t) / d;
    }
    return at(s, y1, y2);
  };
};
/** the CSS cubic-bezier(0.33, 0.33, 0.12, 1) the opening bookend eases on */
const mergeEase = bez(0.33, 0.33, 0.12, 1);
/** near-linear with a soft landing, so the tree phase ends at rest and the
 *  headline phase (which starts at slope one) picks up without a lurch */
const treeEase = bez(0.33, 0.33, 0.58, 1);

/** clock fraction → pen fraction: the tree, then the opening's own curve */
const mergeSchedule = (p: number) =>
  p < TREE_T
    ? TREE_D * treeEase(p / TREE_T)
    : TREE_D + (1 - TREE_D) * mergeEase((p - TREE_T) / (1 - TREE_T));

type MergeBand = { paths: SVGPathElement[]; lens: number[]; xa: number; xb: number; u: number };

export function initMerge(
  fig: HTMLElement | null,
  py: PyramidData,
  headline: number | null,
  headlinePts: number[],
  getYours?: () => { mine: number; untouched: boolean; empty: boolean } | null | undefined,
) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.sc-area')!;
  const nodes = py.tree ?? [];
  if (!nodes.length) return { refresh() {} };
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const byCode = new Map(nodes.map((n) => [n.code, n]));
  // sorted by code so a parent's children are contiguous and no strand has to
  // cross another to reach its parent
  const rows = MERGE_LEVELS.map((lvl) =>
    nodes.filter((n) => n.level === lvl).sort((a, b) => a.code.localeCompare(b.code)));
  const trueCounts = rows.map((r) => r.length);

  const svg = svgEl('svg', { class: 'st-svg', 'aria-hidden': 'true' }) as SVGSVGElement;
  area.appendChild(svg);

  let cam: SVGGElement | null = null;
  let bands: MergeBand[] = [];
  let fades: { el: SVGElement; band: number }[] = [];
  let pan = 0, penX0 = 0, penX1 = 0, penOff = 0;

  const build = () => {
    const W = area.clientWidth;
    if (!W) return;
    const narrow = W < 560;
    const H = narrow ? 260 : 320;
    const padT = 18, padB = 26;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = `${H}px`;
    svg.innerHTML = '';
    bands = [];
    fades = [];

    // Reduced motion gets no camera: the content is laid out to fit the frame
    // exactly, so the whole tree is legible in one still.
    const spanX = reduced ? W : W * 2.5;
    pan = spanX - W;
    const x0 = narrow ? 4 : 8;
    // wide enough for the opening's 17px number and its spaced-out sub-label
    const numSpace = narrow ? 96 : 104;
    const xEnd = spanX - numSpace;
    // the pen travels the whole content; the camera follows so the pen holds
    // still about seven-tenths across the frame, with blank paper ahead of it
    penX0 = x0;
    penX1 = xEnd;
    penOff = W * 0.72;
    // five merges across the first two-thirds; the headline's own series runs
    // the last third, because it is the only line here with a history
    const treeEnd = x0 + (xEnd - x0) * TREE_D;
    const xAt = (j: number) => x0 + (j / 5) * (treeEnd - x0);
    if (xEnd - treeEnd < 24) throw new Error('merge close: the headline run collapsed');

    // a soft left edge so strands leaving frame dissolve rather than being
    // guillotined
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'st-edge', x1: '0', x2: '1', y1: '0', y2: '0' });
    for (const [off, op] of [['0', '0'], ['0.07', '1'], ['1', '1']]) {
      grad.appendChild(svgEl('stop', { offset: off, 'stop-color': '#fff', 'stop-opacity': op }));
    }
    const mask = svgEl('mask', { id: 'st-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H });
    mask.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#st-edge)' }));
    defs.append(grad, mask);
    svg.appendChild(defs);

    const frame = svgEl('g', reduced ? {} : { mask: 'url(#st-mask)' }) as SVGGElement;
    cam = svgEl('g', { class: 'st-cam' }) as SVGGElement;
    frame.appendChild(cam);
    svg.appendChild(frame);

    // 358 strands in 260px of phone is mush; thin the item row and let the
    // label carry the true count
    const capN = narrow ? 150 : 400;
    const drawn = rows.map((r, j) => {
      if (j > 0 || r.length <= capN) return r;
      const step = Math.ceil(r.length / capN);
      return r.filter((_, i) => i % step === 0);
    });

    // every floor spread over the same vertical span, so the merges read as a
    // narrowing rather than a set of unrelated columns
    const span = H - padT - padB;
    const yOf = rows.map((r) => {
      const m = new Map<string, number>();
      r.forEach((n, i) => m.set(n.code, r.length === 1 ? padT + span / 2 : padT + (i / (r.length - 1)) * span));
      return m;
    });
    const yOne = padT + span / 2;

    // the headline's own path, laid out first so the divisions can aim at
    // where it actually begins
    const hp = headlinePts.length > 1 ? headlinePts : [0, 0];
    const hLo = Math.min(...hp), hSpan = (Math.max(...hp) - hLo) || 1;
    // the opening bookend maps the same series across ~186px of a 720-wide
    // viewBox; the close matches that vertical scale, so the line arrives at
    // the same zoom the read opened on
    const hAmp = narrow ? 48 : 90;
    const hY = (k: number) => yOne - ((hp[k] - hLo) / hSpan - 0.5) * 2 * hAmp;
    const hX = (k: number) => treeEnd + (k / (hp.length - 1)) * (xEnd - treeEnd);

    for (let j = 0; j < 5; j++) {
      const xa = xAt(j), xb = xAt(j + 1);
      const dx = (xb - xa) * 0.45;
      const paths: SVGPathElement[] = [], lens: number[] = [];
      for (const n of drawn[j]) {
        const ya = yOf[j].get(n.code);
        const parent = n.parent ? byCode.get(n.parent) : null;
        const yb = j === 4 ? hY(0) : (parent ? yOf[j + 1].get(parent.code) : undefined);
        if (ya == null || yb == null) continue;
        const p = svgEl('path', {
          d: `M ${xa.toFixed(1)} ${ya.toFixed(1)} C ${(xa + dx).toFixed(1)} ${ya.toFixed(1)}, `
            + `${(xb - dx).toFixed(1)} ${yb.toFixed(1)}, ${xb.toFixed(1)} ${yb.toFixed(1)}`,
          class: `st-fl st-fl-${MERGE_LEVELS[j]}`,
        }) as SVGPathElement;
        cam.appendChild(p);
        paths.push(p);
        // a flat-ended cubic is a shade longer than the straight line between
        // its ends; measuring 667 paths for exactness is not worth a layout
        lens.push(Math.hypot(xb - xa, yb - ya) * 1.08);
      }
      bands.push({ paths, lens, xa, xb, u: -1 });
    }

    // the last band: the headline itself, its published path, arriving at the
    // number the read opened on
    let dOne = '';
    for (let k = 0; k < hp.length; k++) dOne += `${k ? ' L' : 'M'} ${hX(k).toFixed(1)} ${hY(k).toFixed(1)}`;
    const onePath = svgEl('path', { d: dOne, class: 'st-one' }) as SVGPathElement;
    cam.appendChild(onePath);
    let hLen = 0;
    for (let k = 1; k < hp.length; k++) hLen += Math.hypot(hX(k) - hX(k - 1), hY(k) - hY(k - 1));
    bands.push({ paths: [onePath], lens: [hLen], xa: treeEnd, xb: xEnd, u: -1 });

    // the ending is the opening's, verbatim: the dot, the number, the sub —
    // all held back and faded in by the done class, not by the pen
    const sign = headline != null && headline > 0 ? '+' : '';
    const numY = hY(hp.length - 1);
    const dot = svgEl('circle', { cx: xEnd, cy: numY, r: 4, class: 'st-dot' });
    const num = svgEl('text', { x: xEnd + 12, y: numY + 1, class: 'st-num' });
    num.textContent = headline == null ? '—' : `${sign}${headline.toFixed(2)}%`;
    const sub = svgEl('text', { x: xEnd + 12, y: numY + 17, class: 'st-sub' });
    sub.textContent = 'on the year';
    cam.append(dot, num, sub);

    // floor names, with the counts that stay true where the drawing is thinned
    const LABELS = ['items', 'sub-classes', 'classes', 'groups', 'divisions'];
    for (let j = 0; j < 5; j++) {
      const t = svgEl('text', {
        x: (xAt(j) + xAt(j + 1)) / 2, y: H - 8, class: 'st-flab', 'text-anchor': 'middle',
      });
      t.textContent = `${trueCounts[j]} ${LABELS[j]}`;
      cam.appendChild(t);
      fades.push({ el: t, band: j });
    }
    const th = svgEl('text', {
      x: (treeEnd + xEnd) / 2, y: H - 8, class: 'st-flab', 'text-anchor': 'middle',
    });
    th.textContent = 'the headline, since 2014';
    cam.appendChild(th);
    fades.push({ el: th, band: 5 });

    // the reader's own line: it rides out with the headline and never joins
    const yours = getYours?.();
    if (yours && !yours.untouched && !yours.empty && Number.isFinite(yours.mine)) {
      const yY = numY + (yours.mine >= (headline ?? 0) ? -26 : 26);
      const yx = treeEnd + (xEnd - treeEnd) * 0.55;
      const yp = svgEl('path', {
        d: `M ${yx.toFixed(1)} ${yY.toFixed(1)} L ${xEnd.toFixed(1)} ${yY.toFixed(1)}`,
        class: 'st-you',
      }) as SVGPathElement;
      cam.appendChild(yp);
      bands[5].paths.push(yp);
      bands[5].lens.push(xEnd - yx);
      const yn = svgEl('text', { x: xEnd + 12, y: yY + 1, class: 'st-num st-you-num' });
      yn.textContent = `${yours.mine > 0 ? '+' : ''}${yours.mine.toFixed(2)}%`;
      const ys = svgEl('text', { x: xEnd + 12, y: yY + 17, class: 'st-sub' });
      ys.textContent = 'yours';
      cam.append(yn, ys);
    }

    // hide the ink before the first paint, so the draw-in is the first thing
    // the reader ever sees
    for (const b of bands) {
      b.paths.forEach((p, i) => {
        p.style.strokeDasharray = String(b.lens[i]);
        p.style.strokeDashoffset = String(reduced ? 0 : b.lens[i]);
      });
    }
    frameAt(reduced ? 1 : 0);
  };

  /** move the pen along the content, then place the camera so the pen holds still in frame */
  const frameAt = (e: number) => {
    if (!cam) return;
    const pen = penX0 + (penX1 - penX0) * e;
    // the camera follows the pen until it runs out of track; from there it
    // parks, and the pen finishes the headline's last stretch inside a still
    // frame — the drawing itself is the only thing left moving
    const camL = reduced ? 0 : Math.min(pan, pen - penOff);
    cam.style.transform = `translateX(${(-camL).toFixed(2)}px)`;
    for (const b of bands) {
      const u = Math.max(0, Math.min(1, (pen - b.xa) / (b.xb - b.xa)));
      if (u === b.u) continue;
      b.u = u;
      b.paths.forEach((p, i) => { p.style.strokeDashoffset = String(b.lens[i] * (1 - u)); });
    }
    for (const f of fades) f.el.style.opacity = String(bands[f.band]?.u ?? 1);
  };

  let played = false, finished = false, progress = 0;
  let io: IntersectionObserver | null = null;
  let watching = false, raf = 0;
  /** at least a third of the figure actually on screen */
  const inView = () => {
    const r = svg.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.height > 0 && (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height >= 0.3;
  };
  const settle = () => {
    cancelAnimationFrame(raf);
    progress = 1;
    finished = true;
    frameAt(1);
    svg.classList.add('done');
  };
  const play = (fromP = 0) => {
    cancelAnimationFrame(raf);
    // the clock starts on the first frame that actually runs, not on the call.
    // A tab that is not painting freezes rAF, and timing from the call would
    // make the reveal jump most of the way through the moment it resumes.
    let t0 = 0;
    const step = (now: number) => {
      if (!t0) t0 = now - fromP * MERGE_MS;
      progress = Math.min(1, (now - t0) / MERGE_MS);
      frameAt(mergeSchedule(progress));
      // the number starts fading in during the final crawl, not after it —
      // the same overlap the opening uses (done at 3.2s of its 3.5)
      if (progress >= 0.94) svg.classList.add('done');
      if (progress < 1) raf = requestAnimationFrame(step);
      else finished = true;
    };
    raf = requestAnimationFrame(step);
  };

  // The reveal must fire when the figure is ON SCREEN and never before: it is
  // the last thing in the read, so anything time-based plays it to an empty
  // room and the reader arrives to a finished drawing. The scroll fallback
  // exists because IntersectionObserver does not fire in a tab that is not
  // painting, but it is gated on the same visibility test rather than on a
  // clock, so it can only ever be early in the same way IO would be.
  const onScroll = () => { if (inView()) go(); };
  const go = () => {
    if (played || !cam) return;
    played = true;
    io?.disconnect();
    if (watching) {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      watching = false;
    }
    play();
  };
  const arm = () => {
    io?.disconnect();
    if (reduced) { settle(); return; }
    frameAt(0);
    io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) go();
    }, { threshold: 0.3 });
    io.observe(svg);
    if (!watching) {
      watching = true;
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll, { passive: true });
    }
    requestAnimationFrame(() => { if (!played && inView()) go(); });
  };

  // a reader who arrives with the figure already on screen sees the reveal
  // fire at once and can easily miss it; clicking replays it
  svg.style.cursor = 'pointer';
  svg.addEventListener('click', () => {
    if (reduced) return;
    cancelAnimationFrame(raf);
    finished = false; progress = 0;
    svg.classList.remove('done');
    frameAt(0);
    played = true;
    play(0);
  });

  /** redraw at the current width, then put the reveal back where it was */
  const rebuild = () => {
    build();
    if (reduced || finished) settle();
    else if (played) play(progress);   // mid-flight: resume, do not snap to the end
    else arm();
  };

  let wM = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (!w || w === wM) return;
    wM = w;
    rebuild();
  }).observe(area);

  // refresh() fires on theme changes and once when fonts land — the second of
  // which lands squarely in the middle of the reveal. Every colour here comes
  // from CSS, so nothing needs redrawing at the same width; rebuilding anyway
  // was what snapped the tree to its finished frame before anyone saw it move.
  return {
    refresh() {
      const w = area.clientWidth;
      if (!w || w === wM) return;
      wM = w;
      rebuild();
    },
  };
}

// ---- the close (Part III): the opening bookend again, with company --------------
// The strands-merge close (initMerge/initStrands, kept above but unused) was
// retired on review (2026-08-01); a 6-month "zoom" close was tried the same
// day and retired within hours — six points cannot be jagged, and the close
// must rhyme with the open. So the close IS the opening drawing: the same
// 148-month headline line, same stroke draw, same pace. The revelation is
// what arrives as the pen finishes: over the line's final months, a short
// teal line in the reader's hue — education in Delhi (Part I's stand-in for
// "your life"), or the reader's own basket if the Part I dials were set —
// ending high above the saffron dot, labeled, never joining. (A long teal
// line is not honestly available: the education division exists across the
// rebase only as two different-base series, and the read permits the
// cross-base splice for the headline alone.)
//
// Interaction: click replays the draw; re-entering the viewport after the
// Part I dials changed redraws with the current companion, so the bookend
// always shows the reader's latest basket.

type YoursState = {
  mine: number; untouched: boolean; empty: boolean;
  months?: string[]; series?: number[];
};
type CloseComp = { label: string; xs: number[]; vs: number[] };

export function initClose(
  fig: HTMLElement | null,
  ol: OneLineData,
  gap: GapData,
  getYours?: () => YoursState | undefined,
) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.sc-area')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pts = ol.points;
  if (pts.length < 2) return { refresh() {} };
  const mIdx = new Map(pts.map((p, i) => [p.m, i] as const));

  const W = 720, H = 250;
  const padT = 24, padB = 14, padL = 8;
  const xEnd = W - 118;

  const svg = svgEl('svg', { class: 'sc-svg', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }) as SVGSVGElement;
  area.appendChild(svg);

  // the companion: the reader's own basket when the Part I dials were set,
  // education in Delhi otherwise — both mapped onto the opening line's
  // month axis, drawn only over the months they really exist
  const companion = (): CloseComp | null => {
    const y = getYours?.();
    if (y && !y.untouched && !y.empty && y.series && y.months && y.series.length > 1) {
      const xs: number[] = [], vs: number[] = [];
      y.months.forEach((m, k) => {
        const i = mIdx.get(m);
        if (i != null && y.series![k] != null) { xs.push(i); vs.push(y.series![k]); }
      });
      if (xs.length > 1) return { label: 'your basket', xs, vs };
    }
    const rows = gap.months.filter((r) => r.edu != null && mIdx.has(r.m));
    if (rows.length > 1) return { label: 'education in Delhi', xs: rows.map((r) => mIdx.get(r.m)!), vs: rows.map((r) => r.edu!) };
    return null;
  };
  const keyOf = (c: CloseComp | null) => (c ? `${c.label}|${c.vs.map((v) => v.toFixed(2)).join(',')}` : '');

  let headPath: SVGPathElement | null = null;
  let compPath: SVGPathElement | null = null;
  let lastKey: string | null = null;
  let played = false;

  const draw = (comp: CloseComp | null) => {
    svg.innerHTML = '';
    const hv = pts.map((p) => p.v);
    const all = comp ? [...hv, ...comp.vs] : hv;
    const lo = Math.min(...all), hi = Math.max(...all);
    const span = hi - lo || 1;
    const X = (k: number) => padL + (k / (pts.length - 1)) * (xEnd - padL);
    const Y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB);

    let d = `M ${X(0).toFixed(1)} ${Y(hv[0]).toFixed(1)}`;
    for (let k = 1; k < hv.length; k++) d += ` L ${X(k).toFixed(1)} ${Y(hv[k]).toFixed(1)}`;
    headPath = svgEl('path', { d, class: 'sc-line sc-line-head' }) as SVGPathElement;
    svg.appendChild(headPath);

    compPath = null;
    if (comp) {
      let dc = `M ${X(comp.xs[0]).toFixed(1)} ${Y(comp.vs[0]).toFixed(1)}`;
      for (let k = 1; k < comp.xs.length; k++) dc += ` L ${X(comp.xs[k]).toFixed(1)} ${Y(comp.vs[k]).toFixed(1)}`;
      compPath = svgEl('path', { d: dc, class: 'sc-line sc-line-you' }) as SVGPathElement;
      svg.appendChild(compPath);
    }

    // end labels, dodged apart when the two finish close together
    const ends = [{ v: hv[hv.length - 1], x: xEnd, cls: 'head', word: 'the headline' }]
      .concat(comp ? [{ v: comp.vs[comp.vs.length - 1], x: X(comp.xs[comp.xs.length - 1]), cls: 'you', word: comp.label }] : [])
      .map((e) => ({ ...e, y: Y(e.v) }));
    if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 36) {
      const mid = (ends[0].y + ends[1].y) / 2;
      const [up, dn] = ends[0].y <= ends[1].y ? [ends[0], ends[1]] : [ends[1], ends[0]];
      up.y = mid - 18; dn.y = mid + 18;
    }
    for (const e of ends) {
      const yy = Math.max(padT + 6, Math.min(H - padB - 20, e.y));
      svg.appendChild(svgEl('circle', { cx: e.x, cy: Y(e.v), r: e.cls === 'head' ? 4 : 3.5, class: `sc-dot sc-dot-${e.cls}` }));
      const num = svgEl('text', { x: e.x + 12, y: yy + 1, class: `st-num sc-num-${e.cls}` });
      num.textContent = `${e.v > 0 ? '+' : ''}${e.v.toFixed(2)}%`;
      const sub = svgEl('text', { x: e.x + 12, y: yy + 16, class: 'st-sub' });
      // the gutter fits ~14 mono characters — "education in Delhi" wraps to
      // two tspans instead of clipping at the viewBox edge
      if (e.word.length > 14) {
        const cut = e.word.lastIndexOf(' ', 14);
        const lines = cut > 0 ? [e.word.slice(0, cut), e.word.slice(cut + 1)] : [e.word];
        lines.forEach((ln, i) => {
          const ts = svgEl('tspan', { x: e.x + 12, dy: i === 0 ? 0 : 12 });
          ts.textContent = ln;
          sub.appendChild(ts);
        });
      } else {
        sub.textContent = e.word;
      }
      svg.append(num, sub);
    }
  };

  const arm = () => {
    for (const p of [headPath, compPath]) {
      if (!p) continue;
      const L = p.getTotalLength();
      p.style.transition = 'none';
      p.style.strokeDasharray = String(L);
      p.style.strokeDashoffset = String(L);
    }
  };

  const play = () => {
    const comp = companion();
    lastKey = keyOf(comp);
    draw(comp);
    if (reduced) { svg.classList.add('done'); return; }
    svg.classList.remove('done');
    arm();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (headPath) {
        headPath.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.33, 0.33, 0.12, 1)';
        headPath.style.strokeDashoffset = '0';
      }
      // the companion strokes in as the headline's draw reaches its months
      if (compPath) {
        compPath.style.transition = 'stroke-dashoffset 0.7s ease-out 3.05s';
        compPath.style.strokeDashoffset = '0';
      }
      setTimeout(() => svg.classList.add('done'), 3600);
    }));
  };

  if (reduced) {
    play();
  } else {
    draw(companion());
    arm();
  }

  // never disconnected: the first entry plays the draw; later entries replay
  // it only if the Part I dials changed the companion since the last draw
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    if (!played) { played = true; if (!reduced) play(); lastKey = lastKey ?? keyOf(companion()); return; }
    if (keyOf(companion()) !== lastKey) play();
  }, { threshold: 0.45 });
  io.observe(svg);

  // a tap replays the drawing (and picks up the current dials)
  area.style.cursor = 'pointer';
  area.addEventListener('click', () => { played = true; play(); });

  return { refresh() { /* colors are CSS vars; nothing to re-render */ } };
}

// ---- the close, layered variant: the opening line with its interior visible ----
// Alternative close under review (2026-08-01, vs initClose above): the same
// 148-month drawing, but with a static haze of thin ink strands behind it —
// the six groups of the RETIRED 2012 basket, each its own published YoY
// series, ending in December 2025 where the basket that defined them did;
// the 2026 tail's texture is the twelve new divisions from yourBasket.ser.
// No cross-base joining anywhere: strands end, new strands begin. Ink, not
// hues — the haze is what the line is made of, not a character. The teal
// companion (education in Delhi / your basket) and all of initClose's
// interaction (tap to redraw, redraw when the Part I dials change) carry
// over unchanged.

type CloseLayers = { groups: { name: string; months: string[]; yoy: (number | null)[] }[] };
type CloseSer = { months: string[]; divisions: { infl: (number | null)[] }[] } | undefined;

export function initCloseLayers(
  fig: HTMLElement | null,
  ol: OneLineData,
  layers: CloseLayers | undefined,
  ser: CloseSer,
  gap: GapData,
  getYours?: () => YoursState | undefined,
) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.sc-area')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pts = ol.points;
  if (pts.length < 2) return { refresh() {} };
  const mIdx = new Map(pts.map((p, i) => [p.m, i] as const));

  const W = 720, H = 250;
  const padT = 24, padB = 14, padL = 8;
  const xEnd = W - 118;

  const svg = svgEl('svg', { class: 'sc-svg', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }) as SVGSVGElement;
  area.appendChild(svg);

  // every strand as (oneLine month index, value) pairs, precomputed once
  type Strand = { xs: number[]; vs: number[] };
  const strands: Strand[] = [];
  for (const g of layers?.groups ?? []) {
    const xs: number[] = [], vs: number[] = [];
    g.months.forEach((m, k) => {
      const i = mIdx.get(m);
      const v = g.yoy[k];
      if (i != null && v != null) { xs.push(i); vs.push(v); }
    });
    if (xs.length > 1) strands.push({ xs, vs });
  }
  if (ser) {
    for (const d of ser.divisions) {
      const xs: number[] = [], vs: number[] = [];
      ser.months.forEach((m, k) => {
        const i = mIdx.get(m);
        const v = d.infl[k];
        if (i != null && v != null) { xs.push(i); vs.push(v); }
      });
      if (xs.length > 1) strands.push({ xs, vs });
    }
  }

  const companion = (): CloseComp | null => {
    const y = getYours?.();
    if (y && !y.untouched && !y.empty && y.series && y.months && y.series.length > 1) {
      const xs: number[] = [], vs: number[] = [];
      y.months.forEach((m, k) => {
        const i = mIdx.get(m);
        if (i != null && y.series![k] != null) { xs.push(i); vs.push(y.series![k]); }
      });
      if (xs.length > 1) return { label: 'your basket', xs, vs };
    }
    const rows = gap.months.filter((r) => r.edu != null && mIdx.has(r.m));
    if (rows.length > 1) return { label: 'education in Delhi', xs: rows.map((r) => mIdx.get(r.m)!), vs: rows.map((r) => r.edu!) };
    return null;
  };
  const keyOf = (c: CloseComp | null) => (c ? `${c.label}|${c.vs.map((v) => v.toFixed(2)).join(',')}` : '');

  let headPath: SVGPathElement | null = null;
  let compPath: SVGPathElement | null = null;
  let lastKey: string | null = null;
  let played = false;

  const draw = (comp: CloseComp | null) => {
    svg.innerHTML = '';
    const hv = pts.map((p) => p.v);
    // the scale must hold everything drawn — haze included — or strands clip
    const all = [...hv, ...strands.flatMap((s) => s.vs), ...(comp ? comp.vs : [])];
    const lo = Math.min(...all), hi = Math.max(...all);
    const span = hi - lo || 1;
    const X = (k: number) => padL + (k / (pts.length - 1)) * (xEnd - padL);
    const Y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB);
    const pathOf = (xs: number[], vs: number[], cls: string) => {
      let d = `M ${X(xs[0]).toFixed(1)} ${Y(vs[0]).toFixed(1)}`;
      for (let k = 1; k < xs.length; k++) d += ` L ${X(xs[k]).toFixed(1)} ${Y(vs[k]).toFixed(1)}`;
      return svgEl('path', { d, class: cls }) as SVGPathElement;
    };

    // the haze first, so everything else rides above it
    for (const s of strands) svg.appendChild(pathOf(s.xs, s.vs, 'sc-strand'));

    headPath = pathOf(pts.map((_, i) => i), hv, 'sc-line sc-line-head');
    svg.appendChild(headPath);
    compPath = comp ? pathOf(comp.xs, comp.vs, 'sc-line sc-line-you') : null;
    if (compPath) svg.appendChild(compPath);

    const ends = [{ v: hv[hv.length - 1], x: xEnd, cls: 'head', word: 'the headline' }]
      .concat(comp ? [{ v: comp.vs[comp.vs.length - 1], x: X(comp.xs[comp.xs.length - 1]), cls: 'you', word: comp.label }] : [])
      .map((e) => ({ ...e, y: Y(e.v) }));
    if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 36) {
      const mid = (ends[0].y + ends[1].y) / 2;
      const [up, dn] = ends[0].y <= ends[1].y ? [ends[0], ends[1]] : [ends[1], ends[0]];
      up.y = mid - 18; dn.y = mid + 18;
    }
    for (const e of ends) {
      const yy = Math.max(padT + 6, Math.min(H - padB - 20, e.y));
      svg.appendChild(svgEl('circle', { cx: e.x, cy: Y(e.v), r: e.cls === 'head' ? 4 : 3.5, class: `sc-dot sc-dot-${e.cls}` }));
      const num = svgEl('text', { x: e.x + 12, y: yy + 1, class: `st-num sc-num-${e.cls}` });
      num.textContent = `${e.v > 0 ? '+' : ''}${e.v.toFixed(2)}%`;
      const sub = svgEl('text', { x: e.x + 12, y: yy + 16, class: 'st-sub' });
      if (e.word.length > 14) {
        const cut = e.word.lastIndexOf(' ', 14);
        const lines = cut > 0 ? [e.word.slice(0, cut), e.word.slice(cut + 1)] : [e.word];
        lines.forEach((ln, i) => {
          const ts = svgEl('tspan', { x: e.x + 12, dy: i === 0 ? 0 : 12 });
          ts.textContent = ln;
          sub.appendChild(ts);
        });
      } else {
        sub.textContent = e.word;
      }
      svg.append(num, sub);
    }
  };

  const arm = () => {
    for (const p of [headPath, compPath]) {
      if (!p) continue;
      const L = p.getTotalLength();
      p.style.transition = 'none';
      p.style.strokeDasharray = String(L);
      p.style.strokeDashoffset = String(L);
    }
  };

  const play = () => {
    const comp = companion();
    lastKey = keyOf(comp);
    draw(comp);
    if (reduced) { svg.classList.add('done'); return; }
    svg.classList.remove('done');
    arm();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (headPath) {
        headPath.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.33, 0.33, 0.12, 1)';
        headPath.style.strokeDashoffset = '0';
      }
      if (compPath) {
        compPath.style.transition = 'stroke-dashoffset 0.7s ease-out 3.05s';
        compPath.style.strokeDashoffset = '0';
      }
      setTimeout(() => svg.classList.add('done'), 3600);
    }));
  };

  if (reduced) {
    play();
  } else {
    draw(companion());
    arm();
  }

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    if (!played) { played = true; if (!reduced) play(); lastKey = lastKey ?? keyOf(companion()); return; }
    if (keyOf(companion()) !== lastKey) play();
  }, { threshold: 0.45 });
  io.observe(svg);

  area.style.cursor = 'pointer';
  area.addEventListener('click', () => { played = true; play(); });

  return { refresh() { /* colors are CSS vars; nothing to re-render */ } };
}

// ---- the close, unfold variant: the line ends, and the end comes apart ---------
// Third and, on review, chosen close (2026-08-01; the companion-only and
// layered-haze variants remain above for revert). The opening line draws
// exactly as the reader first met it, ends at its dot — and then the dot
// opens: the funnel from Part II unfolds out of it, one number back into 12
// divisions, 43 groups, 92 classes, 162 sub-classes, 358 items, each strip's
// cells at their real weights. No data line performs choreography — the only
// line is the real series, and the only motion is the structural unfold the
// pyramid widget already taught. The final paragraph's "it comes apart in
// the hand", drawn. Tap replays.

export function initCloseUnfold(
  fig: HTMLElement | null,
  ol: OneLineData,
  pyramid: PyramidData,
) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.sc-area')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pts = ol.points;
  const tree = pyramid.tree ?? [];
  if (pts.length < 2 || !tree.length) return { refresh() {} };

  const W = 720, H = 412;
  const padL = 8, padT = 22;
  const xEnd = W - 108;
  const LH = 196;                      // the line lives in the top panel
  const STRIP_H = 20, STRIP_GAP = 15;  // the funnel hangs below
  const FUN_TOP = LH + 30;

  // strips top-to-bottom: the dot is the general index, so the unfold starts
  // at divisions. Widths widen toward the items floor (the funnel silhouette);
  // centers drift from under the dot toward the page, clamped to fit.
  const LEVELS = [
    { key: 'division', w: 180, label: '12 divisions' },
    { key: 'group', w: 288 },
    { key: 'class', w: 396 },
    { key: 'subclass', w: 502 },
    { key: 'item', w: 604, label: '358 items' },
  ];

  const svg = svgEl('svg', { class: 'sc-svg', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }) as SVGSVGElement;
  area.appendChild(svg);

  let headPath: SVGPathElement | null = null;

  const draw = () => {
    svg.innerHTML = '';
    const hv = pts.map((p) => p.v);
    const lo = Math.min(...hv), hi = Math.max(...hv);
    const span = hi - lo || 1;
    const X = (k: number) => padL + (k / (pts.length - 1)) * (xEnd - padL);
    const Y = (v: number) => padT + (1 - (v - lo) / span) * (LH - padT - 14);

    let d = `M ${X(0).toFixed(1)} ${Y(hv[0]).toFixed(1)}`;
    for (let k = 1; k < hv.length; k++) d += ` L ${X(k).toFixed(1)} ${Y(hv[k]).toFixed(1)}`;
    headPath = svgEl('path', { d, class: 'sc-line sc-line-head' }) as SVGPathElement;
    svg.appendChild(headPath);

    const yLast = Y(hv[hv.length - 1]);
    const last = hv[hv.length - 1];
    svg.appendChild(svgEl('circle', { cx: xEnd, cy: yLast, r: 4, class: 'sc-dot sc-dot-head' }));
    const num = svgEl('text', { x: xEnd + 12, y: yLast + 1, class: 'st-num sc-num-head' });
    num.textContent = `${last > 0 ? '+' : ''}${last.toFixed(2)}%`;
    const sub = svgEl('text', { x: xEnd + 12, y: yLast + 16, class: 'st-sub' });
    sub.textContent = 'the headline';
    svg.append(num, sub);

    // the unfold: each strip is a <g> whose cells are that level's real
    // weights; strips reveal in sequence (transition-delay set per strip)
    let prev: { x0: number; x1: number; y: number } = { x0: xEnd, x1: xEnd, y: yLast + 6 };
    LEVELS.forEach((lv, i) => {
      const nodes = tree.filter((n) => n.level === lv.key);
      const y = FUN_TOP + i * (STRIP_H + STRIP_GAP);
      const cx = Math.max(padL + lv.w / 2, Math.min(xEnd, W - padL - lv.w / 2));
      const x0 = cx - lv.w / 2, x1 = cx + lv.w / 2;

      // fold guides: the faint cone joining this strip to the one above
      const delay = reduced ? 0 : 0.25 + i * 0.35;
      const fold = svgEl('path', {
        d: `M ${prev.x0.toFixed(1)} ${prev.y.toFixed(1)} L ${x0.toFixed(1)} ${y.toFixed(1)} M ${prev.x1.toFixed(1)} ${prev.y.toFixed(1)} L ${x1.toFixed(1)} ${y.toFixed(1)}`,
        class: 'sc-fold',
      }) as SVGPathElement;
      fold.style.transitionDelay = `${delay}s`;
      svg.appendChild(fold);

      const g = svgEl('g', { class: 'sc-strip' }) as SVGGElement;
      g.style.transitionDelay = `${delay}s`;
      let ax = x0;
      const totalW = nodes.reduce((a, n) => a + n.weight, 0) || 100;
      for (const n of nodes) {
        const cw = (n.weight / totalW) * lv.w;
        g.appendChild(svgEl('rect', {
          x: ax.toFixed(2), y, width: Math.max(cw, 0.3).toFixed(2), height: STRIP_H,
          class: `sc-cell sc-cell-${lv.key}`,
        }));
        ax += cw;
      }
      if (lv.label) {
        const t = svgEl('text', { x: x1, y: y - 4, class: 'sc-count', 'text-anchor': 'end' });
        t.textContent = lv.label;
        g.appendChild(t);
      }
      svg.appendChild(g);
      prev = { x0, x1, y: y + STRIP_H };
    });
  };

  const play = () => {
    draw();
    if (reduced) { svg.classList.add('done'); return; }
    svg.classList.remove('done');
    if (headPath) {
      const L = headPath.getTotalLength();
      headPath.style.transition = 'none';
      headPath.style.strokeDasharray = String(L);
      headPath.style.strokeDashoffset = String(L);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (headPath) {
        headPath.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.33, 0.33, 0.12, 1)';
        headPath.style.strokeDashoffset = '0';
      }
      // 'done' releases the dot + label, and the strips' own delays stagger
      // the unfold out of the dot after the draw lands
      setTimeout(() => svg.classList.add('done'), 3300);
    }));
  };

  let played = false;
  if (reduced) {
    play();
  } else {
    draw();
    if (headPath) {
      const L = headPath.getTotalLength();
      headPath.style.strokeDasharray = String(L);
      headPath.style.strokeDashoffset = String(L);
    }
  }

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting) || played) return;
    played = true;
    if (!reduced) play();
  }, { threshold: 0.35 });
  io.observe(svg);

  area.style.cursor = 'pointer';
  area.addEventListener('click', () => { played = true; play(); });

  return { refresh() { /* colors are CSS vars; nothing to re-render */ } };
}

// ---- what entered the basket (unwired, 2026-08-02) -----------------------
// A base revision is usually told as a table of weights, which is the honest
// version and not the one anybody remembers. This is the other half of the
// same fact: the count, and a handful of the things that were not in the old
// basket at all. Chips, because a list of six is a list and a paragraph of six
// is a sentence nobody finishes.
//
// Every name here survived the generator's own diff against the 2012 item set
// (gate F), and the official spelling rides the chip's title so the friendly
// label never has to be taken on trust.
//
// Left the "new basket" desk as its own last panel: a chip list read as a
// second, weaker basket figure beside the slope/overlap/dumbbell three
// already on that desk. Kept here, unmounted, for wherever the chips are
// wanted next — the generator still emits rebase.additions/.counts.

export type BasketAdditionsData = {
  counts?: { items2012: number; items2024: number };
  additions?: { name: string; label: string }[];
};

export function initBasketAdditions(fig: HTMLElement | null, rb: BasketAdditionsData | null) {
  const noop = { refresh() {}, setStage(_s: number) {} };
  if (!fig || !rb?.counts || !rb.additions?.length) return noop;
  const area = fig.querySelector<HTMLElement>('.py-area') ?? fig;

  const render = () => {
    area.innerHTML = '';
    const head = el('p', 'ba-count');
    // The two numbers are the dataset's, counted from the two bases' own
    // tables — never typed here (see the generator's gate G).
    head.innerHTML = `<strong>${rb.counts!.items2012}</strong> priced items became `
      + `<strong>${rb.counts!.items2024}</strong>.`;
    const list = el('ul', 'ba-chips');
    for (const a of rb.additions!) {
      const li = el('li', 'ba-chip', a.label);
      li.title = a.name;                 // MoSPI's own spelling, one hover away
      list.append(li);
    }
    const foot = el('p', 'ba-foot',
      'A few of the things the 2024 basket prices that the 2012 one did not. '
      + 'Hover a chip for the name MoSPI gives it.');
    area.append(head, list, foot);
  };

  render();
  // Colours are CSS custom properties, so a theme flip needs no redraw; the
  // host calls refresh() on one anyway, and re-rendering is cheap and honest.
  return { refresh: render, setStage(_s: number) { render(); } };
}
