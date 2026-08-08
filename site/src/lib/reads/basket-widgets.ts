// Hand-built basket interactives for the inflation read: the official CPI
// basket as the reader's object — reweight it, watch the two vintages, set
// rural against urban. Each widget owns its DOM inside the figure the page
// hands it, rewrites an aria-live caption as state changes, and exposes
// refresh() for theme flips. Pure SVG/DOM, no chart library.

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};
const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const YO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---- H. the basket slopegraph (beat 8) -----------------------------------------
// The 2012 and 2024 CPI baskets as two poles, one line per COICOP division:
// where each ₹100 of household spending goes. Both vintages are MoSPI's
// restatement on the 2024 classification, so every slope is behaviour, not
// reclassification. Food wears saffron; tap any line for its story.

export type BasketSector = { w2012: number; w2024: number };
export type BasketDiv = { name: string; rural: BasketSector; urban: BasketSector; combined: BasketSector };

const BK_SHORT: Record<string, string> = {
  'Food and beverages': 'food & beverages',
  'Paan, tobacco and intoxicants': 'paan & tobacco',
  'Clothing and footwear': 'clothing',
  'Housing, water, electricity, gas and other fuels': 'housing & utilities',
  'Furnishings, household equipment and routine household maintenance': 'furnishings',
  'Health': 'health',
  'Transport': 'transport',
  'Information and communication': 'communication',
  'Recreation, sport and culture': 'recreation',
  'Education services': 'education',
  'Restaurants and accommodation services': 'restaurants & hotels',
  'Personal care, social protection and miscellaneous goods and services': 'personal care & misc.',
};


// ---- I. your basket (beat 7) ---------------------------------------------------
// The reader reweights the official basket, division by division, and their
// own inflation number diverges from the headline in front of them. Rates
// are the latest month's YoY per COICOP division; the arithmetic is exactly
// the CPI's: a weighted average, renormalised to the reader's ₹100.

export type YourBasketDiv = { name: string; w: number; infl: number; idx?: number; idxAgo?: number };
export type YourBasketSeries = {
  months: string[]; headline: number[];
  divisions: { name: string; infl: number[]; idx?: number[]; idxAgo?: number[] }[];
};
export type YourBasketData = { asOf: string; headline: number | null; divisions: YourBasketDiv[]; series?: YourBasketSeries };

export function initYourBasket(fig: HTMLElement | null, yb: YourBasketData) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.yb-area')!;

  const read = el('div', 'yb-read');
  const yours = el('div', 'yb-num', `<span class="yb-lbl">your basket</span><strong class="yb-big"></strong>`);
  const head = el('div', 'yb-num', `<span class="yb-lbl">the headline</span><strong class="yb-big">${yb.headline?.toFixed(2)}%</strong>`);
  read.append(yours, head);
  // the two numbers traced back in time: the headline as published, your
  // reweighted basket recomputed for every 2024-series month — the saffron
  // line re-draws as the sliders move. Needs series data (the inflation
  // read's payload has it; the food lab's does not) and ≥3 months.
  const ser = yb.series && yb.series.months.length >= 3 ? yb.series : null;
  const ts = ser ? el('div', 'yb-ts') : null;
  const tsSvg = ts ? (svgEl('svg', { class: 'yb-ts-svg', 'aria-hidden': 'true' }) as SVGSVGElement) : null;
  if (ts && tsSvg) ts.appendChild(tsSvg);
  const phrase = el('p', 'yb-phrase'); phrase.setAttribute('aria-live', 'polite');
  // starting points, above the bar: the chip matching the current state is
  // lit and inert (there is nothing to reset to); editing re-arms both
  const btns = el('div', 'yb-btns');
  const reset = el('button', 'yb-reset', 'The official basket') as HTMLButtonElement;
  reset.type = 'button';
  const zero = el('button', 'yb-reset yb-zero', 'Start from zero') as HTMLButtonElement;
  zero.type = 'button';
  btns.append(reset, zero);
  // the conserved hundred: one bar, exactly ₹100 wide. Thumb position IS the
  // share — dragging one slider visibly moves the others to keep the sum at
  // 100. A from-zero build is free allocation until the hundred is spent; the
  // hatched tail is the unspent remainder. The touched segment lights saffron
  // with a label naming its slice, then fades.
  const barwrap = el('div', 'yb-barwrap');
  const hotlab = el('span', 'yb-hotlab'); hotlab.setAttribute('aria-hidden', 'true');
  const bar = el('div', 'yb-bar'); bar.setAttribute('aria-hidden', 'true');
  const segs = yb.divisions.map((_, i) => {
    const s = el('span', 'yb-seg ' + (i % 2 ? 'yb-seg-b' : 'yb-seg-a'));
    bar.appendChild(s);
    return s;
  });
  const unspent = el('span', 'yb-seg yb-unspent');
  bar.appendChild(unspent);
  barwrap.append(hotlab, bar);
  const list = el('div', 'yb-rows');
  // two blocks, not one flat stack: everything the widget SAYS (numbers,
  // chart, phrase, buttons, bar) in one, the twelve sliders in the other, so
  // a wide layout can set them side by side and keep the whole thing inside
  // a single screen. Stacked, the reading order is unchanged.
  const out = el('div', 'yb-out');
  if (ts) out.append(read, ts, phrase, btns, barwrap);
  else out.append(read, phrase, btns, barwrap);
  area.append(out, list);

  const rows = yb.divisions.map((d) => {
    const row = el('div', 'yb-row');
    const short = BK_SHORT[d.name] ?? d.name.toLowerCase();
    row.innerHTML = `<span class="yb-name">${short}<span class="yb-rate">${d.infl >= 0 ? '+' : ''}${d.infl.toFixed(1)}%<span class="yb-rate-yr"> this year</span></span></span>`;
    const slider = el('input', 'yb-slider') as HTMLInputElement;
    slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '0.05'; slider.value = String(d.w);
    slider.setAttribute('aria-label', `Your monthly spending share on ${short}`);
    // vertical swipes over the slider scroll the page; only a horizontal
    // gesture engages the thumb (mobile scroll was changing values by accident)
    slider.style.touchAction = 'pan-y';
    const val = el('span', 'yb-val');
    row.append(slider, val);
    list.appendChild(row);
    return { d, slider, val, init: +slider.value };
  });

  // The shares live here, not on the inputs. A range input snaps whatever it
  // is given to its step, so rescaling eleven siblings through the DOM lost up
  // to a third of a rupee per drag: the hundred quietly leaked away and the
  // bar grew an "unspent" tail nobody had asked for. Keeping the numbers in an
  // array and writing them out to the thumbs afterwards makes the sum exact.
  const vals = rows.map((r) => r.init);
  let prevSum = vals.reduce((a, b) => a + b, 0);
  const sync = () => rows.forEach((r, i) => { r.slider.value = String(vals[i]); });

  // The index's own arithmetic. A CPI is a ratio of two weighted sums of index
  // LEVELS twelve months apart, not an average of the divisions' year-on-year
  // rates: at the official weights the rate version reads 4.35 where the
  // ministry publishes 4.38. With levels the reader's number reproduces the
  // published headline in every month, which is the whole claim the figure
  // makes. The rate form stays as the fallback for payloads without levels
  // (the food lab's).
  const hasLevels = yb.divisions.every((d) => d.idx != null && d.idxAgo != null);
  const yoursNow = (): number | null => {
    const sw = vals.reduce((a, b) => a + b, 0);
    if (sw < 1e-9) return null;
    if (hasLevels) {
      let num = 0, den = 0;
      yb.divisions.forEach((d, i) => { num += vals[i] * d.idx!; den += vals[i] * d.idxAgo!; });
      return den > 0 ? (num / den - 1) * 100 : null;
    }
    return yb.divisions.reduce((a, d, i) => a + vals[i] * d.infl, 0) / sw;
  };

  // keep the hundred conserved. With a full basket, moving one slider scales
  // the others to absorb the change (the beam-balance made tactile); while a
  // from-zero build is short of 100 the drag is free, and conservation takes
  // over mid-drag the moment the hundred is spent.
  const rebalance = (i: number) => {
    const v = Math.max(0, Math.min(100, vals[i]));
    vals[i] = v;
    const others = vals.reduce((s, x, k) => (k === i ? s : s + x), 0);
    const wasFull = prevSum >= 99.995;
    const target = wasFull ? 100 - v : Math.min(others, 100 - v);
    if (Math.abs(target - others) > 1e-9) {
      if (others > 1e-9) {
        const f = target / others;
        vals.forEach((x, k) => { if (k !== i) vals[k] = x * f; });
      } else if (target > 0) {
        const share = target / (vals.length - 1);
        vals.forEach((_, k) => { if (k !== i) vals[k] = share; });
      }
    }
    prevSum = vals.reduce((a, b) => a + b, 0);
  };

  // ---- the time-series panel ----
  // `tsShown` holds the yours-line values currently on screen; retrace()
  // eases them toward the freshly computed target so the line glides rather
  // than jumps (skipped under prefers-reduced-motion).
  let tsShown: number[] | null = null;
  let tsAnim = 0;
  const serLevels = !!ser && ser.divisions.every((d) => d.idx && d.idxAgo);
  const yoursSeries = (): number[] | null => {
    if (!ser) return null;
    const sw = vals.reduce((a, b) => a + b, 0);
    if (sw < 1e-6) return null;
    return ser.months.map((_, k) => {
      if (serLevels) {
        let num = 0, den = 0;
        ser.divisions.forEach((d, i) => { num += vals[i] * d.idx![k]; den += vals[i] * d.idxAgo![k]; });
        return den > 0 ? (num / den - 1) * 100 : 0;
      }
      let acc = 0;
      ser.divisions.forEach((d, i) => { acc += vals[i] * d.infl[k]; });
      return acc / sw;
    });
  };
  const drawTs = () => {
    if (!ts || !tsSvg || !ser) return;
    const w = ts.clientWidth || 640;
    const narrow = w < 480;
    const h = narrow ? 118 : 186;
    // the end labels ("4.38% the headline") set the right gutter; narrow drops
    // them a point smaller (the .narrow class) and still needs most of it.
    // The gutter tracks the label type size — at 11.5px mono, eighteen
    // characters want ~130px or the labels clip against the svg edge.
    const padL = 8, padR = narrow ? 118 : 138, padT = 14, padB = 22;
    tsSvg.classList.toggle('narrow', narrow);
    tsSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    tsSvg.style.height = h + 'px';
    tsSvg.innerHTML = '';
    const n = ser.months.length;
    const X = (k: number) => padL + (k / (n - 1)) * (w - padL - padR);
    const all = [...ser.headline, ...(tsShown ?? [])];
    const lo = Math.min(...all), hi = Math.max(...all);
    const pad = Math.max(0.4, (hi - lo) * 0.15);
    const Y = (v: number) => padT + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (h - padT - padB);
    if (lo - pad < 0 && hi + pad > 0) {
      tsSvg.appendChild(svgEl('line', { x1: padL, y1: Y(0), x2: w - padR, y2: Y(0), class: 'yb-ts-zero' }));
    }
    const path = (vals: number[], cls: string) =>
      svgEl('polyline', { points: vals.map((v, k) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join(' '), class: cls });
    // the reader's line draws UNDER the headline: at the official weights the
    // two are the same line (the widget does the index's own arithmetic), and
    // a dashed overlay read as a saffron/teal candy-stripe. With the headline
    // on top, agreement shows as one clean saffron line — the dodged end
    // labels still say there are two — and the teal line peels out from
    // behind it as the sliders move.
    if (tsShown) tsSvg.appendChild(path(tsShown, 'yb-ts-you'));
    tsSvg.appendChild(path(ser.headline, 'yb-ts-head'));
    // end labels, dodged apart when the two lines finish close together
    const labs: { v: number; y: number; cls: string; word: string }[] = [];
    labs.push({ v: ser.headline[n - 1], y: Y(ser.headline[n - 1]), cls: 'yb-ts-lab-head', word: 'the headline' });
    if (tsShown) labs.push({ v: tsShown[n - 1], y: Y(tsShown[n - 1]), cls: 'yb-ts-lab-you', word: 'your basket' });
    if (labs.length === 2 && Math.abs(labs[0].y - labs[1].y) < 13) {
      const mid = (labs[0].y + labs[1].y) / 2;
      const [up, dn] = labs[0].y <= labs[1].y ? [labs[0], labs[1]] : [labs[1], labs[0]];
      up.y = mid - 6.5; dn.y = mid + 6.5;
    }
    for (const L of labs) {
      const t = svgEl('text', { x: w - padR + 8, y: Math.max(padT + 4, Math.min(h - padB, L.y + 3.5)), class: `yb-ts-lab ${L.cls}` });
      t.textContent = `${L.v.toFixed(2)}% ${L.word}`;
      tsSvg.appendChild(t);
    }
    const mLab = (m: string) => `${YO_MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
    const t0 = svgEl('text', { x: padL, y: h - 6, class: 'yb-ts-tick' });
    t0.textContent = mLab(ser.months[0]);
    const t1 = svgEl('text', { x: w - padR, y: h - 6, class: 'yb-ts-tick', 'text-anchor': 'end' });
    t1.textContent = mLab(ser.months[n - 1]);
    tsSvg.append(t0, t1);
  };
  const retrace = () => {
    if (!ts) return;
    const target = yoursSeries();
    cancelAnimationFrame(tsAnim);
    if (!target || !tsShown || tsShown.length !== target.length || reduced()) {
      tsShown = target;
      drawTs();
      return;
    }
    const from = [...tsShown];
    const start = performance.now();
    const D = 320;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / D);
      const e = 1 - (1 - p) ** 3;
      tsShown = from.map((v, k) => v + (target[k] - v) * e);
      drawTs();
      if (p < 1) tsAnim = requestAnimationFrame(step);
    };
    tsAnim = requestAnimationFrame(step);
  };

  const render = () => {
    let sw = 0;
    rows.forEach((_, i) => { sw += vals[i]; });
    rows.forEach((r, i) => {
      const w = vals[i];
      r.val.textContent = `₹${w.toFixed(2)}`;
      // --p paints the filled part of the track: the custom slider CSS draws
      // the control identically in every engine (Safari's native rendering
      // was a fat track and an oversized thumb)
      r.slider.style.setProperty('--p', `${w}%`);
      segs[i].style.flexBasis = `${w.toFixed(2)}%`;
      // a zero-width segment must also drop its divider hairline, or twelve
      // empty divisions render as a stack of borders
      segs[i].style.borderLeft = w < 0.05 ? 'none' : '';
    });
    unspent.style.flexBasis = `${Math.max(0, 100 - sw).toFixed(2)}%`;
    unspent.style.borderLeft = sw > 99.95 ? 'none' : '';
    const untouched = rows.every((r, i) => Math.abs(vals[i] - r.init) < 1e-6);
    const atZero = sw < 1e-6;
    const full = sw >= 99.995;
    const mine = yoursNow() ?? 0;
    (yours.querySelector('.yb-big') as HTMLElement).textContent = sw > 0 ? `${mine.toFixed(2)}%` : '—';
    const d = yb.headline != null ? mine - yb.headline : 0;
    phrase.textContent =
      atZero ? 'The basket is empty. Give a few divisions a share of your ₹100.'
        : untouched ? 'This is the official basket. Move a slider to make it yours.'
          : !full ? `₹${sw.toFixed(0)} of the ₹100 placed; the hatched stretch of the bar is still unspent.`
            : Math.abs(d) < 0.05 ? 'Your basket tracks the headline almost exactly.'
              : d > 0 ? `Your prices are rising ${d.toFixed(2)} points faster than the headline says.`
                : `Your prices are rising ${(-d).toFixed(2)} points slower than the headline says.`;
    reset.disabled = untouched; reset.classList.toggle('on', untouched);
    zero.disabled = atZero; zero.classList.toggle('on', atZero);
    retrace();
  };
  let hotT: ReturnType<typeof setTimeout> | undefined;
  const light = (i: number) => {
    clearTimeout(hotT);
    segs.forEach((s, k) => s.classList.toggle('hot', k === i));
    const w = vals[i];
    let before = 0;
    vals.forEach((x, k) => { if (k < i) before += x; });
    const short = BK_SHORT[rows[i].d.name] ?? rows[i].d.name.toLowerCase();
    hotlab.textContent = `${short} · ₹${w.toFixed(0)} of 100`;
    hotlab.classList.add('show');
    // centre the label on its segment, clamped so it never leaves the bar
    const bw = bar.clientWidth || 1;
    const half = (hotlab.offsetWidth / 2 / bw) * 100;
    hotlab.style.left = `${Math.max(half, Math.min(100 - half, before + w / 2))}%`;
  };
  const fade = () => {
    hotT = setTimeout(() => {
      segs.forEach((s) => s.classList.remove('hot'));
      hotlab.classList.remove('show');
    }, 700);
  };
  // the dragged thumb is the one input we do NOT write back to (a snapped
  // rewrite mid-drag makes it stutter under the finger); the other eleven
  // follow from the model
  const setAll = (i: number) => rows.forEach((r, k) => { if (k !== i) r.slider.value = String(vals[k]); });
  rows.forEach((r, i) => {
    r.slider.addEventListener('input', () => {
      vals[i] = +r.slider.value;
      rebalance(i);
      setAll(i);
      light(i);
      render();
    });
    r.slider.addEventListener('pointerdown', () => light(i));
    r.slider.addEventListener('pointerup', fade);
    r.slider.addEventListener('blur', fade);
  });
  const setTo = (f: (r: { init: number }, i: number) => number) => {
    rows.forEach((r, i) => { vals[i] = f(r, i); });
    prevSum = vals.reduce((a, b) => a + b, 0);
    sync();
    render();
  };
  reset.addEventListener('click', () => setTo((r) => r.init));
  zero.addEventListener('click', () => setTo(() => 0));
  // width-guarded: drawTs sets the svg's height, which resizes the box the
  // observer is watching — WebKit reports that round trip as "ResizeObserver
  // loop completed with undelivered notifications"
  if (ts) {
    let wTs = 0;
    new ResizeObserver(() => {
      const w = ts.clientWidth;
      if (w && w !== wTs) { wTs = w; drawTs(); }
    }).observe(ts);
  }
  render();
  // getYours: the reader's current number, for the read's closing bookend.
  // `series` is the reader's month-by-month rate over `months` (same window
  // as the widget's own chart) so the close can draw the line, not just its
  // end value; both are absent when the widget has no time-series data.
  return {
    refresh: render,
    getYours: () => {
      const sw = vals.reduce((a, b) => a + b, 0);
      return {
        mine: yoursNow() ?? 0,
        untouched: rows.every((r, i) => vals[i] === r.init),
        empty: sw === 0,
        months: ser?.months,
        series: yoursSeries() ?? undefined,
      };
    },
  };
}

export function initBasketSlope(fig: HTMLElement | null, basket: BasketDiv[]) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.bk-area')!;
  const svg = svgEl('svg', { class: 'bk-svg', 'aria-hidden': 'true' }) as SVGSVGElement;
  const cap = el('p', 'bk-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  let sel = basket.findIndex((b) => /^Food/.test(b.name));
  if (sel < 0) sel = 0;

  const rs = (v: number) => `₹${v.toFixed(2)}`;
  const capFor = (b: BasketDiv) => {
    const s = BK_SHORT[b.name] ?? b.name.toLowerCase();
    const d = b.combined.w2024 - b.combined.w2012;
    const dir = d >= 0 ? `up ₹${d.toFixed(2)}` : `down ₹${(-d).toFixed(2)}`;
    const base = `Of every ₹100 the average household spends, ${s} took ${rs(b.combined.w2012)} in the 2012 basket and ${rs(b.combined.w2024)} in 2024, ${dir}.`;
    // no "a richer country spends less on food" gloss here: the paragraph
    // directly above the figure already makes that point
    if (/^Food and/.test(b.name)) return base + ' The biggest fall in the basket. Tap another line to compare.';
    if (b.name === 'Transport') return base + ` The biggest rise, driven by rural India: rural transport went from ${rs(b.rural.w2012)} to ${rs(b.rural.w2024)}.`;
    if (/^Housing/.test(b.name)) return base + ' Part of the rise is new honesty: rural house rent was measured for the first time in 2024.';
    if (/^Education/.test(b.name)) return base + ' Milder than it looks: books and stationery sit in other divisions of the new classification.';
    return base + ' Tap another line to compare.';
  };

  // stack labels downward keeping a minimum gap, then push the pile back up
  // if it overflows the bottom bound — labels stay ordered by value.
  const dodge = (ys: number[], gap: number, bottom: number) => {
    const order = [...ys.keys()].sort((a, b) => ys[a] - ys[b]);
    const out = [...ys];
    let prev = -Infinity;
    for (const i of order) { out[i] = Math.max(out[i], prev + gap); prev = out[i]; }
    let next = bottom;
    for (let k = order.length - 1; k >= 0; k--) {
      const i = order[k];
      out[i] = Math.min(out[i], next);
      next = out[i] - gap;
    }
    return out;
  };

  const render = () => {
    const w = area.clientWidth || 640;
    const narrow = w < 560;
    const H = narrow ? 440 : 480;
    const padT = 40, padB = 16;
    const fL = narrow ? 9 : 10.5;
    const gap = fL + 4.5;
    // the right gutter has to hold the longest "value  division name" pair
    // ("5.04  personal care & misc.") without clipping; on wide layouts the
    // left gutter matches it so the pole pair sits centred in the box instead
    // of drifting left
    const gutL = narrow ? 38 : 196;
    const gutR = narrow ? 154 : 196;
    const xL = gutL + 8;
    const xR = w - gutR - 8;
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.style.height = H + 'px';
    svg.innerHTML = '';

    const top = Math.ceil(Math.max(...basket.map((b) => Math.max(b.combined.w2012, b.combined.w2024))) / 5) * 5;
    const Y = (v: number) => H - padB - (v / top) * (H - padT - padB);

    // poles and headers
    svg.appendChild(svgEl('line', { x1: xL, y1: padT - 6, x2: xL, y2: H - padB, class: 'bk-pole' }));
    svg.appendChild(svgEl('line', { x1: xR, y1: padT - 6, x2: xR, y2: H - padB, class: 'bk-pole' }));
    // on a phone the two headers, anchored at the poles, ran into each other:
    // pin them to the outer edges of the box and drop the article, so the
    // pair has the full width to sit in
    const hl = svgEl('text', { x: narrow ? 0 : xL, y: 16, class: 'bk-head', 'text-anchor': narrow ? 'start' : 'middle' });
    hl.textContent = narrow ? '2012 basket' : 'the 2012 basket';
    const hr = svgEl('text', { x: narrow ? w : xR, y: 16, class: 'bk-head', 'text-anchor': narrow ? 'end' : 'middle' });
    hr.textContent = narrow ? '2024 basket' : 'the 2024 basket';
    svg.append(hl, hr);

    const yl = basket.map((b) => Y(b.combined.w2012));
    const yr = basket.map((b) => Y(b.combined.w2024));
    const ll = dodge(yl, gap, H - padB);
    const lr = dodge(yr, gap, H - padB);
    const colorOf = (b: BasketDiv, i: number) =>
      /^Food and/.test(b.name) ? cssVar('--tsoi-color-chart-1')
        : i === sel ? cssVar('--tsoi-color-on-surface')
          : cssVar('--tsoi-color-outline');

    basket.forEach((b, i) => {
      const on = i === sel;
      const c = colorOf(b, i);
      const g = svgEl('g', { class: 'bk-div' + (on ? ' on' : '') });
      const line = svgEl('line', { x1: xL, y1: yl[i], x2: xR, y2: yr[i], class: 'bk-line' });
      (line as SVGElement).style.stroke = c;
      (line as SVGElement).style.strokeWidth = on ? '3.4' : '2.2';
      (line as SVGElement).style.opacity = on || /^Food and/.test(b.name) ? '1' : '0.8';
      g.appendChild(line);
      for (const [x, y] of [[xL, yl[i]], [xR, yr[i]]] as [number, number][]) {
        const dot = svgEl('circle', { cx: x, cy: y, r: on ? 4.5 : 3, class: 'bk-dot' });
        (dot as SVGElement).style.fill = c;
        g.appendChild(dot);
      }
      // leader ticks where a dodged label drifted off its dot
      if (Math.abs(ll[i] - yl[i]) > 5) g.appendChild(svgEl('line', { x1: xL - 5, y1: ll[i] - 3.5, x2: xL, y2: yl[i], class: 'bk-lead' }));
      if (Math.abs(lr[i] - yr[i]) > 5) g.appendChild(svgEl('line', { x1: xR + 5, y1: lr[i] - 3.5, x2: xR, y2: yr[i], class: 'bk-lead' }));
      const tl = svgEl('text', { x: xL - 8, y: ll[i], class: 'bk-ll' + (on ? ' on' : ''), 'text-anchor': 'end', 'font-size': fL });
      tl.textContent = b.combined.w2012.toFixed(2);
      const tr = svgEl('text', { x: xR + 8, y: lr[i], class: 'bk-rl' + (on ? ' on' : ''), 'font-size': fL });
      tr.textContent = `${b.combined.w2024.toFixed(2)}  ${BK_SHORT[b.name] ?? b.name}`;
      // the labels paint on top of the hit paths, so clicks on the glyphs
      // themselves never reach a path — they need their own handlers
      for (const t of [tl, tr]) t.addEventListener('click', () => { sel = i; render(); });
      g.append(tl, tr);
      // the hit target follows the DATA line between the poles (a straight
      // label-to-label line would sit at the dodged label heights and catch
      // clicks meant for a neighbour), then bends out to each label.
      const hit = svgEl('path', {
        d: `M ${xL - gutL} ${ll[i]} L ${xL} ${yl[i]} L ${xR} ${yr[i]} L ${xR + gutR} ${lr[i]}`,
        fill: 'none', class: 'bk-hit',
      });
      hit.addEventListener('click', () => { sel = i; render(); });
      g.appendChild(hit);
      svg.appendChild(g);
    });

    cap.textContent = capFor(basket[sel]);
  };

  // width-guarded for the same reason as the your-basket chart: render() sets
  // the svg's height, which is a resize of the observed box
  let wBk = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wBk) { wBk = w; render(); }
  }).observe(area);
  render();
  return { refresh: render };
}

// ---- E2. rural against urban, weight by weight ---------------------------------
// The "not one basket but two" paragraph drawn out: one dumbbell per division,
// its share of the rural ₹100 against its share of the urban one, rows sorted
// by the gap between the two. The explore rebase desk carries the same fact as
// a dotplot panel; this is the read's page-surface rendering, with the axis in
// rupees of the shared hundred because that is how the prose talks (the desk's
// percent axis says the same number in the wrong voice here).
// Rural wears chart-3 and urban chart-4: saffron stays the headline's and teal
// the reader's own numbers (the read's two reserved characters). Both hues sit
// on labelled dots and named rows, which is the relief the palette's contrast
// flags require.

export function initSectorWeights(fig: HTMLElement | null, basket: BasketDiv[]) {
  if (!fig) return { refresh() {} };
  const area = fig.querySelector<HTMLElement>('.ru-area')!;
  const svg = svgEl('svg', { class: 'ru-svg', 'aria-hidden': 'true' }) as SVGSVGElement;
  const cap = el('p', 'ru-cap'); cap.setAttribute('aria-live', 'polite');
  area.append(svg, cap);

  const rs = (v: number) => `₹${v.toFixed(2)}`;
  const gapOf = (b: BasketDiv) => Math.abs(b.rural.w2024 - b.urban.w2024);
  const rows = [...basket].sort((a, b) => gapOf(b) - gapOf(a));
  let sel = 0; // the widest gap leads, and is the opening caption

  // the caption's two figures wear the sector hues, so it stays readable on
  // the phones where the on-dot labels have the least room
  const capFor = (b: BasketDiv) => {
    const s = BK_SHORT[b.name] ?? b.name.toLowerCase();
    const base = `Of the two hundreds, ${s} takes `
      + `<span class="ru-cap-r">${rs(b.rural.w2024)}</span> from the rural one and `
      + `<span class="ru-cap-u">${rs(b.urban.w2024)}</span> from the urban one.`;
    if (rows[0] === b) return base + ' The widest gap in the basket. Tap another division to compare.';
    return base + ' Tap another division to compare.';
  };

  const render = () => {
    const w = area.clientWidth || 640;
    const narrow = w < 560;
    const fL = narrow ? 9 : 10.5;
    const rowH = 27;
    const padT = 26, padB = 24;
    const H = padT + rows.length * rowH + padB;
    // the left gutter holds the longest short name ("personal care & misc.")
    const gutL = narrow ? 118 : 172;
    const x0 = gutL + 10;
    const x1 = w - 14;
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    svg.style.height = H + 'px';
    svg.innerHTML = '';

    const top = Math.ceil(Math.max(...rows.map((b) => Math.max(b.rural.w2024, b.urban.w2024))) / 5) * 5;
    const X = (v: number) => x0 + (v / top) * (x1 - x0);

    // the rupee scale: gridlines every ₹10, labelled along the bottom
    for (let v = 0; v <= top; v += 10) {
      svg.appendChild(svgEl('line', { x1: X(v), y1: padT - 8, x2: X(v), y2: H - padB, class: 'ru-grid' }));
      const t = svgEl('text', { x: X(v), y: H - padB + 14, class: 'ru-tick', 'text-anchor': 'middle', 'font-size': fL });
      t.textContent = `₹${v}`;
      svg.appendChild(t);
    }

    rows.forEach((b, i) => {
      const on = i === sel;
      const y = padT + i * rowH + rowH / 2;
      const xr = X(b.rural.w2024);
      const xu = X(b.urban.w2024);
      const g = svgEl('g', { class: 'ru-row' + (on ? ' on' : '') });

      const name = svgEl('text', { x: gutL, y: y + 3.5, class: 'ru-name' + (on ? ' on' : ''), 'text-anchor': 'end', 'font-size': fL });
      name.textContent = BK_SHORT[b.name] ?? b.name;
      g.appendChild(name);

      const bar = svgEl('line', { x1: Math.min(xr, xu), y1: y, x2: Math.max(xr, xu), y2: y, class: 'ru-gap' });
      (bar as SVGElement).style.strokeWidth = on ? '3' : '2';
      g.appendChild(bar);
      // hues come from the page's --ru-rural/--ru-urban vars (the funnel's
      // --lvl-* pattern), so the theme flip needs no re-render logic here
      g.appendChild(svgEl('circle', { cx: xr, cy: y, r: on ? 5 : 4, class: 'ru-dot ru-rural' }));
      g.appendChild(svgEl('circle', { cx: xu, cy: y, r: on ? 5 : 4, class: 'ru-dot ru-urban' }));

      // Labels ride the dots: the first row always carries the legend words,
      // and the selected row carries its two rupee figures — so a selected
      // first row reads "rural ₹11.76". When the pair sits too close for two
      // middle-anchored labels (or would clip an edge), the two collapse into
      // one combined label over the pair's midpoint, left dot's figure first.
      if (on || i === 0) {
        const yLab = y - 11;
        const lab = (sec: 'rural' | 'urban') => {
          const v = sec === 'rural' ? b.rural.w2024 : b.urban.w2024;
          return (i === 0 ? sec + (on ? ' ' : '') : '') + (on ? rs(v) : '');
        };
        const halfW = ((on ? 7 : 0) + (i === 0 ? 6 : 0)) * fL * 0.31; // ~half a label, in px
        const clampX = (x: number) => Math.min(Math.max(x, gutL + 10 + halfW), w - 4 - halfW);
        if (Math.abs(xr - xu) > halfW * 2 + 10) {
          for (const [x, sec] of [[xr, 'rural'], [xu, 'urban']] as const) {
            const t = svgEl('text', { x: clampX(x), y: yLab, class: `ru-leg ru-${sec}`, 'text-anchor': 'middle', 'font-size': fL });
            t.textContent = lab(sec);
            g.appendChild(t);
          }
        } else {
          const t = svgEl('text', { x: clampX((xr + xu) / 2), y: yLab, class: 'ru-leg', 'text-anchor': 'middle', 'font-size': fL });
          const order: ('rural' | 'urban')[] = xr <= xu ? ['rural', 'urban'] : ['urban', 'rural'];
          order.forEach((sec, k) => {
            if (k) {
              const sep = svgEl('tspan', { class: 'ru-sep' });
              sep.textContent = ' · ';
              t.appendChild(sep);
            }
            const ts = svgEl('tspan', { class: `ru-${sec}` });
            ts.textContent = lab(sec);
            t.appendChild(ts);
          });
          g.appendChild(t);
        }
      }

      const hit = svgEl('rect', { x: 0, y: y - rowH / 2, width: w, height: rowH, class: 'ru-hit' });
      hit.addEventListener('click', () => { sel = i; render(); });
      g.appendChild(hit);
      svg.appendChild(g);
    });

    cap.innerHTML = capFor(rows[sel]);
  };

  let wRu = 0;
  new ResizeObserver(() => {
    const w = area.clientWidth;
    if (w && w !== wRu) { wRu = w; render(); }
  }).observe(area);
  render();
  return { refresh: render };
}
