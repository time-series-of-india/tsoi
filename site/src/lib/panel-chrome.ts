// Shared panel chrome for chart panels: maximize overlay, a "v"-while-hovered
// keyboard shortcut (Grafana convention), dotted-underline info tooltips, and
// the drag-to-select zoom activation used by time-series charts. Consumed by
// both the spec-driven dashboard shell (DashboardView.astro) and the
// self-contained meta.astro island, so the two stay visually/behaviourally
// identical without either one owning the code.
import type { ECharts } from 'echarts';

const isCoarsePointer = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

const isTyping = (t: EventTarget | null) =>
  !!(t as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]');

// --- history-aware maximize overlays ------------------------------------
// A page can stack more than one overlay — DesksView's own desk-maximize,
// with a panel maximized again inside it, pushes two. Every open() pushes
// ONE history entry and registers its DIRECT close callback (no
// history.back() inside it) on this shared LIFO stack; every UI-triggered
// close (✕ button, backdrop click, Esc, the 'v' shortcut) unwinds through
// history.back() instead of closing directly, so the stack and the
// browser's history entry count never drift apart — closing directly while
// leaving the pushed entry behind would leave history unbalanced (a stray
// Back press with nothing to show for it).
//
// The popstate handler is wired exactly once no matter how many overlay
// "instances" call pushOverlay (six per-desk panel sets plus the desk-level
// overlay, on /economy/explore/payments): it pops the most recently opened
// overlay and closes it directly. A popstate with nothing on the stack —
// e.g. the payments page's jump-nav, which pushes its own '#anchor' entries
// — is left alone, per the "otherwise do nothing" contract.
const overlayStack: Array<() => void> = [];
let overlayWiringDone = false;
function ensureOverlayWiring() {
  if (overlayWiringDone) return;
  overlayWiringDone = true;
  window.addEventListener('popstate', () => {
    const top = overlayStack.pop();
    top?.();
  });
  // Escape is handled ONCE, globally, here — not per overlay instance. If
  // every instance registered its own "Escape closes me" listener, a single
  // Escape press with two overlays open (desk + panel) would fire both and
  // over-unwind two levels at once instead of one; going through the shared
  // stack (like the ✕ button / Back button) always closes just the top.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || isTyping(e.target)) return;
    if (overlayStack.length > 0) history.back();
  });
}
// Call from an overlay's open(): pushes the history entry and registers the
// direct-close callback to run when this entry is popped. `close` must be
// the RAW close (no history.back() inside) — see requestOverlayClose below
// for the UI-facing counterpart.
export function pushOverlay(id: string, close: () => void) {
  ensureOverlayWiring();
  overlayStack.push(close);
  history.pushState({ tsoiMax: id }, '');
}
// Call from any UI close gesture (✕ button, backdrop click, 'v' toggle) that
// isn't Escape (handled globally above). No-ops if nothing is open.
export function requestOverlayClose() {
  if (overlayStack.length > 0) history.back();
}

// --- maximize overlay --------------------------------------------------
export interface MaximizeOptions {
  panels: HTMLElement[]; // each must contain a .panel-bar and a .panel-max button
  resize: (panel: HTMLElement) => void; // called (next frame) after open/close
  onOpen?: (panel: HTMLElement) => void;
  onClose?: (panel: HTMLElement) => void;
}

let maxStyleInjected = false;
function injectMaxStyle() {
  if (maxStyleInjected) return;
  maxStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .tsoi-max-backdrop { position: fixed; inset: 0; z-index: 39; background: rgba(0,0,0,0.55); }
    .panel.maximized { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; }
    .panel.maximized .chart { flex: 1 !important; height: auto !important; }
    .panel-max {
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      width: 24px; height: 24px; padding: 0; border: 0; border-radius: 2px; cursor: pointer;
      background: transparent; color: var(--tsoi-color-on-surface-variant); font-size: 16px; line-height: 1;
    }
    .panel-max:hover { background: var(--tsoi-color-surface-container-high); color: var(--tsoi-color-on-surface); }
  `;
  document.head.appendChild(style);
}

export function initMaximize({ panels, resize, onOpen, onClose }: MaximizeOptions) {
  injectMaxStyle();
  const backdrop = document.createElement('div');
  backdrop.className = 'tsoi-max-backdrop';
  backdrop.hidden = true;
  document.body.appendChild(backdrop);

  let current: HTMLElement | null = null;
  let seq = 0;
  const doOpen = (panel: HTMLElement) => {
    current = panel;
    panel.classList.add('maximized');
    backdrop.hidden = false;
    const btn = panel.querySelector<HTMLButtonElement>('.panel-max');
    if (btn) { btn.textContent = '✕'; btn.setAttribute('aria-label', 'Close'); }
    onOpen?.(panel);
    requestAnimationFrame(() => resize(panel));
  };
  // The DIRECT close — only ever called from the popstate handler in
  // ensureOverlayWiring above (via the callback pushOverlay registers), or
  // as a same-instance switch-without-a-Back-step below (see open()).
  const doClose = () => {
    if (!current) return;
    const panel = current;
    current = null;
    panel.classList.remove('maximized');
    backdrop.hidden = true;
    const btn = panel.querySelector<HTMLButtonElement>('.panel-max');
    if (btn) { btn.textContent = '⤢'; btn.setAttribute('aria-label', 'Maximize panel'); }
    onClose?.(panel);
    requestAnimationFrame(() => resize(panel));
  };
  const open = (panel: HTMLElement) => {
    if (current === panel) return;
    // Switching directly between two panels in this same instance (only
    // reachable via the 'v' shortcut, since a maximized panel's fixed
    // overlay covers any other panel a click could target) — close the old
    // one immediately rather than round-tripping through history.back();
    // open() below still pushes exactly one new entry for the new panel.
    if (current) doClose();
    doOpen(panel);
    pushOverlay(`panel-${++seq}`, doClose);
  };
  const close = () => { if (current) requestOverlayClose(); };
  const toggle = (panel: HTMLElement) => (panel.classList.contains('maximized') ? close() : open(panel));

  panels.forEach((panel) => {
    panel.querySelector<HTMLButtonElement>('.panel-max')?.addEventListener('click', () => toggle(panel));
  });
  backdrop.addEventListener('click', close);

  // Grafana convention: hover a panel, press "v" to maximize/restore it.
  // Escape is handled once, globally, by ensureOverlayWiring's shared
  // listener (see above) — not here, so nested overlays unwind exactly one
  // level per press regardless of how many initMaximize() instances exist
  // on the page.
  let hovered: HTMLElement | null = null;
  panels.forEach((panel) => {
    panel.addEventListener('mouseenter', () => { hovered = panel; });
    panel.addEventListener('mouseleave', () => { if (hovered === panel) hovered = null; });
  });
  document.addEventListener('keydown', (e) => {
    if (isTyping(e.target)) return;
    if ((e.key === 'v' || e.key === 'V') && hovered) toggle(hovered);
  });

  return { close, toggle };
}

// --- info tooltips -------------------------------------------------------
// Elements carrying data-info="…" get a dotted underline and a small tooltip
// (hover/focus on desktop, tap-to-toggle on touch). No icons — the dotted
// underline itself is the affordance.
let tipStyleInjected = false;
let tipEl: HTMLElement | null = null;
function injectTipStyle() {
  if (tipStyleInjected) return;
  tipStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    /* :not(button) — buttons (e.g. the Cr|bn toggle) are already self-evidently
       interactive; the dotted underline is for plain text (titles, stat labels). */
    [data-info]:not(button) { text-decoration: underline dotted; text-decoration-color: var(--tsoi-color-on-surface-variant); text-underline-offset: 3px; }
    .tsoi-info-tip {
      position: fixed; z-index: 60; max-width: 36ch; padding: 8px 10px;
      background: var(--tsoi-color-surface); border: 1px solid var(--tsoi-color-outline); border-radius: 2px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
      font: var(--tsoi-text-byline); letter-spacing: 0.02em; color: var(--tsoi-color-on-surface-variant);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export function initInfoTooltips(root: ParentNode = document) {
  injectTipStyle();
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tsoi-info-tip';
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  const tip = tipEl;
  const coarse = isCoarsePointer();
  let openEl: HTMLElement | null = null;

  const place = (el: HTMLElement) => {
    const text = el.dataset.info;
    if (!text) return;
    tip.textContent = text;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = r.bottom + 6;
    let left = r.left;
    if (left + tw > innerWidth - 8) left = Math.max(8, innerWidth - tw - 8);
    if (top + th > innerHeight - 8) top = r.top - th - 6;
    tip.style.top = `${Math.max(8, top)}px`;
    tip.style.left = `${Math.max(8, left)}px`;
  };
  const show = (el: HTMLElement) => { openEl = el; place(el); };
  const hide = () => { tip.hidden = true; openEl = null; };

  root.querySelectorAll<HTMLElement>('[data-info]:not([data-info-wired])').forEach((el) => {
    el.dataset.infoWired = '1';
    if (el.tabIndex < 0) el.tabIndex = 0;
    if (coarse) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openEl === el ? hide() : show(el);
      });
    } else {
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', () => show(el));
      el.addEventListener('blur', hide);
    }
  });
  document.addEventListener('click', (e) => {
    if (openEl && !(e.target as HTMLElement).closest('[data-info]')) hide();
  });
  document.addEventListener('scroll', hide, { passive: true, capture: true });
}

// --- touch: retap a panel to dismiss its tooltip -------------------------
// A coarse pointer has no hover, so ECharts shows its tooltip on tap and
// leaves it up until a tap lands somewhere that isn't the chart. On the
// stacked desks page that "somewhere" is the few pixels of gutter between two
// panels — a target nobody can hit deliberately, so the tooltip felt stuck.
//
// A blanket "second tap anywhere hides it" would be wrong: tapping a
// different point on the series is how you READ along the line, and that must
// keep moving the tooltip rather than dismissing it. So the toggle is keyed on
// WHERE the tap landed — a retap within a finger's width of the tap that
// opened the tooltip closes it; anything further away is a new point.
//
// Pixel proximity rather than a data index on purpose: it needs no axis
// conversion and so behaves identically on cartesian panels, pies and the
// state map, none of which share a coordinate system.
const SAME_TAP_PX = 18;

export function initTouchTipToggle(chart: ECharts) {
  if (!isCoarsePointer()) return;
  let shownAt: { x: number; y: number } | null = null;

  chart.getZr().on('click', (e: { offsetX: number; offsetY: number }) => {
    const { offsetX: x, offsetY: y } = e;
    if (shownAt && Math.hypot(x - shownAt.x, y - shownAt.y) <= SAME_TAP_PX) {
      chart.dispatchAction({ type: 'hideTip' });
      shownAt = null;
      return;
    }
    shownAt = { x, y };
  });

  // ECharts can dismiss the tooltip on its own (a tap outside the canvas, a
  // re-render, a range change). That leaves our record stale, and the next tap
  // on the old spot would try to hide a tooltip that isn't there — so forget
  // the position whenever the pointer leaves the chart.
  chart.on('globalout', () => {
    shownAt = null;
  });
}

// --- touch tooltips: click to open, explicit close ------------------------
// Two touch problems, one helper. ECharts' default trigger is 'mousemove|click',
// and on a touch screen the touchmove of a page scroll counts as a move, so
// tooltips pop open unasked while the reader is only scrolling past a chart:
// triggerOn 'click' means a deliberate tap is required. And once open the sole
// way out is initTouchTipToggle's retap-the-same-spot, which nothing on screen
// advertises: `enterable` lets the box take input so it can carry a real close
// control.
//
// The x is injected into the tooltip ELEMENT rather than into each chart's
// formatter. Dashboards build tooltip content in a dozen different places and
// two of them use `valueFormatter` with no formatter to wrap at all, so doing it
// at the DOM level is one implementation that covers every chart type.
//
// Call after every setOption(option, true) — notMerge drops the tooltip merge,
// same contract as activateDragZoom. Re-entrant: the observer and the delegated
// listener are wired once per chart.
const TIP_CLOSE = 'data-tsoi-tip-close';
const tipCloseWired = new WeakSet<object>();

export function initTouchTooltipClose(chart: ECharts) {
  if (!isCoarsePointer()) return;
  // Don't conjure a tooltip on a panel that deliberately has none — merging one
  // in would pop an empty box on tap.
  const tips = (chart.getOption() as { tooltip?: unknown[] } | undefined)?.tooltip;
  if (!Array.isArray(tips) || !tips.length) return;
  chart.setOption({ tooltip: { enterable: true, triggerOn: 'click', hideDelay: 4000 } } as never);
  if (tipCloseWired.has(chart)) return;
  tipCloseWired.add(chart);

  const host = chart.getDom() as HTMLElement;
  // ECharts appends its tooltip as an absolutely-positioned sibling of the
  // canvas wrapper; identify it structurally rather than by class (it has none).
  const isTip = (el: Element): el is HTMLElement =>
    el instanceof HTMLElement && /position:\s*absolute/.test(el.getAttribute('style') || '')
    && !el.querySelector('canvas');

  const decorate = () => {
    for (const el of Array.from(host.children)) {
      if (!isTip(el)) continue;
      if (el.style.display === 'none' || !el.innerHTML.trim()) continue;
      if (el.querySelector(`[${TIP_CLOSE}]`)) continue;   // content is rewritten on every show
      const x = document.createElement('span');
      x.setAttribute(TIP_CLOSE, '');
      x.setAttribute('role', 'button');
      x.setAttribute('aria-label', 'Close');
      x.textContent = '\u00d7';
      // inline + inherited colour: this node is created at runtime so no
      // stylesheet reaches it, and inheriting keeps it correct in both themes
      x.style.cssText = 'float:right;margin:-6px -6px 0 12px;padding:6px 10px;'
        + 'font-size:18px;line-height:18px;font-weight:600;color:inherit;opacity:.75;'
        + 'cursor:pointer;pointer-events:auto;touch-action:manipulation;';
      el.insertBefore(x, el.firstChild);
    }
  };
  new MutationObserver(decorate).observe(host,
    { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

  host.addEventListener('click', (ev: Event) => {
    const x = (ev.target as HTMLElement)?.closest?.(`[${TIP_CLOSE}]`);
    if (!x) return;
    ev.stopPropagation();
    ev.preventDefault();
    // hideTip alone loses the race: the tap that lands on the x is itself a
    // pointer-enter on the box, and enterable's keep-showing wins. Hide the node
    // and tell ECharts to agree, or the next tap reopens at the stale position.
    (x.parentElement as HTMLElement | null)?.style.setProperty('display', 'none');
    chart.dispatchAction({ type: 'hideTip' });
  }, true);
}

// --- drag-to-select zoom (Grafana-style, mouse only) ---------------------
// Spread into a time-series option. A bare toolbox `feature: {dataZoom:
// {show:false}}` (the usual invisible-chrome recipe) turns out to no-op on
// ECharts 6: ToolboxView.render() bails out entirely when the top-level
// toolbox itself is `show:false`, so its brush controller never gets built.
// The standalone `brush` component has no such gate, so we drive it directly
// and turn its selection into a `dataZoom` action ourselves (activateDragZoom
// below) — but `brush`'s own preprocessor auto-injects a visible mini toolbar
// of select-type icons unless the toolbox is explicitly suppressed, so
// `toolbox: {show:false}` still has to ride along (it only hides chrome here;
// ToolboxView and BrushView are independent components, so it doesn't touch
// the brush's actual drag behaviour).
export const dragZoomOption = () => ({
  brush: {
    xAxisIndex: 'all' as const,
    throttleType: 'debounce' as const,
    throttleDelay: 0,
    removeOnClick: true,
  },
  toolbox: { show: false },
});

const wiredCharts = new WeakSet<object>();
const armBrush = (chart: ECharts) =>
  chart.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'lineX', brushMode: 'single' } });

// Call once after every setOption(option, true) on a chart whose option
// included dragZoomOption(). notMerge rebuilds the brush component, so the
// arm-brush dispatch must be re-sent each render. No-op on touch: those
// charts keep only the slider (see isCoarsePointer / the runtime's isCoarse policy).
export function activateDragZoom(chart: ECharts) {
  if (isCoarsePointer()) return;
  armBrush(chart);
  if (!wiredCharts.has(chart)) {
    wiredCharts.add(chart);
    // A completed lineX brush selects a range but doesn't zoom by itself —
    // convert it to a dataZoom action, then clear the selection cover (a
    // transient drag gesture, not a lingering highlighted region) and re-arm
    // for the next drag.
    chart.on('brushEnd', (params: any) => {
      const area = params.areas?.[0];
      if (!area?.coordRange) return;
      const [startValue, endValue] = area.coordRange;
      chart.dispatchAction({ type: 'dataZoom', startValue, endValue });
      chart.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
      armBrush(chart);
    });
    chart.getZr().on('dblclick', () => chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 }));
  }
}

export { isCoarsePointer };
