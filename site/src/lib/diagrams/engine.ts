// Shared client-side animation engine for the read's interaction diagrams.
// Two renderers, same stepped controls (Prev / Watch / Next, autoplay on
// scroll-in, prefers-reduced-motion = show everything at once):
//   initFlow — a free node graph (e.g. the hub): each step draws one wire
//              between two named nodes' badges.
//   initSeq  — a UML-style sequence diagram: named lifelines, each step a
//              horizontal message arrow at the next vertical position; handles
//              round trips (request out, response back) without overlap.
// A "node"/"actor" is addressed by a class on its element; its badge carries the
// entity colour via the CSS custom property --ent.

const NS = 'http://www.w3.org/2000/svg';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let uid = 0;

type Controls = {
  cap: HTMLElement | null;
  prevB: HTMLButtonElement; nextB: HTMLButtonElement; playB: HTMLButtonElement;
};
function controls(fig: Element): Controls | null {
  const prevB = fig.querySelector<HTMLButtonElement>('.prev');
  const nextB = fig.querySelector<HTMLButtonElement>('.next');
  const playB = fig.querySelector<HTMLButtonElement>('.play');
  if (!prevB || !nextB || !playB) return null;
  return { cap: fig.querySelector<HTMLElement>('.stepcap'), prevB, nextB, playB };
}
function arrowMarker(id: string) {
  return `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
}

// ---- initFlow: free node graph -------------------------------------------------
// label — the long step caption (shown below the controls). key — an optional
// short on-wire label (like a sequence-diagram message), drawn at the wire's
// midpoint when that wire is on.
export type FlowStep = { from: string; to: string; label: string; key?: string };

export function initFlow(fig: HTMLElement | null, steps: FlowStep[]) {
  if (!fig) return;
  const area = fig.querySelector<HTMLElement>('.flow-area');
  const c = controls(fig);
  if (!area || !c) return;
  const { cap, prevB, nextB, playB } = c;
  const mid = 'fa' + ++uid;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wires');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = arrowMarker(mid);
  area.prepend(svg);

  const lines = steps.map((s) => {
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('class', 'wire');
    ln.setAttribute('marker-end', `url(#${mid})`);
    ln.dataset.from = s.from; ln.dataset.to = s.to;
    svg.appendChild(ln);
    return ln;
  });
  // short on-wire labels, each on a little background chip that masks the wire
  // behind it. Chips are appended before the texts so the text sits on top.
  const bgs = steps.map(() => {
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('class', 'msglbl-bg');
    rect.setAttribute('rx', '3');
    svg.appendChild(rect);
    return rect;
  });
  const labels = steps.map((s) => {
    const tx = document.createElementNS(NS, 'text');
    tx.setAttribute('class', 'msglbl');
    tx.setAttribute('text-anchor', 'middle');
    tx.textContent = s.key ?? '';
    svg.appendChild(tx);
    return tx;
  });
  const badge = (cls: string) => area.querySelector<HTMLElement>('.' + cls + ' .badge')!;
  const node = (cls: string) => area.querySelector<HTMLElement>('.' + cls)!;
  const entColor = (cls: string) => getComputedStyle(badge(cls)).getPropertyValue('--ent').trim();
  const geom = () => {
    const r = area.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    lines.forEach((ln, i) => {
      const a = badge(ln.dataset.from!).getBoundingClientRect();
      const b = badge(ln.dataset.to!).getBoundingClientRect();
      const ax = a.left - r.left + a.width / 2, ay = a.top - r.top + a.height / 2;
      const bx = b.left - r.left + b.width / 2, by = b.top - r.top + b.height / 2;
      const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      let x1 = ax + ux * (a.width / 2 + 3), y1 = ay + uy * (a.width / 2 + 3);
      let x2 = bx - ux * (b.width / 2 + 7), y2 = by - uy * (b.width / 2 + 7);
      // For a near-vertical wire the captions sit directly in the path, so badge-
      // to-badge anchoring would draw the line straight through the text. Instead
      // route it through the clear gap: the endpoint at the UPPER node hugs its
      // caption (its full node box), the endpoint at the LOWER node hugs its badge
      // top — so it flows caption->icon going down, or icon->caption going up,
      // never crossing a label.
      if (Math.abs(dx) < Math.abs(dy) * 0.4) {
        const fromTop = ay < by;
        const upperBox = node((fromTop ? ln.dataset.from : ln.dataset.to)!).getBoundingClientRect();
        const lowerBadge = fromTop ? b : a;
        const yUpper = upperBox.bottom - r.top + 5;          // just below the upper caption
        const yLower = lowerBadge.top - r.top - 5;           // just above the lower icon
        x1 = ax; x2 = bx;
        y1 = fromTop ? yUpper : yLower;
        y2 = fromTop ? yLower : yUpper;
      } else if (Math.abs(dy) < Math.abs(dx) * 0.4) {
        // Near-horizontal: badge centres can differ by a pixel or two, which
        // reads as a tilt. Snap both ends to the shared centre so it's level.
        const my = (ay + by) / 2;
        y1 = my; y2 = my;
      }
      ln.setAttribute('x1', String(x1)); ln.setAttribute('y1', String(y1));
      ln.setAttribute('x2', String(x2)); ln.setAttribute('y2', String(y2));
      const L = Math.hypot(x2 - x1, y2 - y1);
      ln.style.setProperty('--len', String(L));
      if (!ln.classList.contains('on')) { ln.style.strokeDasharray = String(L); ln.style.strokeDashoffset = String(L); }
      // place the short label at the wire midpoint — lifted above the line for a
      // level wire, centred (with its halo masking the line) otherwise.
      const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1) * 0.4;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      labels[i].setAttribute('x', String(mx));
      labels[i].setAttribute('y', String(horiz ? my - 8 : my));
      labels[i].setAttribute('dominant-baseline', horiz ? 'auto' : 'central');
      // size the chip to the text
      if (labels[i].textContent) {
        const bb = labels[i].getBBox();
        const px = 5, py = 2;
        bgs[i].setAttribute('x', String(bb.x - px));
        bgs[i].setAttribute('y', String(bb.y - py));
        bgs[i].setAttribute('width', String(bb.width + px * 2));
        bgs[i].setAttribute('height', String(bb.height + py * 2));
      }
    });
  };
  const draw = (els: SVGLineElement[]) => stepMachine(els, steps.length, {
    cap, prevB, nextB, playB,
    apply: (ln, on, active) => {
      ln.style.strokeDasharray = ln.style.getPropertyValue('--len');
      ln.style.strokeDashoffset = on ? '0' : ln.style.getPropertyValue('--len');
      ln.classList.toggle('on', on);
      ln.classList.toggle('active', active);
      const li = lines.indexOf(ln);
      const col = active ? entColor(steps[li].from) : '';
      ln.style.stroke = col;
      labels[li].style.visibility = on ? 'visible' : 'hidden';
      labels[li].style.fill = col;
      bgs[li].style.visibility = on ? 'visible' : 'hidden';
    },
    caption: (i) => steps[i].label,
    reflow: area,
  });
  geom();
  new ResizeObserver(geom).observe(area);
  document.fonts?.ready.then(geom);
  draw(lines);
  observeOnce(area, () => { geom(); });
}

// ---- initSeq: sequence diagram -------------------------------------------------
// touch?: a "moment you see" (touchpoint) — the engine tags its message group with
// `.touch` so the page can give it a consistent cue (matches the touchpoint strip).
export type SeqStep = { from: string; to: string; label: string; full?: string; self?: boolean; touch?: boolean };

export function initSeq(fig: HTMLElement | null, steps: SeqStep[]) {
  if (!fig) return;
  const area = fig.querySelector<HTMLElement>('.flow-area');
  const c = controls(fig);
  if (!area || !c) return;
  const { cap, prevB, nextB, playB } = c;
  const mid = 'sq' + ++uid;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wires');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = arrowMarker(mid);
  area.prepend(svg);

  let lifelines: SVGLineElement[] = [];
  type G = { g: SVGGElement; ln: SVGGeometryElement; tx: SVGTextElement; s: SeqStep };
  const groups: G[] = steps.map((s) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'msg' + (s.touch ? ' touch' : ''));
    const ln = document.createElementNS(NS, s.self ? 'path' : 'line') as SVGGeometryElement;
    ln.setAttribute('class', 'wire');
    if (!s.self) ln.setAttribute('marker-end', `url(#${mid})`);
    const tx = document.createElementNS(NS, 'text');
    tx.setAttribute('class', 'msglbl');
    tx.textContent = s.label;
    g.appendChild(ln); g.appendChild(tx);
    svg.appendChild(g);
    return { g, ln, tx, s };
  });

  const badge = (id: string) => area.querySelector<HTMLElement>('.' + id + ' .badge')!;
  const entColor = (id: string) => getComputedStyle(badge(id)).getPropertyValue('--ent').trim();
  const geom = () => {
    // tighter rows on phones so the whole figure (diagram + controls + caption)
    // stays within one screen
    const narrow = matchMedia('(max-width: 560px)').matches;
    const rowH = narrow ? 44 : 54, topPad = narrow ? 18 : 28;
    const ar = area.getBoundingClientRect();
    const xs: Record<string, number> = {};
    let headBottom = 0;
    area.querySelectorAll<HTMLElement>('.actor').forEach((a) => {
      const b = a.querySelector('.badge')!.getBoundingClientRect();
      xs[a.dataset.id!] = b.left - ar.left + b.width / 2;
      // use the full actor (badge + label) bottom so the lifelines and first
      // message start below the labels, not under their backgrounds
      headBottom = Math.max(headBottom, a.getBoundingClientRect().bottom - ar.top);
    });
    const y0 = headBottom + topPad;
    const totalH = y0 + steps.length * rowH;
    area.style.minHeight = totalH + 12 + 'px';
    svg.setAttribute('viewBox', `0 0 ${ar.width} ${totalH + 12}`);
    lifelines.forEach((l) => l.remove());
    lifelines = Object.keys(xs).map((id) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'lifeline');
      l.setAttribute('x1', String(xs[id])); l.setAttribute('x2', String(xs[id]));
      l.setAttribute('y1', String(headBottom + 4)); l.setAttribute('y2', String(totalH + 4));
      svg.appendChild(l);
      return l;
    });
    // keep arrows above lifelines
    groups.forEach((gr) => svg.appendChild(gr.g));
    groups.forEach((gr, i) => {
      const y = y0 + i * rowH;
      const xf = xs[gr.s.from];
      if (gr.s.self) {
        const w = 30;
        // a self-loop on the rightmost lifeline opens leftward, so its label
        // stays inside the figure instead of running off the border
        const right = xf >= Math.max(...Object.values(xs)) - 1;
        const dir = right ? -1 : 1;
        (gr.ln as SVGPathElement).setAttribute('d', `M ${xf} ${y - 7} h ${dir * w} v 14 h ${-dir * w}`);
        gr.tx.setAttribute('x', String(xf + dir * (w + 7))); gr.tx.setAttribute('y', String(y + 1));
        gr.tx.setAttribute('text-anchor', right ? 'end' : 'start');
        gr.ln.style.setProperty('--len', String(w * 2 + 14));
      } else {
        const xt = xs[gr.s.to];
        gr.ln.setAttribute('x1', String(xf)); gr.ln.setAttribute('y1', String(y));
        gr.ln.setAttribute('x2', String(xt)); gr.ln.setAttribute('y2', String(y));
        gr.tx.setAttribute('x', String((xf + xt) / 2)); gr.tx.setAttribute('y', String(y - 7));
        gr.tx.setAttribute('text-anchor', 'middle');
        gr.ln.style.setProperty('--len', String(Math.abs(xt - xf)));
      }
      if (!gr.g.classList.contains('on')) {
        const L = gr.ln.style.getPropertyValue('--len');
        gr.ln.style.strokeDasharray = L; gr.ln.style.strokeDashoffset = L;
      }
    });
  };
  const draw = () => stepMachine(groups, steps.length, {
    cap, prevB, nextB, playB,
    apply: (gr, on, active) => {
      const L = gr.ln.style.getPropertyValue('--len');
      gr.ln.style.strokeDasharray = L;
      gr.ln.style.strokeDashoffset = on ? '0' : L;
      gr.ln.classList.toggle('on', on);
      gr.tx.style.visibility = on ? 'visible' : 'hidden';
      const col = active ? entColor(gr.s.from) : '';
      gr.ln.style.stroke = col; gr.tx.style.fill = col;
    },
    // during autoplay the on-arrow labels carry the flow; the full sentence shows
    // only when stepping manually (and as the settled end state), so two texts
    // never change at once.
    caption: (i, playing) => (playing ? '' : steps[i].full || steps[i].label),
    reflow: area,
  });
  geom();
  new ResizeObserver(geom).observe(area);
  document.fonts?.ready.then(geom);
  draw();
  observeOnce(area, () => { geom(); });
}

// ---- shared stepper ------------------------------------------------------------
type StepCfg<T> = {
  cap: HTMLElement | null;
  prevB: HTMLButtonElement; nextB: HTMLButtonElement; playB: HTMLButtonElement;
  apply: (item: T, on: boolean, active: boolean) => void;
  caption: (i: number, playing: boolean) => string;
  reflow: HTMLElement;
};
// draw stays snappy; the dwell between steps is longer so there is time to read.
const DRAW_MS = 360, DWELL_MS = 1300;
function stepMachine<T>(items: T[], n: number, cfg: StepCfg<T>) {
  const { cap, prevB, nextB, playB, apply, caption, reflow } = cfg;
  let idx = 0, playing = false;
  const set = (k: number, animate = true) => {
    idx = Math.max(0, Math.min(n, k));
    items.forEach((it, i) => {
      // set the transition hint on the geometry element (a wire, or a group's wire)
      const ge: any = (it as any).ln ?? it;
      if (ge && ge.style) ge.style.transition = animate ? `stroke-dashoffset ${DRAW_MS}ms ease` : 'none';
      apply(it, i < idx, i < idx && i === idx - 1);
    });
    if (cap) cap.textContent = idx === 0 ? (playing ? '' : 'Tap Next to step through, or Watch to play it.') : caption(idx - 1, playing);
    prevB.disabled = idx === 0 || playing;
    nextB.disabled = idx === n || playing;
  };
  const play = async () => {
    if (playing) return;
    playing = true; playB.disabled = prevB.disabled = nextB.disabled = true;
    set(0, false); void reflow.offsetWidth;
    if (!reduced()) for (let k = 1; k <= n; k++) { set(k, true); await wait(DWELL_MS); }
    playing = false;
    set(reduced() ? n : idx, false); // settle on the final state with the full caption
    playB.disabled = false;
  };
  set(0, false);
  prevB.addEventListener('click', () => { if (!playing) set(idx - 1); });
  nextB.addEventListener('click', () => { if (!playing) set(idx + 1); });
  playB.addEventListener('click', () => play());
  return { set, play };
}

// Re-measure geometry the first time the figure scrolls into view (fonts/layout
// may have shifted). Diagrams do NOT auto-play: they wait paused at step 0 until
// the reader taps Next or Watch.
function observeOnce(area: HTMLElement, onFirst: () => void) {
  let done = false;
  new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting && !done) {
      done = true; onFirst();
    }
  }, { threshold: 0.4 }).observe(area);
}
