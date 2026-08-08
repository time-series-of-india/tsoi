// Desk-board client runtime — the wiring half of DesksView.astro.
//
// Everything here is scoped to ONE board root element: `initBoard(root)` reads
// the desk specs out of that root's markup, wires its controls, charts, folds
// and maximize overlays, and touches nothing outside it. That is the whole
// point of the module — the wiring used to live inline in DesksView.astro and
// reach for the document (`document.querySelector('.desk')`,
// `document.getElementById(...)`), which meant one board per page and, since
// Astro dedupes identical script tags, a second board on the page would have
// silently got no wiring at all. Copying the file was the old way around that.
//
// The pure data half stays in runtime.ts (spec + rows + control state → an
// ECharts option); this module owns only the DOM.
//
// Document-level work that legitimately stays document-level: the theme
// MutationObserver on <html>, outside-click handlers that close a menu, the
// maximize backdrop appended to <body>, and the scroll listener that restacks
// the sticky desk bars.
import * as echarts from 'echarts';
import { accentColor, buildPanel, cascadeRows, computeStat, derivedValues, filterOptions, liveOptionValues, monthLabel, one, readTokens, resolveRange, SEARCH_THRESHOLD, splitFilter, takeFoot } from './runtime';
import { createLazyRows } from './lazy';
import { legendIsolation } from './legend';
import { shapeDataset } from './shapes';
import { adopt, parse as parseShare, serialize as serializeShare, splitHash, type ShareControl } from './share';
import { composePanelCard, downloadPanelCard, type PanelCardInput } from './panel-card';
import { initInfoTooltips, initMaximize, initTouchTipToggle, initTouchTooltipClose, isCoarsePointer, pushOverlay, requestOverlayClose } from '../panel-chrome';
import { flashLabel, wireShareMenu } from '../share-menu';
import { fitPopover } from '../popover-fit';
import type { DashboardSpec, Control, PanelSpec, Row, CtrlState } from './runtime';

/**
 * Can this browser put a FILE into the system share sheet?
 *
 * Asked once, with a one-byte PNG, because `navigator.canShare` answers about
 * the payload and not about the API: Chrome on a desktop has `navigator.share`
 * and still says no to files. A no means the 'Share image' item is removed
 * rather than left to fail under the reader's finger. The same probe the RTM
 * page runs, deferred to first use here because this module is imported by the
 * page scripts rather than evaluated in a browser at import time.
 */
let canShareFiles: boolean | null = null;
function canShareFilesProbe(): boolean {
  if (canShareFiles !== null) return canShareFiles;
  try {
    const probe = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' });
    canShareFiles = !!navigator.canShare?.({ files: [probe] });
  } catch {
    canShareFiles = false;
  }
  return canShareFiles;
}

export interface BoardHandle {
  /** The board root this handle drives. */
  root: HTMLElement;
  /** Anchor ids of the desks on this board, in document order. */
  anchors: string[];
  /**
   * Force-expand the desk with this anchor, then scroll to it — or, with
   * `panel`, to that panel on it (`#anchor.panelId`).
   */
  expandAndScrollTo(anchor: string, opts?: { smooth?: boolean; panel?: string | null }): void;
}

// Every board initialized on this page. A page's own scripts (a jump nav, say)
// import from this module rather than going through a window global: importing
// the same module is what gets them the same state.
const boards: BoardHandle[] = [];

/**
 * Wire one board. `root` is the element wrapping the page bar and the desks;
 * a root with no `.desk` inside is a no-op. Returns the board's handle.
 */
export function initBoard(root: HTMLElement): BoardHandle | null {
  const deskEls = Array.from(root.querySelectorAll<HTMLElement>('.desk'));
  if (deskEls.length === 0) return null;

  const specs: DashboardSpec[] = deskEls.map((el) => {
    const specEl = el.querySelector('script.desk-spec')!;
    return JSON.parse(specEl.textContent!);
  });

  const initialized: boolean[] = deskEls.map(() => false);
  const deskCharts: (Record<string, echarts.ECharts> | null)[] = deskEls.map(() => null);
  const deskRenderAll: (() => void)[] = deskEls.map(() => () => {});
  const deskCtrl: (CtrlState | null)[] = deskEls.map(() => null);
  // Everything a share card needs about one panel, answered by the desk that
  // owns it. It lives here rather than in the share wiring below because the
  // context line is written in the desk's own labels — a division's name for its
  // code, a month's name for its key — and that map is built inside initDesk.
  const deskCardInput: ((panelId: string) => PanelCardInput | null)[] = deskEls.map(() => () => null);
  // Per-desk hook that re-syncs that desk's own range widget after the page
  // sets the shared token some other way (a drag on a chart). Only desks that
  // render their own 'dr' register one.
  const deskSyncRange: (() => void)[] = deskEls.map(() => () => {});

  // ── the state a shared link carries in ───────────────────────────────
  // Read ONCE per board, here, because it has to be in hand before the page
  // bar's own controls are seeded and long before a lazy desk decides what to
  // open on. Nothing is validated at this point: an id no control answers to is
  // simply never looked up, and a value no longer offered meets the same clamp
  // a chosen one would (see share.ts and docs/explore-share-v1-spec.md §1).
  const shared = parseShare(location.search);
  // Which ids the BOARD hoists to its page bar, read off the bar itself — those
  // are the ones that travel bare in the URL; every other control travels under
  // its desk's anchor.
  const hoistedIds = new Set(
    Array.from(root.querySelectorAll<HTMLElement>('.page-bar [data-scope="page"]')).map((el) => el.dataset.ctl!),
  );
  const sharedHoisted = (id: string): string | undefined => {
    if (!hoistedIds.has(id)) return undefined;
    const v = shared.hoisted[id]?.[0];
    return v ? v : undefined;
  };

  // ── desk collapse state (restored before anything else runs) ─────────
  // sessionStorage (not localStorage: per-tab, and a folding choice
  // shouldn't outlive the session) keyed by ANCHOR id, not index, so a
  // future desk-order change doesn't silently restore the wrong desk.
  // Not the URL: a shared link must not carry the sender's folding state.
  // Default (nothing stored) is all-expanded. This must run before the
  // initial-hash handling in expandAndScrollTo — the hash target has to win
  // over whatever was stored for it, and that only works if storage is
  // applied first. The key carries the board's own `data-board` name when it
  // has one, so two boards sharing a page keep separate folds; a lone
  // unnamed board keeps the plain per-path key.
  const boardKey = root.dataset.board ? `:${root.dataset.board}` : '';
  const COLLAPSE_KEY = `tsoi:desks:collapsed:${location.pathname}${boardKey}`;
  function loadCollapsedAnchors(): Set<string> {
    try {
      const raw = sessionStorage.getItem(COLLAPSE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set(); // private-mode/storage-full — folding is a nicety, not required for the page to work
    }
  }
  function saveCollapsedAnchors() {
    try {
      sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify(deskEls.filter((_, i) => collapsed[i]).map((el) => el.id)));
    } catch {
      /* ignore — see loadCollapsedAnchors */
    }
  }
  const storedCollapsed = loadCollapsedAnchors();
  const collapsed: boolean[] = deskEls.map((el) => storedCollapsed.has(el.id));
  function updateChevronUI(i: number) {
    const el = deskEls[i];
    const btn = el.querySelector<HTMLButtonElement>('.desk-collapse-btn');
    if (!btn) return;
    const isCollapsed = collapsed[i];
    btn.setAttribute('aria-expanded', String(!isCollapsed));
    btn.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${el.querySelector('.desk-title')?.textContent ?? ''} desk`);
    btn.classList.toggle('collapsed', isCollapsed);
  }
  function applyCollapsedDOM(i: number) {
    deskEls[i].classList.toggle('collapsed', collapsed[i]);
    updateChevronUI(i);
  }
  // Apply the restored state to the DOM up front — before eager/lazy init
  // below decide who gets to skip fetching. No aria/DOM state is deferred
  // to a later "hydration" pass; this IS first paint's steady state.
  deskEls.forEach((_, i) => applyCollapsedDOM(i));

  // ── page bar follows the maximize overlay ────────────────────────────
  // A maximized desk/panel is position:fixed over the whole viewport, so the
  // page bar (with its RANGE picker) would be hidden behind it. Rather than
  // float a second fixed copy above the overlay — which fights the desk
  // bar's sticky top offset and clips the stat strip — we physically MOVE
  // the one page-bar node into whichever overlay is on top, so it's plain
  // sticky flow again (page bar top:0, desk bar top:--tsoi-page-bar-h),
  // identical to the un-maximized page. Moving a node preserves its wired
  // listeners, so the RANGE control keeps working. A comment marks its home
  // slot for restore. relocatePageBar reads the live .maximized state, so it
  // handles the nested case (panel maximized inside a maximized desk) and is
  // safe to call after any open/close.
  const pageBar = root.querySelector<HTMLElement>('.page-bar');
  const pageBarHome = pageBar ? document.createComment('page-bar-home') : null;
  if (pageBar && pageBarHome) pageBar.before(pageBarHome);
  const relocatePageBar = () => {
    if (!pageBar || !pageBarHome) return;
    const host = root.querySelector<HTMLElement>('.panel.maximized')
      ?? root.querySelector<HTMLElement>('.desk.maximized');
    if (host) {
      if (host.firstChild !== pageBar) host.prepend(pageBar);
    } else if (pageBar.previousSibling !== pageBarHome) {
      pageBarHome.after(pageBar);
    }
  };

  // ── page-level RANGE control ─────────────────────────────────────────
  // Grafana model: one time picker drives every desk's ctrl.range, instead
  // of each desk keeping its own. The popover markup is the same 'dr'
  // widget the desks used to render individually (see DesksView's page-bar
  // template), just hoisted above them; state-wise has no 'range' global
  // and sits out of RANGE_DESK_IDX below.
  // A desk's range control may sit on its own bar or on the one panel that is
  // actually windowed (the headline desk's long line: its two other panels
  // publish 18 months and windowing them would be a control that does
  // nothing). Both scopes count as "this desk carries a range" — for the
  // shared token, for the drag-zoom that writes it, and for feeding the
  // popover's month list.
  const rangeControlsOf = (s: DashboardSpec) => [...(s.globals ?? []), ...s.panels.flatMap((p) => p.controls ?? [])];
  const RANGE_DESK_IDX = specs
    .map((s, i) => (rangeControlsOf(s).some((c) => c.id === 'range') ? i : -1))
    .filter((i) => i >= 0);
  const rangeCtl: Control | undefined = specs.flatMap(rangeControlsOf).find((c) => c.id === 'range');
  const pageDr = root.querySelector<HTMLElement>('.page-bar .dr[data-ctl="range"]');
  // A link that names the window opens on it. Verbatim, whatever resolveRange
  // accepts: a quick preset ('24', '0') and a custom window ('2019-01~2024-06')
  // are one wire format, and a token no desk can resolve falls through to that
  // desk's own domain exactly as a dragged one does.
  let globalRangeToken = sharedHoisted('range') ?? (rangeCtl?.default as string) ?? '24';
  // Union of every range-carrying desk's own month domain, grown as each
  // desk loads — populates the custom From/To selects. resolveRange itself
  // still resolves the shared token against each DESK's own domain when a
  // panel renders (per-dataset date coverage genuinely differs), so this is
  // only for what the popover's dropdowns can offer.
  let pageMonths: string[] = [];

  const pageRangeSummary = (token: string): string => {
    if (!rangeCtl) return '—';
    const q = (rangeCtl.quick ?? []).find((o) => o.value === token);
    if (q) return q.value === '0' ? 'All time' : /^\d+$/.test(q.value) ? `Last ${q.label}` : q.label;
    const win = resolveRange(token, pageMonths);
    return win ? `${monthLabel(win.from)} – ${monthLabel(win.to)}` : 'All time';
  };
  const syncPageRangeUI = () => {
    if (!pageDr) return;
    const win = resolveRange(globalRangeToken, pageMonths) ?? (pageMonths.length ? { from: pageMonths[0], to: pageMonths.at(-1)! } : null);
    const from = pageDr.querySelector<HTMLSelectElement>('.dr-from');
    const to = pageDr.querySelector<HTMLSelectElement>('.dr-to');
    if (win && from) from.value = win.from;
    if (win && to) to.value = win.to;
    pageDr.querySelector('.dr-summary')!.textContent = pageRangeSummary(globalRangeToken);
    pageDr.querySelectorAll<HTMLElement>('.dr-q').forEach((b) => b.classList.toggle('active', b.dataset.value === globalRangeToken));
  };
  const populatePageRange = () => {
    if (!pageDr) return;
    const opts = pageMonths.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join('');
    pageDr.querySelector('.dr-from')!.innerHTML = opts;
    pageDr.querySelector('.dr-to')!.innerHTML = opts;
    syncPageRangeUI();
  };
  function noteDeskMonths(months: string[]) {
    const set = new Set(pageMonths);
    let grew = false;
    for (const m of months) if (!set.has(m)) { set.add(m); grew = true; }
    if (!grew) return;
    pageMonths = [...set].sort();
    populatePageRange();
  }
  // Sets the ONE shared range and pushes it into every already-initialized
  // desk's own ctrl.range, re-rendering that desk. A desk that lazy-inits
  // later just reads globalRangeToken at that point (see initDesk below).
  function setGlobalRange(token: string) {
    globalRangeToken = token;
    syncPageRangeUI();
    for (const i of RANGE_DESK_IDX) {
      const ctrl = deskCtrl[i];
      if (!ctrl) continue; // not initialized yet — adopts globalRangeToken on init instead
      ctrl.range = token;
      // A drag-zoom sets the token without touching any widget, so a desk
      // showing its OWN range picker (no page-level one hoisted) has to be told
      // to re-label it — otherwise its summary keeps advertising the old window.
      deskSyncRange[i]();
      deskRenderAll[i]();
    }
  }

  // ── other page-level controls ────────────────────────────────────────────
  // The range picker above is the elaborate case (a popover with quick presets
  // and a custom window, and a token that resolves against each desk's own
  // month domain). Every OTHER hoisted control is the plain case: one value,
  // shared by every desk that declares a control of the same id, exactly as
  // BoardSpec.globals describes. The inflation board hoists a month select and
  // a sector toggle this way. A desk that declares neither simply never sees
  // them — which is why its desk info says so in words.
  const pageCtrlState: CtrlState = {};
  const pageCtlEls = Array.from(root.querySelectorAll<HTMLElement>('.page-bar [data-scope="page"]'))
    .filter((el) => !el.classList.contains('dr'));
  const deskGlobalIds = (i: number) => new Set((specs[i].globals ?? []).map((c) => c.id));
  function setPageCtrl(id: string, value: string) {
    pageCtrlState[id] = value;
    deskEls.forEach((_, i) => {
      const ctrl = deskCtrl[i];
      if (!ctrl || !deskGlobalIds(i).has(id)) return;
      ctrl[id] = value;
      deskRenderAll[i]();
    });
  }
  for (const el of pageCtlEls) {
    const id = el.dataset.ctl!;
    // The control's definition lives on whichever desk declares it; the page
    // bar only renders it. Seed the shared state from the baked default so a
    // desk initializing later adopts the same value the markup is showing.
    const def = specs.flatMap((s) => s.globals ?? []).find((c) => c.id === id)?.default;
    pageCtrlState[id] = one(def as string | string[] | undefined);
    // A shared link's value replaces the default, and the WIDGET has to show
    // it: the bar is rendered at build time and nothing else ever repaints it,
    // so a link that seeded the state silently would leave the reader looking
    // at a bar that disagrees with its own desks. A value the bar does not
    // offer is dropped rather than forced — the stale-link rule.
    const from = sharedHoisted(id);
    if (el.tagName === 'SELECT') {
      const sel = el as HTMLSelectElement;
      if (from && [...sel.options].some((o) => o.value === from)) sel.value = from;
      pageCtrlState[id] = sel.value || pageCtrlState[id];
      el.addEventListener('change', (e) => setPageCtrl(id, (e.target as HTMLSelectElement).value));
    } else {
      const btns = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
      const hit = from ? btns.find((b) => b.dataset.value === from) : undefined;
      if (hit) {
        btns.forEach((b) => b.classList.remove('active'));
        hit.classList.add('active');
        pageCtrlState[id] = from!;
      }
      btns.forEach((b) =>
        b.addEventListener('click', () => {
          el.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          setPageCtrl(id, b.dataset.value!);
        }));
    }
  }
  if (pageDr && rangeCtl) {
    const btn = pageDr.querySelector<HTMLButtonElement>('.dr-btn')!;
    const menu = pageDr.querySelector<HTMLElement>('.dr-menu')!;
    const from = pageDr.querySelector<HTMLSelectElement>('.dr-from')!;
    const to = pageDr.querySelector<HTMLSelectElement>('.dr-to')!;
    const close = () => { menu.hidden = true; };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      if (!menu.hidden) fitPopover(menu);
    });
    document.addEventListener('click', (e) => { if (!pageDr.contains(e.target as Node)) close(); });
    pageDr.querySelectorAll<HTMLButtonElement>('.dr-q').forEach((b) =>
      b.addEventListener('click', (e) => { e.stopPropagation(); close(); setGlobalRange(b.dataset.value!); }));
    const setCustom = () => setGlobalRange(`${from.value}~${to.value}`);
    from.addEventListener('change', () => { if (from.value > to.value) to.value = from.value; setCustom(); });
    to.addEventListener('change', () => { if (to.value < from.value) from.value = to.value; setCustom(); });
    syncPageRangeUI();
  }

  // Desk bars stick BELOW the page bar, not at the very top (see the
  // --tsoi-page-bar-h var in the <style> block) — measure it so the offset
  // (and the jump-nav's scroll-margin-top) tracks the bar's real height
  // instead of an assumed pixel value, in case it ever wraps to two lines.
  const pageBarEl = pageBar;
  if (pageBarEl) {
    const setPageBarH = () => root.style.setProperty('--tsoi-page-bar-h', `${pageBarEl.offsetHeight}px`);
    setPageBarH();
    new ResizeObserver(setPageBarH).observe(pageBarEl);
  }

  // Stack desk-bars by computing each one's `top` from the NEXT desk
  // section's live natural position, not from the previous bar's already-
  // resolved (possibly already-sliding) position. Two earlier attempts
  // both missed: a shared offset releases the outgoing bar a full bar-
  // height before the incoming one arrives (a visible slide with a gap);
  // a fixed cumulative offset closes that gap but then leaves the
  // outgoing bar's vacated slot permanently hollow once it's gone (nothing
  // covers it, so scrolled content bleeds through — visible on this
  // dashboard's own charts, six desks deep). Chasing the outgoing bar's
  // own (already-moving) rect just inherits whatever quirk made it move
  // early, one step removed. The fix: a desk SECTION is plain in-flow —
  // unlike its sticky `.desk-bar` child, its rect.top always reflects
  // where it truly, physically is on scroll, never adjusted (the same
  // property the desk-collapse scroll-anchor logic below already relies
  // on). Bar i rests at `base` until desk (i+1)'s true top, closing in
  // from below, would need to overlap bar i to keep scrolling normally —
  // only then does bar i get pushed, at the exact instant of contact
  // (zero gap, not early, not late), moving in lockstep with the incoming
  // section from that point on. Bar i can also never be pushed ABOVE its
  // own natural (unstuck) position — that floor is what lets it scroll
  // away cleanly once it's the one being chased off. The last bar has no
  // next section pushing it, so it just rests at `base` like an ordinary
  // single sticky bar. Mirrors meta.astro. A collapsed desk hides its
  // panels but never changes a bar's own height, so collapse/expand needs
  // no separate recompute — its own scroll-anchor logic below already
  // fires a 'scroll' event that re-triggers this.
  const deskBars = deskEls.map((d) => d.querySelector<HTMLElement>('.desk-bar')!);
  let stackRaf = 0;
  const restackDeskBars = () => {
    const base = pageBarEl?.offsetHeight ?? 0;
    const naturalTops = deskEls.map((d) => d.getBoundingClientRect().top);
    deskBars.forEach((bar, i) => {
      // A maximized desk is position:fixed, full-viewport, and the only one
      // showing — the OTHER desks' naturalTops still reflect wherever they
      // sit in the underlying (hidden) page, which is meaningless here and
      // was exactly the bug: a desk maximized while a neighbour's true top
      // happened to be far down this six-desk page inherited that huge
      // number as its own `top`, stranding the bar deep inside the
      // overlay's own (mostly empty) scroll box with a giant blank gap
      // above it. Maximized just wants the plain single-bar case, same as
      // the last desk below.
      if (deskEls[i].classList.contains('maximized')) { bar.style.top = `${base}px`; return; }
      // The LAST bar is never pushed by anything below it — leave it to
      // native CSS sticky (stylesheet `top: var(--tsoi-page-bar-h)` already
      // equals `base`). Writing its `top` every frame lands one frame behind
      // the compositor's own sticky, so during momentum / rubber-band scroll
      // at the page bottom it visibly wobbles; clearing the inline top lets
      // the stylesheet win and no per-frame JS touches it. Its section
      // position is still READ below to push the second-to-last bar.
      if (i === deskEls.length - 1) { bar.style.top = ''; return; }
      const ceiling = Math.min(base, naturalTops[i + 1] - bar.offsetHeight);
      const top = Math.max(naturalTops[i], ceiling);
      // Same wobble, same cure as the last bar — generalised. A bar only
      // needs hand-steering while the next desk is closing in from below and
      // pushing it ABOVE the page-bar offset; that downward slide is the
      // intended motion, and a per-frame `top` is what draws it. Every other
      // moment — the bar resting stuck at `base`, or still down in flow
      // waiting its turn — native CSS sticky (stylesheet `top: base`) already
      // holds it perfectly, and a JS `top` written each scroll frame only
      // lands one frame behind the compositor and wobbles, worst on
      // momentum / rubber-band touch scroll (mobile, iPad). So take over
      // ONLY during the active push and hand back to native the rest of the
      // time. `< base`, not `<= base`: at rest `top` clamps to exactly
      // `base`, which must go to native — only a strictly smaller value is a
      // live push. Up-scroll, where nothing is being pushed, is now pure
      // native sticky and no longer wobbles.
      if (top < base) bar.style.top = `${top}px`;
      else bar.style.top = '';
    });
  };
  const scheduleRestack = () => {
    if (stackRaf) return;
    stackRaf = requestAnimationFrame(() => { stackRaf = 0; restackDeskBars(); });
  };
  restackDeskBars();
  window.addEventListener('scroll', scheduleRestack, { passive: true });
  const deskBarStackObserver = new ResizeObserver(restackDeskBars);
  deskBars.forEach((bar) => deskBarStackObserver.observe(bar));
  if (pageBarEl) deskBarStackObserver.observe(pageBarEl);

  // A time-axis panel's x categories are period keys (see runtime.ts's
  // periodKey): 'YYYY-MM-DD' (daily), 'YYYY-MM' (monthly), 'YYYY-Qn'
  // (quarterly) or 'YYYY' (yearly), depending on THAT panel's own
  // aggregation control — fold any of them to the 'YYYY-MM' month bounds
  // resolveRange expects.
  const keyToMonth = (key: string, edge: 'from' | 'to'): string => {
    if (/^\d{4}$/.test(key)) return `${key}-${edge === 'from' ? '01' : '12'}`;
    if (/^\d{4}-Q[1-4]$/.test(key)) {
      const [y, q] = key.split('-Q');
      const startMonth = (+q - 1) * 3 + 1;
      return `${y}-${String(edge === 'from' ? startMonth : startMonth + 2).padStart(2, '0')}`;
    }
    return key.slice(0, 7); // daily or monthly keys both start with the month
  };
  const armDeskBrush = (chart: echarts.ECharts) =>
    chart.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'lineX', brushMode: 'single' } });
  const wiredBrushCharts = new WeakSet<object>();
  // A completed drag on ANY desk's time-series chart sets the ONE
  // page-global range (not a per-chart zoom — see panel-chrome.ts's
  // activateDragZoom, the per-panel version the standalone dashboard pages
  // still use). Double-click resets to the spec default ('24').
  function wireGlobalBrush(chart: echarts.ECharts) {
    if (isCoarsePointer()) return;
    armDeskBrush(chart);
    if (wiredBrushCharts.has(chart)) return;
    wiredBrushCharts.add(chart);
    chart.on('brushEnd', (params: any) => {
      chart.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
      armDeskBrush(chart);
      const range = params.areas?.[0]?.coordRange as [number, number] | undefined;
      if (!range) return;
      const cats = (chart.getOption().xAxis as any[])?.[0]?.data as string[] | undefined;
      if (!cats?.length) return;
      const i0 = Math.max(0, Math.min(cats.length - 1, Math.floor(Math.min(range[0], range[1]))));
      const i1 = Math.max(0, Math.min(cats.length - 1, Math.ceil(Math.max(range[0], range[1]))));
      const from = keyToMonth(cats[i0], 'from');
      const to = keyToMonth(cats[i1], 'to');
      setGlobalRange(from <= to ? `${from}~${to}` : `${to}~${from}`);
    });
    chart.getZr().on('dblclick', () => setGlobalRange((rangeCtl?.default as string) ?? '24'));
  }

  // One shared india-states geojson fetch even if several desks map it.
  let indiaMapPromise: Promise<void> | null = null;
  const ensureIndiaMap = () => {
    if (!indiaMapPromise) {
      indiaMapPromise = fetch('/maps/india_states.json')
        .then((r) => r.json())
        .then((geo) => { echarts.registerMap('india', geo); });
    }
    return indiaMapPromise;
  };

  async function initDesk(i: number) {
    if (initialized[i]) return;
    initialized[i] = true;
    const deskRoot = deskEls[i];
    const spec = specs[i];
    // Panels are found by data-panel WITHIN this desk, so nothing depends on
  // page-unique element ids and two boards can carry the same panel ids.
  const panelEl = (id: string) => deskRoot.querySelector<HTMLElement>(`[data-panel="${id}"]`);

    // A footnote a chart computed for itself (see takeFoot in runtime.ts),
    // parked at the foot of the desk with the static small print instead of
    // under the figure. It keeps its panel's position in the foot — the notes
    // read in panel order, so a reader scanning down the desk meets them in
    // the order they met the charts — and it names its panel, because down
    // here it is no longer under the figure it is about.
    // data-note-computed is what makes this safe to own: the build-time notes
    // carry data-note-panel too (so both kinds sort together), and without the
    // second attribute the first render of a panel with a static note and no
    // computed one would delete the static note as a stale leftover.
    // Astro scopes BoardView's styles with a data-astro-cid-* attribute it
    // stamps on the elements IT renders. An element built here has no such
    // attribute, so `.desk-foot-note` would match nothing and a footnote would
    // come out in body text at body size in the middle of the small print.
    // Copy the marker off an element the component did render.
    const scopeAttrs = Array.from(deskRoot.attributes)
      .filter((a) => a.name.startsWith('data-astro-cid-'));
    const withScope = <T extends HTMLElement>(el: T): T => {
      for (const a of scopeAttrs) el.setAttribute(a.name, a.value);
      return el;
    };

    const setDeskFoot = (id: string, text?: string) => {
      let foot = deskRoot.querySelector<HTMLElement>('.desk-foot');
      const existing = foot?.querySelector<HTMLElement>(`[data-note-panel="${id}"][data-note-computed]`);
      if (!text) { existing?.remove(); return; }
      if (existing) { existing.querySelector('.desk-foot-text')!.textContent = text; return; }
      if (!foot) {
        // Same shape BoardView renders, closed the same way: a desk whose only
        // small print is computed must not get a foot that behaves differently
        // from every other desk's.
        foot = withScope(document.createElement('details'));
        foot.className = 'desk-foot';
        const sum = withScope(document.createElement('summary'));
        sum.className = 'desk-foot-summary';
        sum.textContent = 'Notes and sources';
        foot.append(sum);
        deskRoot.querySelector('.desk-body')!.append(foot);
      }
      const p = withScope(document.createElement('p'));
      p.className = 'desk-foot-note';
      p.dataset.notePanel = id;
      p.dataset.noteComputed = '';
      p.innerHTML = '<span class="desk-foot-panel"></span> <span class="desk-foot-text"></span>';
      p.querySelectorAll<HTMLElement>('span').forEach((s) => withScope(s));
      // The panel is named once. Where the same panel already has a written
      // note, this sentence follows it as a second paragraph on the same
      // subject rather than repeating the heading.
      const written = foot.querySelector<HTMLElement>(`[data-note-panel="${id}"]:not([data-note-computed])`);
      const title = spec.panels.find((x) => x.id === id)?.title ?? '';
      p.querySelector('.desk-foot-panel')!.textContent = written ? '' : `${title}.`;
      p.querySelector('.desk-foot-text')!.textContent = text;
      // Slot it among the notes by panel order; the source line stays last.
      const order = spec.panels.map((x) => x.id);
      const after = [...foot.querySelectorAll<HTMLElement>('[data-note-panel]')]
        .find((el) => order.indexOf(el.dataset.notePanel!) > order.indexOf(id));
      foot.insertBefore(p, after ?? foot.querySelector('.desk-source'));
    };

    // Most generators emit `{ rows: [...] }` and pass straight through; a spec
    // declaring a `shape` reads a nested document that shapes.ts flattens (the
    // same call enrich.ts makes at build time), and may hand back non-tabular
    // slices for `widget` panels to mount whole.
    const data = shapeDataset(spec.shape, await fetch(spec.dataset).then((r) => r.json()));
    // The rows the desk was built with, and — where a desk declares `lazyRows`
    // — whatever the last fetched document added to them. `rows` is a `let`
    // rather than a const because every closure below reads the binding, so
    // replacing it is how a late arrival reaches the panels without any of them
    // knowing a fetch happened.
    const baseRows = data.rows;
    let rows: Row[] = baseRows;

    // The as-of chip is rendered at build time (BoardView reads every dataset's
    // vintage there anyway): on the page bar where all the desks agree, on the
    // desk bars where they do not. It used to be injected here, which meant it
    // arrived a beat after the bar it sits in and reflowed it.
    if (spec.panels.some((p) => p.chart === 'choropleth')) await ensureIndiaMap();

    const fieldControls = [...(spec.globals ?? []), ...spec.panels.flatMap((p) => p.controls ?? [])]
      .filter((c) => (c.type === 'select' || c.type === 'multiselect') && c.field);
    const allControls: Control[] = [...(spec.globals ?? []), ...spec.panels.flatMap((p) => p.controls ?? [])];
    const ctrl: CtrlState = {};
    for (const c of allControls) ctrl[c.id] = c.default;
    // A desk that lazy-inits after the reader has already moved the page's
    // RANGE control adopts the current global value, not the spec default.
    if (allControls.some((c) => c.id === 'range')) ctrl.range = globalRangeToken;
    // Same for every other hoisted control (month, sector, …).
    for (const [id, v] of Object.entries(pageCtrlState)) {
      if (v !== '' && allControls.some((c) => c.id === id)) ctrl[id] = v;
    }
    // And last, whatever the shared link said about THIS desk (see share.ts):
    // last because a desk-scoped value is the most specific thing the link can
    // say, and here rather than after the widgets are built because everything
    // below — the derived values, the cascades, the option lists, the clamps —
    // has to treat a seeded value exactly as it treats a chosen one. A desk
    // that lazy-inits on scroll runs this too, so a link opens the same board
    // whether the reader lands above the fold or three desks down.
    const sharedDesk = shared.desks[deskRoot.id] ?? {};
    const seededIds: string[] = [];
    for (const c of allControls) {
      const v = adopt(c, sharedDesk[c.id]);
      if (v === undefined) continue;
      ctrl[c.id] = v;
      seededIds.push(c.id);
    }
    deskCtrl[i] = ctrl;

    // ── control values that are worked out rather than chosen ─────────────
    // A desk with two pickers and a switch saying which is in charge has one
    // question its panels want answered, and this is where it is answered —
    // once, before anything renders, rather than by every encoding testing the
    // switch for itself. See DashboardSpec.derived.
    const applyDerived = () => Object.assign(ctrl, derivedValues(spec.derived, ctrl));
    applyDerived();

    const depField = (id: string) => fieldControls.find((s) => s.id === id)?.field ?? id;
    // The control's constant scope plus whatever its cascades narrow it to —
    // including the 'control>field' form, and the rule that a cascade with
    // nothing to narrow to narrows nothing (see cascadeRows).
    const scopedRows = (c: Control) => cascadeRows(c, rows, ctrl, depField);
    // A control carrying `labelField` holds a KEY and shows a NAME (the state
    // picker holds the map's own region spelling, the item picker a COICOP
    // code). The map is rebuilt on every repopulate, so a cascade can't leave
    // last scope's names behind. Same rule enrich.ts bakes at build time.
    const labelMaps = new Map<string, Map<string, string>>();
    const labelMapOf = (c: Control) => {
      const m = new Map<string, string>();
      if (!c.labelField) return m;
      for (const row of scopedRows(c)) {
        const k = row[c.field!] == null ? null : String(row[c.field!]);
        if (k == null || row[c.labelField] == null || m.has(k)) continue;
        m.set(k, String(row[c.labelField]));
      }
      labelMaps.set(c.id, m);
      return m;
    };
    const scoped = (c: Control) => {
      const vals = [...new Set(scopedRows(c).filter((row) => row[c.field!] != null).map((row) => String(row[c.field!])))].sort();
      if (!c.labelField) return vals;
      const m = labelMapOf(c);
      return vals.sort((a, b) => (m.get(a) ?? a).localeCompare(m.get(b) ?? b));
    };
    const labelOf = (c: Control, o: string) =>
      labelMaps.get(c.id)?.get(o) ?? c.labels?.[o] ?? (c.field === 'month' ? monthLabel(o) : o);
    // Which group each option falls under, where the control asks for headings.
    // Rebuilt on every repopulate for the same reason labelMaps is: a cascade
    // must not leave the last scope's grouping behind.
    const groupMapOf = (c: Control) => {
      const m = new Map<string, string>();
      if (!c.groupBy) return m;
      for (const row of scopedRows(c)) {
        const k = row[c.field!] == null ? null : String(row[c.field!]);
        if (k == null || row[c.groupBy] == null || m.has(k)) continue;
        m.set(k, String(row[c.groupBy]));
      }
      return m;
    };
    function populate(c: Control) {
      const el = deskRoot.querySelector<HTMLSelectElement>(`select[data-ctl="${c.id}"]`);
      if (!el || !c.field) return;
      const opts = scoped(c);
      if (!opts.includes(one(ctrl[c.id]))) ctrl[c.id] = opts[0];
      const optHtml = (o: string) =>
        `<option value="${o}"${o === one(ctrl[c.id]) ? ' selected' : ''}>${labelOf(c, o)}</option>`;
      if (!c.groupBy) { el.innerHTML = opts.map(optHtml).join(''); return; }
      // Same structure optionGroups() builds at build time, off the live rows:
      // the spec's own group order first, then anything the data has that the
      // spec did not name.
      const gm = groupMapOf(c);
      const order = [...Object.keys(c.groupLabels ?? {})];
      for (const o of opts) { const g = gm.get(o); if (g && !order.includes(g)) order.push(g); }
      el.innerHTML = order.map((g) => {
        const inGroup = opts.filter((o) => gm.get(o) === g);
        if (!inGroup.length) return '';
        return `<optgroup label="${c.groupLabels?.[g] ?? g}">${inGroup.map(optHtml).join('')}</optgroup>`;
      }).join('');
    }
    function updateSummary(el: HTMLElement, c: Control) {
      const arr = Array.isArray(ctrl[c.id]) ? (ctrl[c.id] as string[]) : [];
      const total = el.querySelectorAll('input[type="checkbox"]').length;
      el.querySelector('.ms-summary')!.textContent =
        total && arr.length === total ? `All (${total})` : arr.length <= 2 ? arr.map((v) => labelOf(c, v)).join(', ') : `${arr.length} of ${total}`;
    }
    function populateMulti(c: Control) {
      const el = deskRoot.querySelector<HTMLElement>(`.ms[data-ctl="${c.id}"]`);
      if (!el || !c.field) return;
      const r = scopedRows(c);
      // Through `scoped`, which skips rows not carrying the field at all —
      // without that, String(undefined) becomes a literal "undefined" option,
      // which a dataset holding several row kinds always produces since only
      // some kinds carry any given dimension — and which orders a labelled
      // control by the names it shows rather than the keys it holds.
      const opts = scoped(c);
      const prev = Array.isArray(ctrl[c.id]) ? (ctrl[c.id] as string[]) : [];
      let sel = prev.filter((v) => opts.includes(v));
      if (sel.length === 0) {
        if (c.defaultTop) {
          const by = c.rankBy ?? 'volume_cr';
          const tot: Record<string, number> = {};
          for (const row of r) { const k = String(row[c.field!]); tot[k] = (tot[k] ?? 0) + (Number(row[by]) || 0); }
          sel = opts.slice().sort((a, b) => (tot[b] ?? 0) - (tot[a] ?? 0)).slice(0, c.defaultTop);
        } else sel = opts.slice();
      }
      ctrl[c.id] = sel;
      el.querySelector('.ms-opts')!.innerHTML = opts
        .map((o) => `<label class="ms-opt"><input type="checkbox" value="${o}"${sel.includes(o) ? ' checked' : ''}/>${labelOf(c, o)}</label>`)
        .join('');
      const search = el.querySelector<HTMLInputElement>('.ms-search');
      if (search) search.value = '';
      updateSummary(el, c);
    }
    // A `search` select whose option list has grown past the threshold is
    // driven by a combobox instead (see wireCombobox). The two are kept in
    // step here rather than by the combobox watching the DOM: whoever rewrote
    // the options says so, and a control that never cascades simply syncs once.
    const comboSync = new Map<string, () => void>();
    const repopulate = (c: Control) => {
      (c.type === 'multiselect' ? populateMulti : populate)(c);
      comboSync.get(c.id)?.();
    };
    for (const c of fieldControls) repopulate(c);

    const charts: Record<string, echarts.ECharts> = {};
    for (const p of spec.panels) {
      if (p.chart === 'stat' || p.chart === 'widget') continue;
      charts[p.id] = echarts.init(panelEl(p.id)!);
      // Touch only: retap the same spot to dismiss the tooltip, rather than
      // hunting for the gutter between two stacked panels.
      initTouchTipToggle(charts[p.id]);
    }
    deskCharts[i] = charts;

    // ── widget panels ─────────────────────────────────────────────────────
    // A `widget` panel is a desk-shaped host for a figure a READ already built
    // by hand — the aggregation funnel, here. The board gains a desk it could
    // not have drawn from a chart kind, and the read keeps one implementation
    // instead of two. The module is only fetched by a board that asks for one.
    // The widget owns its own DOM inside the panel; the board owns its chrome,
    // its controls and when it redraws.
    const widgets: Record<string, {
      refresh(): void; setStage(s: number): void;
      select?(code: string): string | null;
    }> = {};
    const widgetPanels = spec.panels.filter((p) => p.chart === 'widget');
    if (widgetPanels.length) {
      const mod = await import('../reads/inflation-widgets');
      for (const p of widgetPanels) {
        const host = panelEl(p.id);
        if (!host) continue;
        host.innerHTML = '<div class="py-area"></div>';
        if (p.widget === 'pyramid') {
          // stageButton off: the panel bar carries the ink control instead, so
          // the same switch isn't offered twice in one panel. resetButton off
          // for the same reason: the bar's item picker is the way back to any
          // strand, so a button that only knows the way back to one of them
          // would be a second, weaker version of the same control.
          widgets[p.id] = mod.initPyramid(host, (data.widgets?.pyramid ?? null) as never, {
            stageButton: false,
            resetButton: false,
            // The funnel is clickable in its own right, so the picker follows
            // the figure as well as driving it — otherwise the bar goes on
            // naming whatever was chosen before the reader clicked a cell.
            // Only an item can be named there (the picker holds items), so a
            // click further up the tree leaves it alone rather than lying.
            onSelect: (code: string) => {
              const sel = deskRoot.querySelector<HTMLSelectElement>('select[data-ctl="item"]');
              if (!sel || ![...sel.options].some((o) => o.value === code)) return;
              ctrl.item = code;
              sel.value = code;
              // The picker may have been upgraded to a type-ahead, in which
              // case the visible control is an input and not the select the
              // line above just moved.
              comboSync.get('item')?.();
              // The picker is the desk's now, not this panel's: a click in the
              // tree moves the tile, the movers' emphasis and the item's line
              // as surely as typing into the box would. The funnel itself is
              // left out — it has just drawn this very selection.
              readersOf('item').filter((x) => x !== p.id).forEach(renderPanel);
            },
          });
        }
      }
    }

    const legendResets: Record<string, () => void> = {};
    for (const [id, chart] of Object.entries(charts)) {
      legendResets[id] = legendIsolation(chart, () => renderPanel(id));
    }

    // ── a map that is also a picker (PanelSpec.selects) ───────────────────
    // Clicking a region sets a control, and everything on the desk reading
    // that control follows — its own series panel, the scatter's accent. The
    // control keeps its dropdown, so the map is a second way in rather than
    // the only one, and the two stay in step because both write the same
    // control state. The value is the region name the map itself carries,
    // which is why the state control holds regions rather than the spelling
    // MoSPI publishes (see Control.labelField).
    for (const p of spec.panels) {
      if (!p.selects || !charts[p.id]) continue;
      const id = p.selects;
      const c = allControls.find((x) => x.id === id);
      // The modifier is read off the DOM event, not off the ECharts params: a
      // geo click hands back `params.event` only for some series types, and on
      // a map it arrives undefined. A capture-phase listener on the panel runs
      // before ECharts dispatches, and ECharts dispatches synchronously inside
      // the same DOM event, so this flag is always the one for THIS click.
      let additive = false;
      panelEl(p.id)?.addEventListener('click', (ev) => {
        additive = ev.metaKey || ev.ctrlKey || ev.shiftKey;
      }, true);
      charts[p.id].on('click', (e) => {
        const name = e?.name;
        if (!name) return;
        const ms = deskRoot.querySelector<HTMLElement>(`.ms[data-ctl="${id}"]`);
        if (ms && c) {
          // Multi-select: a plain click REPLACES the selection (the common
          // case — look at this state), cmd/ctrl/shift-click adds or removes
          // one, the same grammar a file list uses. Two departures from it,
          // both because a map has no empty space to click on: clicking the
          // one region already picked un-picks it, and the selection can never
          // empty — it falls back to PanelSpec.selectsBase (the national line)
          // where the panel names one, and refuses the removal where it does
          // not, since a panel drawing nothing reads as broken.
          const base = p.selectsBase;
          const boxes = [...ms.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
          if (!boxes.some((b) => b.value === name)) return;
          const hasBase = !!base && boxes.some((b) => b.value === base);
          const cur = Array.isArray(ctrl[id]) ? (ctrl[id] as string[]) : [];
          let next: string[];
          if (additive) {
            next = cur.includes(name) ? cur.filter((v) => v !== name) : [...cur, name];
          } else {
            const others = cur.filter((v) => v !== name && v !== base);
            next = !others.length && cur.includes(name) ? [] : [name];
            // The base stays where it already was, and comes back if a plain
            // click has just emptied everything else.
            if (hasBase && (cur.includes(base!) || !next.length)) next = [base!, ...next];
          }
          if (!next.length) next = hasBase ? [base!] : cur;
          ctrl[id] = next;
          boxes.forEach((b) => { b.checked = next.includes(b.value); });
          updateSummary(ms, c);
        } else {
          if (one(ctrl[id]) === name) return;
          const sel = deskRoot.querySelector<HTMLSelectElement>(`select[data-ctl="${id}"]`);
          if (sel && ![...sel.options].some((o) => o.value === name)) return;
          ctrl[id] = name;
          if (sel) sel.value = name;
        }
        renderAll();
      });
    }

    const renderPanel = (id: string) => {
      const p = spec.panels.find((x) => x.id === id)!;
      if (p.chart === 'stat') {
        const { value, label, delta } = computeStat(p, rows, ctrl);
        const tile = panelEl(id);
        if (tile) {
          const el = tile.querySelector<HTMLElement>('.stat-value')!;
          el.innerHTML = delta ? `${value}<span class="stat-delta">${delta}</span>` : String(value);
          // The tile takes the same hue as the panel that plots it, so the
          // number and its chart are one thing seen twice.
          if (p.accent) el.style.color = accentColor(p.accent, readTokens());
          if (label && label !== p.title) tile.querySelector('.stat-label')!.textContent = label;
        }
      } else if (p.chart === 'widget') {
        // Same contract as an ECharts panel: one call redraws it against the
        // current control state, and the theme observer below drives it too —
        // the widget reads its colours from the same CSS custom properties, so
        // a redraw is all a theme flip needs.
        const w = widgets[p.id];
        if (!w) return;
        // The item picker threads the figure, before the ink/refresh below so
        // one redraw carries both. The desk's division selection does NOT
        // reach here: the funnel is the whole basket by construction, and
        // drawing a subset of it bought nothing — the floors keep their width,
        // so a quarter of the hundred read much like all of it.
        const item = one(ctrl.item);
        if (item) w.select?.(item);
        const ink = one(ctrl.ink);
        if (ink) w.setStage(ink === 'change' ? 1 : 0);
        else w.refresh();
      } else {
        const option = buildPanel(p, rows, ctrl, readTokens(), false);
        // Immediately after the build, before anything else can call it: the
        // slot holds at most one sentence and taking it clears it.
        setDeskFoot(id, takeFoot());
        charts[id].setOption(option, true);
        // wireGlobalBrush, not panel-chrome's activateDragZoom: a drag on any
        // desk's time chart sets the ONE page-global range, not a per-chart zoom.
        if ((option as { dataZoom?: unknown }).dataZoom) wireGlobalBrush(charts[id]);
        // touch only: click-to-open + an explicit close control on the tooltip
        // (notMerge above drops the tooltip merge, so re-apply every render)
        initTouchTooltipClose(charts[id]);
        legendResets[id]?.();
      }
    };
    const renderAll = () => spec.panels.forEach((p) => renderPanel(p.id));
    deskRenderAll[i] = renderAll;

    // ── what a share card says about this desk ────────────────────────────
    // Only the inflation board offers the image items today (see BoardView), but
    // nothing below is inflation-specific: a desk can describe its own panels,
    // so the day a second board wants cards it is a markup change and not a
    // second copy of this.
    //
    // Which controls a card names is read off the panel's ENCODING rather than
    // off the desk's control list. A desk-level picker does not necessarily
    // reach every panel on the desk — the rebase sector toggle reaches one of
    // its three charts and says so in its own footnote — and a card that
    // claimed a switch the chart never saw would be a caption that lies.
    const cardCtlIds = (p: PanelSpec): string[] => {
      const ids: string[] = [];
      const token = (v: unknown) => { if (typeof v === 'string' && v.startsWith('@')) ids.push(v.slice(1)); };
      for (const [k, v] of Object.entries((p.encoding ?? {}) as unknown as Record<string, unknown>)) {
        // 'controlId>rowField' filters a differently-named field; the control is
        // always the half before the arrow.
        if (k === 'filters') for (const f of v as string[]) ids.push(String(f).split('>')[0]);
        else if (k === 'timeRange' || k === 'period') ids.push(String(v));
        else if (Array.isArray(v)) v.forEach(token);
        else token(v);
      }
      for (const c of p.controls ?? []) ids.push(c.id);
      // A derived id is not a control anybody set (see DashboardSpec.derived):
      // name the switch that chose, and the picker it put in charge.
      const expanded = ids.flatMap((id) => {
        const d = spec.derived?.find((x) => x.id === id);
        if (!d) return [id];
        const src = d.cases[one(ctrl[d.from])];
        return src ? [d.from, src] : [d.from];
      });
      // Desk order, then the panel's own bar: the order the reader met them in.
      const wanted = new Set(expanded);
      return allControls.filter((c) => wanted.has(c.id)).map((c) => c.id);
    };

    // What the widget holding a control currently READS, not what the state
    // holds: a card's caption should say what the reader can see on the bar.
    // Falling back to the state through the desk's own label map covers a
    // control a panel answers to without painting one of its own.
    const cardCtlText = (id: string, panelId: string): string => {
      const host = deskRoot.querySelector<HTMLElement>(`[data-ctl="${id}"][data-scope="${panelId}"]`)
        ?? deskRoot.querySelector<HTMLElement>(`[data-ctl="${id}"]`)
        ?? root.querySelector<HTMLElement>(`.page-bar [data-ctl="${id}"]`);
      if (host) {
        if (host.tagName === 'SELECT') {
          const opt = (host as HTMLSelectElement).selectedOptions[0];
          if (opt) return opt.textContent?.trim() ?? '';
        } else if (host.classList.contains('seg')) {
          return host.querySelector('button.active')?.textContent?.trim() ?? '';
        } else if (host.classList.contains('ms')) {
          return host.querySelector('.ms-summary')?.textContent?.trim() ?? '';
        } else if (host.classList.contains('dr')) {
          return host.querySelector('.dr-summary')?.textContent?.trim() ?? '';
        }
      }
      const c = allControls.find((x) => x.id === id);
      if (!c) return '';
      const v = ctrl[id];
      return Array.isArray(v) ? v.map((x) => labelOf(c, x)).join(', ') : labelOf(c, one(v));
    };

    // The citation, cut to a line: the site's own credit rides at the end of
    // every source string and is already in the footer beside it, and anything
    // after the first full stop is a caveat rather than a source.
    const cardSource = (): string => {
      const raw = spec.source ?? '';
      if (!raw) return '';
      const bare = raw.split(' · ')[0];
      const stop = bare.indexOf('. ');
      return (stop > 0 ? bare.slice(0, stop) : bare).trim();
    };

    deskCardInput[i] = (panelId: string): PanelCardInput | null => {
      const p = spec.panels.find((x) => x.id === panelId);
      const el = panelEl(panelId);
      if (!p || !el) return null;
      const context = cardCtlIds(p)
        .map((id) => {
          const label = allControls.find((c) => c.id === id)?.label ?? id;
          const text = cardCtlText(id, panelId);
          return text ? `${label}: ${text}` : '';
        })
        .filter(Boolean)
        .join(' · ');
      // The vintage as the page prints it: on the page bar where every desk
      // agrees, on this desk's own bar where they do not.
      const asOf = (root.querySelector<HTMLElement>('.page-bar .ctl-asof strong')
        ?? deskRoot.querySelector<HTMLElement>('.ctl-asof strong'))?.textContent?.trim() ?? '';
      return {
        chartEl: el,
        deskTitle: deskRoot.querySelector('.desk-title')?.textContent?.trim() ?? '',
        panelTitle: p.title,
        context,
        asOf,
        source: cardSource(),
        // The address bare, and the real path: a card of the inflation board
        // says where the inflation board is.
        url: `timeseriesofindia.com${location.pathname}`.replace(/\/$/, ''),
        filename: `tsoi-${root.dataset.board ?? 'board'}-${deskRoot.id}-${panelId}.png`,
      };
    };

    // ── rows that arrive when they are asked for (DashboardSpec.lazyRows) ──
    // The loader itself is in lazy.ts, where its caching, its stale-response
    // guard and its failure behaviour can be tested without a DOM. All this
    // supplies is the fetching, the shaping and the redraw.
    const lazy = spec.lazyRows;
    const lazyRows = lazy ? createLazyRows({
      lazy,
      baseRows,
      fetchDoc: (url) => fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      shape: (doc) => shapeDataset(lazy.shape, doc).rows,
      onRows: (next) => {
        rows = next;
        // The switches are data-driven, and the data has just changed: a
        // measure or a sector that had nothing to offer while the document was
        // in flight comes alive the moment it lands.
        syncLiveOptions();
        renderAll();
      },
    }) : null;
    // Whether anything on the desk is currently reading the lazy rows. With a
    // derived control in play that is a real question — the state desk opens on
    // its published series and must not fetch an item nobody has asked for —
    // and without one, a desk that declares lazy rows always wants them.
    const lazyNeeded = () => !!lazy && (!spec.derived?.length
      || spec.derived.some((d) => d.cases[one(ctrl[d.from])] === lazy.control));
    const ensureLazy = () => {
      if (!lazy || !lazyRows || !lazyNeeded()) return;
      const v = one(ctrl[lazy.control]);
      // Against what was ASKED for, not what has landed: a control touched
      // twice while the first fetch is still in flight must not start it again.
      if (v === lazyRows.requested) return;
      void lazyRows.load(v);
    };

    // ── controls that dim because another control is in charge ────────────
    // Not `liveOptions`, which disables the options the data cannot answer.
    // This one only dims: the Series picker under Item is not the subject and
    // still narrows the item list, so it has to stay usable while saying it is
    // no longer what the map is drawing.
    const deadCtls = allControls.filter((c) => c.deadWhen);
    const syncDeadWhen = () => {
      for (const c of deadCtls) {
        const dead = one(ctrl[c.deadWhen!.control]) === c.deadWhen!.is;
        const host = deskRoot.querySelector<HTMLElement>(`[data-ctl="${c.id}"]`);
        host?.classList.toggle('ctl-dead', dead);
        host?.closest('.ctl, .panel-ctl-sel')?.classList.toggle('ctl-dead', dead);
      }
    };

    // ── controls that can go dead (Control.liveOptions) ───────────────────
    // A desk can reach data that answers fewer questions than the desk asks:
    // the curated items on the state map are published Combined-only and as a
    // rate only, so the sector switch and the measure switch have nothing to
    // switch to. Disabling them says that; leaving them live and drawing an
    // empty panel does not, and quietly showing the combined figure under a
    // Rural label would be worse than either. What each dead option would have
    // needed is in the desk foot, one tap away.
    //
    // Nothing here knows what a sector or a measure is: the rule names a scope
    // and the data answers. Returns true when it had to move a value, so the
    // caller knows a re-render is owed.
    const liveCtls = allControls.filter((c) => c.liveOptions);
    function syncLiveOptions(): boolean {
      let moved = false;
      for (const c of liveCtls) {
        const live = liveOptionValues(c, rows, ctrl);
        if (!live) continue;
        const opts = c.options ?? [];
        const alive = opts.filter((o) => live.has(o.value));
        const host = deskRoot.querySelector<HTMLElement>(`[data-ctl="${c.id}"]`);
        if (host) {
          const dead = alive.length <= 1;
          host.classList.toggle('ctl-dead', dead);
          host.closest('.ctl, .panel-ctl-sel')?.classList.toggle('ctl-dead', dead);
          for (const o of opts) {
            const btn = host.querySelector<HTMLButtonElement>(`button[data-value="${o.value}"]`);
            if (btn) btn.disabled = !live.has(o.value);
            const opt = host.querySelector<HTMLOptionElement>(`option[value="${o.value}"]`);
            if (opt) opt.disabled = !live.has(o.value);
          }
        }
        if (alive.length && !live.has(one(ctrl[c.id]))) {
          ctrl[c.id] = alive[0].value;
          moved = true;
          host?.querySelectorAll<HTMLButtonElement>('button[data-value]')
            .forEach((b) => b.classList.toggle('active', b.dataset.value === alive[0].value));
          const sel = host as HTMLSelectElement | null;
          if (sel?.tagName === 'SELECT') sel.value = alive[0].value;
        }
      }
      return moved;
    }

    // Which panels read a given control id: the one that declares it, plus any
    // whose encoding filters on it or points at it with an "@id" token (a
    // highlight, a member accent, a top-N). Computed once from the spec.
    const readers = new Map<string, string[]>();
    for (const c of allControls) {
      const ids = spec.panels.filter((p) => {
        if ((p.controls ?? []).some((x) => x.id === c.id)) return true;
        const e = p.encoding as unknown as Record<string, unknown>;
        if ((e.filters as string[] | undefined)?.some((f) => splitFilter(f).ctl === c.id)) return true;
        return Object.values(e).some((v) => (typeof v === 'string' && v === `@${c.id}`)
          || (Array.isArray(v) && v.includes(`@${c.id}`)));
      }).map((p) => p.id);
      readers.set(c.id, ids);
    }
    const readersOf = (id: string) => readers.get(id) ?? [];

    const monthOf = (row: Row) => String(row.date ?? row.month).slice(0, 7);
    const allMonths = [...new Set(rows.map(monthOf))].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
    // Feed this desk's own month domain into the page-level RANGE widget's
    // custom From/To dropdowns (only the desks that actually carry 'range').
    if (RANGE_DESK_IDX.includes(i)) noteDeskMonths(allMonths);
    const rangeSummary = (c: Control, token: string) => {
      const q = (c.quick ?? []).find((o) => o.value === token);
      if (q) return q.value === '0' ? 'All time' : /^\d+$/.test(q.value) ? `Last ${q.label}` : q.label;
      const win = resolveRange(token, allMonths);
      return win ? `${monthLabel(win.from)} – ${monthLabel(win.to)}` : 'All time';
    };
    const syncRange = (el: HTMLElement, c: Control) => {
      const token = one(ctrl[c.id]);
      const win = resolveRange(token, allMonths) ?? { from: allMonths[0], to: allMonths.at(-1)! };
      el.querySelector<HTMLSelectElement>('.dr-from')!.value = win.from;
      el.querySelector<HTMLSelectElement>('.dr-to')!.value = win.to;
      el.querySelector('.dr-summary')!.textContent = rangeSummary(c, token);
      el.querySelectorAll<HTMLElement>('.dr-q').forEach((b) => b.classList.toggle('active', b.dataset.value === token));
    };
    const populateRange = (el: HTMLElement, c: Control) => {
      const opts = allMonths.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join('');
      el.querySelector('.dr-from')!.innerHTML = opts;
      el.querySelector('.dr-to')!.innerHTML = opts;
      syncRange(el, c);
    };

    // ── type-ahead combobox (Control.search) ──────────────────────────────
    // A select of 358 items is a scroll, not a choice. Where a control opts in
    // and its list is long enough to be worth it, the native select is hidden
    // and driven by an input that filters the same options — arrows to move,
    // Enter to take, Escape to back out. The select STAYS in the markup and
    // stays the source of truth, so a reader without JavaScript gets the plain
    // control the server rendered and nothing here is load-bearing.
    let comboSeq = 0;
    function wireCombobox(sel: HTMLSelectElement, c: Control, apply: () => void) {
      if (sel.dataset.combo != null || sel.options.length < SEARCH_THRESHOLD) return;
      sel.dataset.combo = '';
      const listId = `cb-${spec.slug}-${c.id}-${++comboSeq}`;
      const box = withScope(document.createElement('div'));
      box.className = 'cb';
      const input = withScope(document.createElement('input'));
      input.className = 'cb-input';
      input.type = 'text';
      input.autocomplete = 'off';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', listId);
      input.setAttribute('aria-label', c.label);
      input.placeholder = 'Search…';
      const list = withScope(document.createElement('ul'));
      list.className = 'cb-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.hidden = true;
      box.append(input, list);
      sel.after(box);
      sel.hidden = true;

      const options = () => [...sel.options].map((o) => ({ value: o.value, label: o.textContent ?? o.value }));
      const labelFor = (v: string) => options().find((o) => o.value === v)?.label ?? '';
      let shown: { value: string; label: string }[] = [];
      let active = -1;

      const syncText = () => { input.value = labelFor(one(ctrl[c.id])); };
      const close = () => {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        active = -1;
        syncText();
      };
      const paintActive = () => {
        [...list.children].forEach((li, i) => {
          const on = i === active;
          li.classList.toggle('on', on);
          li.setAttribute('aria-selected', String(on));
        });
        if (active >= 0) {
          input.setAttribute('aria-activedescendant', `${listId}-${active}`);
          (list.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
        } else input.removeAttribute('aria-activedescendant');
      };
      const open = (query: string) => {
        shown = filterOptions(options(), query);
        list.innerHTML = '';
        for (const [i, o] of shown.entries()) {
          const li = withScope(document.createElement('li'));
          li.className = 'cb-opt';
          li.id = `${listId}-${i}`;
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', 'false');
          li.dataset.value = o.value;
          li.textContent = o.label;
          list.append(li);
        }
        list.hidden = shown.length === 0;
        input.setAttribute('aria-expanded', String(!list.hidden));
        active = shown.length ? 0 : -1;
        paintActive();
        // After the rows are in: they are what decides how wide the list is,
        // and every keystroke that filters them can change it.
        if (!list.hidden) fitPopover(list);
      };
      const commit = (value: string) => {
        if (!options().some((o) => o.value === value)) return;
        ctrl[c.id] = value;
        sel.value = value;
        close();
        apply();
      };

      comboSync.set(c.id, syncText);
      syncText();

      input.addEventListener('focus', () => { input.select(); open(''); });
      input.addEventListener('input', () => open(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (list.hidden) { open(''); return; }
          const step = e.key === 'ArrowDown' ? 1 : -1;
          active = (active + step + shown.length) % shown.length;
          paintActive();
        } else if (e.key === 'Enter') {
          if (list.hidden || active < 0) return;
          e.preventDefault();
          commit(shown[active].value);
        } else if (e.key === 'Escape') {
          // Always, even with the list already shut: a query that matched
          // nothing closes the list on its own, and Escape then has to be the
          // way back to the item actually selected rather than leaving the
          // reader looking at their own dead search term.
          e.preventDefault();
          close();
        }
      });
      // mousedown, not click: the input's blur fires first on a click and would
      // close the list out from under the pointer.
      list.addEventListener('mousedown', (e) => {
        const li = (e.target as HTMLElement).closest<HTMLElement>('.cb-opt');
        if (!li) return;
        e.preventDefault();
        commit(li.dataset.value!);
      });
      input.addEventListener('blur', () => { setTimeout(close, 0); });
    }

    deskRoot.querySelectorAll<HTMLElement>('[data-ctl]').forEach((el) => {
      const id = el.dataset.ctl!;
      const scope = el.dataset.scope!;
      const apply = () => {
        // Derived values first: everything below — the cascade, the live
        // options, the panels — reads them.
        applyDerived();
        for (const c of fieldControls) {
          if ((c.dependsOn ?? []).some((d) => splitFilter(d).ctl === id)) repopulate(c);
        }
        syncDeadWhen();
        // Kick off a fetch if the desk has just started reading rows it does
        // not have. It renders now with what it has and again when they land.
        ensureLazy();
        // A control that has just gone dead may have had to move its own value
        // (Rural is not on offer for an item), and that reaches every panel
        // reading it — so a forced move upgrades this to a whole-desk redraw.
        const moved = syncLiveOptions();
        // Scope says which panel OWNS a control; what has to redraw is every
        // panel that READS it. The state desk hangs the month on the map's own
        // bar — it is the map's question — but the swarm below filters on the
        // same month and would otherwise keep showing the month before.
        (moved || scope === 'global') ? renderAll() : readersOf(id).forEach(renderPanel);
      };
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', (e) => { ctrl[id] = (e.target as HTMLSelectElement).value; apply(); });
        const c = allControls.find((x) => x.id === id);
        if (c?.search) wireCombobox(el as HTMLSelectElement, c, apply);
      } else if (el.classList.contains('ms')) {
        const c = allControls.find((x) => x.id === id)!;
        const btn = el.querySelector<HTMLButtonElement>('.ms-btn')!;
        const menu = el.querySelector<HTMLElement>('.ms-menu')!;
        const search = el.querySelector<HTMLInputElement>('.ms-search')!;
        const selectAll = el.querySelector<HTMLButtonElement>('.ms-all')!;
        const visibleInputs = () => [...menu.querySelectorAll<HTMLInputElement>('.ms-opt:not([hidden]) input')];
        const clearAll = el.querySelector<HTMLButtonElement>('.ms-clear')!;
        const closeMenu = () => {
          menu.hidden = true;
          search.value = '';
          menu.querySelectorAll<HTMLElement>('.ms-opt').forEach((o) => { o.hidden = false; });
        };
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (menu.hidden) { menu.hidden = false; fitPopover(menu); } else closeMenu();
        });
        document.addEventListener('click', (e) => { if (!el.contains(e.target as Node)) closeMenu(); });
        search.addEventListener('click', (e) => e.stopPropagation());
        search.addEventListener('input', () => {
          const q = search.value.toLowerCase();
          menu.querySelectorAll<HTMLElement>('.ms-opt').forEach((opt) => {
            opt.hidden = q.length > 0 && !opt.textContent!.toLowerCase().includes(q);
          });
          // Narrowing the list can narrow the menu, which may undo a nudge it
          // needed at full width.
          fitPopover(menu);
        });
        selectAll.addEventListener('click', (e) => {
          e.stopPropagation();
          visibleInputs().forEach((inp) => { inp.checked = true; });
          ctrl[id] = [...menu.querySelectorAll<HTMLInputElement>('input:checked')].map((inp) => inp.value);
          updateSummary(el, c);
          apply();
        });
        clearAll.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((inp) => { inp.checked = false; });
          ctrl[id] = [];
          updateSummary(el, c);
          apply();
        });
        menu.addEventListener('change', (e) => {
          const checked = [...menu.querySelectorAll<HTMLInputElement>('input:checked')].map((inp) => inp.value);
          if (checked.length === 0) { (e.target as HTMLInputElement).checked = true; return; }
          ctrl[id] = checked;
          updateSummary(el, c);
          apply();
        });
      } else if (el.classList.contains('dr')) {
        const c = allControls.find((x) => x.id === id)!;
        const btn = el.querySelector<HTMLButtonElement>('.dr-btn')!;
        const menu = el.querySelector<HTMLElement>('.dr-menu')!;
        const from = el.querySelector<HTMLSelectElement>('.dr-from')!;
        const to = el.querySelector<HTMLSelectElement>('.dr-to')!;
        populateRange(el, c);
        // On a board with no page-level range picker, a drag-zoom still routes
        // through setGlobalRange; this is how the desk's own widget hears about it.
        if (id === 'range') deskSyncRange[i] = () => syncRange(el, c);
        const close = () => { menu.hidden = true; };
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.hidden = !menu.hidden;
          if (!menu.hidden) fitPopover(menu);
        });
        document.addEventListener('click', (e) => { if (!el.contains(e.target as Node)) close(); });
        el.querySelectorAll<HTMLButtonElement>('.dr-q').forEach((b) =>
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            ctrl[id] = b.dataset.value!;
            syncRange(el, c);
            close();
            apply();
          }));
        const setCustom = () => { ctrl[id] = `${from.value}~${to.value}`; syncRange(el, c); apply(); };
        from.addEventListener('change', () => { if (from.value > to.value) to.value = from.value; setCustom(); });
        to.addEventListener('change', () => { if (to.value < from.value) from.value = to.value; setCustom(); });
      } else {
        el.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
          b.addEventListener('click', () => {
            ctrl[id] = b.dataset.value!;
            el.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
            b.classList.add('active');
            apply();
          })
        );
      }
    });

    // A value that came in on the link has to be VISIBLE in the widget holding
    // it. The data-driven controls have already repainted themselves — a select
    // and a multiselect through repopulate, a range through populateRange — but
    // a segmented control and a select with a fixed option list are painted
    // once, at build time, and would otherwise go on advertising the default
    // while the charts drew something else. A value the control does not offer
    // hands the state back to the widget, which is the same clamp the data-
    // driven ones apply.
    for (const id of seededIds) {
      const host = deskRoot.querySelector<HTMLElement>(`[data-ctl="${id}"]`);
      if (!host) continue;
      const v = one(ctrl[id]);
      if (host.tagName === 'SELECT') {
        const sel = host as HTMLSelectElement;
        if ([...sel.options].some((o) => o.value === v)) sel.value = v;
        else ctrl[id] = sel.value;
        comboSync.get(id)?.();
      } else if (host.classList.contains('seg')) {
        const btns = [...host.querySelectorAll<HTMLButtonElement>('button')];
        const hit = btns.find((b) => b.dataset.value === v);
        if (hit) {
          btns.forEach((b) => b.classList.remove('active'));
          hit.classList.add('active');
        } else {
          ctrl[id] = btns.find((b) => b.classList.contains('active'))?.dataset.value ?? ctrl[id];
        }
      }
    }
    // The derived values were worked out from the pre-clamp state above; redo
    // them if a clamp moved anything (applyDerived is a plain recompute).
    applyDerived();

    const ro = new ResizeObserver(() => Object.values(charts).forEach((c) => c.resize()));
    spec.panels.forEach((p) => { if (p.chart !== 'stat') ro.observe(panelEl(p.id)!); });

    // Panel maximize (unchanged mechanics from panel-chrome.ts), scoped to
    // this desk's own panels — the desk's filter controls ride into the
    // maximized panel and back out, same UX as the standalone pages.
    const deskControls = deskRoot.querySelector<HTMLElement>('.desk-controls');
    const panelsGrid = deskRoot.querySelector<HTMLElement>('.panels');
    initMaximize({
      panels: Array.from(deskRoot.querySelectorAll<HTMLElement>('.panel')),
      resize: (panel) => {
        const chartId = panel.querySelector<HTMLElement>('.chart')?.dataset.panel;
        if (chartId) charts[chartId]?.resize();
      },
      onOpen: (panel) => { if (deskControls) panel.insertBefore(deskControls, panel.querySelector('.panel-bar')); relocatePageBar(); },
      onClose: () => { if (deskControls && panelsGrid) deskRoot.querySelector('.desk-bar')!.insertBefore(deskControls, deskRoot.querySelector('.desk-filters-btn')); relocatePageBar(); },
    });
    new MutationObserver(renderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-units'] });

    syncDeadWhen();
    ensureLazy();
    syncLiveOptions();
    renderAll();
    document.fonts?.ready.then(renderAll);
  }

  // Only the first desk initializes eagerly; the rest wait until they're
  // about to enter the viewport (roughly a screen's worth of lead time),
  // so scrolling past desk 1 doesn't pay for datasets nobody's seen yet.
  // A desk restored collapsed skips this too — there's nothing to render,
  // so the fetch+ECharts-construction cost is pure waste until the reader
  // actually expands it (see setCollapsed below, which calls initDesk
  // itself at that point — this eager/IO path never gets a second chance).
  if (!collapsed[0]) initDesk(0);
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const i = deskEls.indexOf(entry.target as HTMLElement);
      if (i > 0 && !collapsed[i]) initDesk(i);
    }
  }, { rootMargin: '100% 0px' });
  deskEls.slice(1).forEach((el) => io.observe(el));

  // Mobile "Filters" toggle: collapses/expands this desk's control block.
  // Desk maximize stays visible regardless of viewport.
  deskEls.forEach((el) => {
    const btn = el.querySelector<HTMLButtonElement>('.desk-filters-btn');
    const controls = el.querySelector<HTMLElement>('.desk-controls');
    btn?.addEventListener('click', () => {
      const open = controls!.classList.toggle('mobile-open');
      btn.textContent = open ? 'Hide filters' : 'Filters';
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // Whole-desk maximize: one shared backdrop, at most one desk maximized at
  // a time. History-aware (see panel-chrome.ts's pushOverlay/requestOverlayClose):
  // opening pushes a history entry via the SAME shared stack a panel-level
  // maximize uses, so maximizing a desk THEN a panel inside it pushes two
  // entries, and Back (or Escape, wired once globally by panel-chrome.ts)
  // unwinds the panel first, the desk second — no query-based ordering
  // guard needed here any more, the stack itself enforces the order.
  const backdrop = document.createElement('div');
  backdrop.className = 'tsoi-desk-backdrop';
  backdrop.hidden = true;
  document.body.appendChild(backdrop);
  let currentMax = -1;
  let deskSeq = 0;
  const resizeDesk = (i: number) => { const cs = deskCharts[i]; if (cs) Object.values(cs).forEach((c) => c.resize()); };

  // ── collapse/expand a single desk ─────────────────────────────────────
  // The one function every fold/unfold path funnels through — chevron
  // clicks, collapse-all/expand-all, maximize's force-expand, and anchor
  // navigation (expandAndScrollTo below) all call this instead of poking
  // classList directly, so the DOM class, the aria state and the
  // lazy-init/resize side effects can never drift apart.
  function setCollapsed(i: number, value: boolean, opts: { persist?: boolean } = {}) {
    collapsed[i] = value;
    applyCollapsedDOM(i);
    if (opts.persist ?? true) saveCollapsedAnchors();
    if (!value) {
      // Expanding: initDesk directly, don't wait on the IntersectionObserver
      // — IO only fires on intersection TRANSITIONS, so a desk expanded
      // while already onscreen (or never scrolled to at all) would never
      // re-fire and would stay permanently empty. Fire-and-forget: the
      // dataset fetch must not block the scroll/paint below (see
      // expandAndScrollTo), it just has to have been kicked off.
      (async () => {
        if (!initialized[i]) await initDesk(i);
        // ECharts can't measure inside display:none, so ANY chart laid out
        // or resized while collapsed has stale dimensions — resize on the
        // next frame even when the desk was already initialized before
        // being folded.
        requestAnimationFrame(() => resizeDesk(i));
      })();
    }
    syncPageCollapseBtn();
    // A fold changes every following desk's natural top, so the sticky desk
    // bars must be re-stacked — otherwise the next bar keeps the `top` it was
    // given for the pre-fold layout and sticks off-screen (the desk below
    // appears to vanish). The ResizeObserver on the bars can't catch this: a
    // fold changes the desk BODY's height, not the bar's, so it never fires.
    scheduleRestack();
  }

  // ── page-bar collapse-all (aggregate tri-state) ───────────────────────
  const pageCollapseBtn = root.querySelector<HTMLButtonElement>('.page-collapse-btn');
  function syncPageCollapseBtn() {
    if (!pageCollapseBtn) return;
    const anyExpanded = collapsed.some((c) => !c);
    pageCollapseBtn.setAttribute('aria-expanded', String(anyExpanded));
    pageCollapseBtn.setAttribute('aria-label', anyExpanded ? 'Collapse all desks' : 'Expand all desks');
    pageCollapseBtn.classList.toggle('collapsed', !anyExpanded);
  }
  // Expand-all/collapse-all shifts every desk-bar below the topmost visible
  // one, which would otherwise jump the reader's scroll position around.
  // Find the anchor via its BAR (position:sticky — its rect is the visible
  // "have we scrolled past this desk" signal), but measure the before/after
  // DELTA via the desk SECTION's own rect instead of the bar's: the bar's
  // rect is only meaningful while it's actively pinned, and a big height
  // change (collapsing/expanding five OTHER desks) can push the anchor
  // in or out of its sticky range entirely, so its rect stops moving
  // linearly with the mutation right at the point we most need it to. The
  // section is plain in-flow (nothing about it is sticky), so its rect
  // tracks the actual layout shift with no clamping artifact.
  function withScrollAnchor(mutate: () => void) {
    const barH = pageBarEl?.offsetHeight ?? 0;
    const anchor = deskEls.find((el) => {
      const bar = el.querySelector<HTMLElement>('.desk-bar');
      return !!bar && bar.getBoundingClientRect().bottom > barH;
    });
    const before = anchor?.getBoundingClientRect().top;
    mutate();
    if (anchor && before != null) {
      const after = anchor.getBoundingClientRect().top;
      if (after !== before) window.scrollBy(0, after - before);
    }
  }
  pageCollapseBtn?.addEventListener('click', () => {
    const anyExpanded = collapsed.some((c) => !c);
    withScrollAnchor(() => deskEls.forEach((_, i) => setCollapsed(i, anyExpanded)));
  });

  // The whole desk bar folds the desk — chevron, title or empty space alike —
  // except within a MOAT around anything interactive. A click ON a control
  // belongs to the control; a click within a few pixels of one was aimed at it
  // and missed, and a reader who reaches for a dropdown should not have the
  // desk fold under their hand for being a little off. Everything outside the
  // moat is bar, and bar folds.
  //
  // Measured against live rects rather than declared in the markup, so it stays
  // in step for free: a control added to a desk bar is protected the moment it
  // renders, at whatever size it renders.
  //
  // CAPTURE phase, deliberately: on coarse pointers initInfoTooltips attaches a
  // click handler to every [data-info] element that calls stopPropagation, and
  // the desk title is one — in the bubble phase that swallowed the tap and the
  // bar was dead on touch. Capture runs before it. Stopping propagation here in
  // turn keeps a tap from ALSO opening the title's tooltip while it folds.
  const MOAT = 12; // px of clearance around every control on the bar
  const CONTROLS = '.ctl, .desk-filters-btn, .desk-max, .ctl-asof, .ms, .dr, .seg, select, input, textarea, label, a, button';
  deskEls.forEach((el, i) => {
    const bar = el.querySelector<HTMLElement>('.desk-bar');
    bar?.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      // The fold button itself always folds, whatever the moat says.
      if (!t.closest('.desk-collapse-btn')) {
        if (t.closest(CONTROLS)) return;
        const { clientX: x, clientY: y } = e;
        for (const c of bar.querySelectorAll<HTMLElement>(CONTROLS)) {
          if (c.closest('.desk-collapse-btn')) continue;
          const r = c.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
          const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
          if (Math.hypot(dx, dy) <= MOAT) return; // aimed at that control, missed
        }
      }
      e.stopPropagation();
      setCollapsed(i, !collapsed[i]);
    }, true);
  });
  syncPageCollapseBtn();

  // Direct close — only ever called from the popstate handler (via the
  // callback openDesk registers below), or when switching straight from
  // one maximized desk to another without a Back step in between.
  let preMaxCollapsed = false;
  const doCloseDesk = () => {
    if (currentMax < 0) return;
    const i = currentMax;
    currentMax = -1;
    const el = deskEls[i];
    el.classList.remove('maximized');
    relocatePageBar();
    backdrop.hidden = true;
    const btn = el.querySelector<HTMLButtonElement>('.desk-max')!;
    btn.textContent = '⤢';
    btn.setAttribute('aria-label', `Maximize ${el.querySelector('.desk-title')?.textContent ?? ''} desk`);
    // Maximize only BORROWED the expanded state to avoid opening on an
    // empty overlay (see openDesk) — put the fold back exactly as the
    // reader left it, without writing that transient borrow to storage.
    if (preMaxCollapsed) setCollapsed(i, true, { persist: false });
    // Back in normal flow: the maximized-branch shortcut in restackDeskBars
    // no longer applies, so recompute now rather than waiting on a stray
    // scroll/resize to happen to fire first.
    scheduleRestack();
    requestAnimationFrame(() => resizeDesk(i));
  };
  const openDesk = (i: number) => {
    if (currentMax === i) return;
    if (currentMax >= 0) doCloseDesk();
    currentMax = i;
    // A collapsed desk has no rendered charts to show — maximizing it
    // as-is would open an empty overlay. Force it open first (without
    // persisting: this is maximize borrowing the expanded state, not the
    // reader choosing to unfold it — doCloseDesk restores the fold above).
    preMaxCollapsed = collapsed[i];
    if (preMaxCollapsed) setCollapsed(i, false, { persist: false });
    const el = deskEls[i];
    el.classList.add('maximized');
    relocatePageBar();
    backdrop.hidden = false;
    const btn = el.querySelector<HTMLButtonElement>('.desk-max')!;
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Close');
    pushOverlay(`desk-${i}-${++deskSeq}`, doCloseDesk);
    // Without this, the bar keeps whatever `top` it last had in the normal
    // page flow — reasonable there, meaningless once reinterpreted inside
    // the overlay's own (mostly empty) scroll box. See restackDeskBars.
    scheduleRestack();
    (async () => {
      if (!initialized[i]) await initDesk(i);
      requestAnimationFrame(() => resizeDesk(i));
    })();
  };
  const closeDesk = () => { if (currentMax >= 0) requestOverlayClose(); };
  backdrop.addEventListener('click', closeDesk);
  deskEls.forEach((el, i) => {
    el.querySelector<HTMLButtonElement>('.desk-max')!.addEventListener('click', () => {
      currentMax === i ? closeDesk() : openDesk(i);
    });
  });

  initInfoTooltips(root);

  // ── the state a shared link carries out ──────────────────────────────
  // Written at share-click time and never before: a board is six desks, and a
  // reader working through them would otherwise have the address bar rewritten
  // under every flip of every control. (RTM keeps its debounced replaceState —
  // it is a single instrument with three fields.)
  const shareControlsOf = (s: DashboardSpec): ShareControl[] =>
    [...(s.globals ?? []), ...s.panels.flatMap((p) => p.controls ?? [])];
  const hoistedShareControls: ShareControl[] = [...hoistedIds].map((id) => ({
    id,
    default: id === 'range'
      ? ((rangeCtl?.default as string) ?? '24')
      : (specs.flatMap((s) => s.globals ?? []).find((c) => c.id === id)?.default ?? ''),
  }));

  /**
   * The link for the board as it stands, optionally landing on one panel. The
   * WHOLE board serializes either way — a panel link is a board link that opens
   * scrolled, so the recipient sees the desk around it exactly as the sender
   * left it rather than one chart out of context.
   */
  function shareUrl(ref?: { anchor: string; panel?: string | null }): string {
    const query = serializeShare({
      hoisted: {
        controls: hoistedShareControls,
        ctrl: hoistedIds.has('range') ? { ...pageCtrlState, range: globalRangeToken } : { ...pageCtrlState },
      },
      // A desk that has not initialized holds its own defaults by definition
      // and would serialize to nothing, so it is left out rather than guessed at.
      desks: deskEls.flatMap((el, i) => {
        const ctrl = deskCtrl[i];
        return ctrl ? [{ anchor: el.id, controls: shareControlsOf(specs[i]), ctrl }] : [];
      }),
    });
    const fragment = ref ? `#${ref.anchor}${ref.panel ? `.${ref.panel}` : ''}` : '';
    return location.origin + location.pathname + query + fragment;
  }

  const boardTitle = () => root.querySelector('.page-title')?.textContent?.trim() || document.title;

  // Every share popover on this board — the page bar's and one per chart panel
  // — runs the same two items off the same live state.
  for (const host of root.querySelectorAll<HTMLElement>('.share[data-share-scope]')) {
    const menu = wireShareMenu(host);
    const panelId = host.dataset.sharePanel;
    const anchor = host.closest<HTMLElement>('.desk')?.id;
    const ref = () => (host.dataset.shareScope === 'panel' && anchor && panelId
      ? { anchor, panel: panelId }
      : undefined);

    const copyBtn = host.querySelector<HTMLButtonElement>('[data-share-action="copy"]');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl(ref()));
        // The menu stays open: the item is where the reader is looking, and it
        // is the item that says the link is on the clipboard.
        flashLabel(copyBtn, 'Link copied', 1600);
      } catch (err) {
        console.error('[board] the link could not be copied', err);
      }
    });

    // The system sheet, where there is one. Removed outright otherwise, rather
    // than offered greyed out: a menu of two where one can never be taken is a
    // menu of one with an apology in it.
    const nativeBtn = host.querySelector<HTMLButtonElement>('[data-share-action="native"]');
    if (nativeBtn) {
      if (typeof navigator.share !== 'function') nativeBtn.remove();
      else {
        nativeBtn.hidden = false;
        nativeBtn.addEventListener('click', async () => {
          try {
            await navigator.share({ title: boardTitle(), url: shareUrl(ref()) });
          } catch (err) {
            // A reader who dismisses the sheet has not hit an error.
            if ((err as { name?: string })?.name !== 'AbortError') {
              console.error('[board] the link could not be shared', err);
            }
          } finally {
            menu.open(false);
          }
        });
      }
    }

    // ── the panel's picture ───────────────────────────────────────────────
    // Rendered only where BoardView built the items (the inflation board's
    // ECharts panels — see `cardable` there), so nothing below has to know
    // which board it is on.
    const cardShareBtn = host.querySelector<HTMLButtonElement>('[data-share-action="card-share"]');
    const cardDownBtn = host.querySelector<HTMLButtonElement>('[data-share-action="card-download"]');
    if (cardShareBtn || cardDownBtn) {
      const deskIdx = deskEls.indexOf(host.closest<HTMLElement>('.desk')!);

      /** The card's ingredients for this panel as it stands, read at click. */
      const cardInput = async (): Promise<PanelCardInput> => {
        // A desk can be expanded and still uninitialized — the lazy observer
        // gives a desk a screen's warning and a reader can reach its share
        // button first. Initializing here is what a card of an empty panel
        // costs, and initDesk is idempotent.
        if (deskIdx >= 0 && !initialized[deskIdx]) await initDesk(deskIdx);
        const input = deskIdx >= 0 && panelId ? deskCardInput[deskIdx](panelId) : null;
        if (!input) throw new Error(`[board] no panel named '${panelId}' to draw a card of`);
        return input;
      };

      /** Run an item that has to draw the card, with its label held open. */
      const drawing = async (btn: HTMLButtonElement, run: (i: PanelCardInput) => Promise<void>) => {
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Drawing…';
        try {
          await run(await cardInput());
        } catch (err) {
          // A reader who dismisses the system sheet has not hit an error.
          if ((err as { name?: string })?.name !== 'AbortError') {
            console.error('[board] the panel card could not be drawn', err);
          }
        } finally {
          btn.textContent = label;
          btn.disabled = false;
          menu.open(false);
        }
      };

      if (cardShareBtn) {
        // Same rule as 'Share…' above: revealed where the platform can take a
        // file, removed where it cannot, never offered greyed.
        if (!canShareFilesProbe()) cardShareBtn.remove();
        else {
          cardShareBtn.hidden = false;
          cardShareBtn.addEventListener('click', () => drawing(cardShareBtn, async (input) => {
            const blob = await composePanelCard(input);
            const file = new File([blob], input.filename, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: `${input.deskTitle} · ${input.panelTitle}`,
              text: input.context,
              url: shareUrl(ref()),
            });
          }));
        }
      }

      cardDownBtn?.addEventListener('click', () => drawing(cardDownBtn, async (input) => {
        await downloadPanelCard(input);
      }));
    }
  }

  // ── anchor navigation: force-expand + scroll ──────────────────────────
  // Collapse state must never enter the URL or history (the maximize block
  // above is the only thing here allowed to push history), so this
  // deliberately does NOT call pushState — the jump-nav wiring below owns
  // that.
  function expandAndScrollTo(anchor: string, opts: { smooth?: boolean; panel?: string | null } = {}) {
    const i = deskEls.findIndex((el) => el.id === anchor);
    if (i < 0) return;
    // Expand SYNCHRONOUSLY first (setCollapsed's class toggle is instant;
    // only the dataset fetch inside it is async and deliberately not
    // awaited here) — scrolling before the fold releases would measure the
    // pre-expand document height and land short. This also makes the
    // desk's expanded state the new persisted default, per spec: a reader
    // who followed a link to it shouldn't find it re-collapsed later.
    if (collapsed[i]) setCollapsed(i, false);
    // `#anchor.panelId` lands on one panel of the desk (a shared panel link);
    // a panel the desk no longer has falls back to the desk itself, which is
    // what makes a stale link degrade rather than break. The offset is
    // MEASURED, not declared: two sticky bars sit over the target and only one
    // of them (the page bar) has a scroll-margin token behind it.
    const target = opts.panel
      ? deskEls[i].querySelector<HTMLElement>(`[data-panel="${CSS.escape(opts.panel)}"]`)?.closest<HTMLElement>('.panel')
      : null;
    const behavior: ScrollBehavior = opts.smooth ? 'smooth' : 'auto';
    requestAnimationFrame(() => {
      if (!target) {
        deskEls[i].scrollIntoView({ behavior, block: 'start' });
        return;
      }
      const bars = (pageBarEl?.offsetHeight ?? 0) + (deskBars[i]?.offsetHeight ?? 0);
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - bars - 8, behavior });
    });
  }

  // ── the board's own jump nav ──────────────────────────────────────────
  // Eased scroll instead of the browser's instant hash jump, to the same
  // destination (.desk's scroll-margin-top keeps the sticky bar clear of the
  // desk title). The hash still goes through pushState, so the links stay
  // shareable and bookmarkable.
  root.querySelectorAll<HTMLAnchorElement>('.jump a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')!.slice(1);
      if (!deskEls.some((el) => el.id === id)) return;
      e.preventDefault();
      history.pushState(null, '', `#${id}`);
      lastAnchorHash = location.hash;
      expandAndScrollTo(id, { smooth: true });
    });
  });

  const handle: BoardHandle = { root, anchors: deskEls.map((el) => el.id), expandAndScrollTo };
  boards.push(handle);
  return handle;
}

// ── page-level hash navigation, wired once for every board ────────────────
// Three entry points beyond a jump-nav click need the same "force-expand, then
// scroll" treatment: the page's OWN initial hash on load (the browser's native
// jump lands at the wrong offset once a desk can restore folded), hashchange
// (a hash typed or pasted into the address bar), and popstate (Back/Forward).
let lastAnchorHash = typeof location === 'undefined' ? '' : location.hash;

// hashchange and popstate want the same reaction, but must ignore firings
// where the hash did not actually change — panel-chrome's shared overlay stack
// pushes its OWN history entries with an unchanged URL (see pushOverlay's empty
// second history.pushState argument), so closing a maximized desk or panel via
// Back also fires 'popstate' here. Comparing against the hash we last acted on,
// rather than inspecting that other handler's private state, is what keeps the
// two from fighting: an overlay-close popstate leaves location.hash untouched
// and is a no-op below, while a real anchor navigation always changes it.
function onHashNav() {
  if (location.hash === lastAnchorHash) return;
  lastAnchorHash = location.hash;
  if (!location.hash) return;
  const { anchor, panel } = splitHash(location.hash);
  expandAndScrollTo(anchor, { smooth: true, panel });
}

let hashNavWired = false;

/** Wire every board in `scope`. Boards already wired are skipped. */
export function initBoards(scope: ParentNode = document): BoardHandle[] {
  const out: BoardHandle[] = [];
  for (const el of scope.querySelectorAll<HTMLElement>('.board')) {
    if (boards.some((b) => b.root === el)) continue;
    const h = initBoard(el);
    if (h) out.push(h);
  }
  if (!hashNavWired && boards.length) {
    hashNavWired = true;
    window.addEventListener('hashchange', onHashNav);
    window.addEventListener('popstate', onHashNav);
    // Landing on a hash: applied instantly, not smoothly — this is first paint
    // settling, not a gesture reacting to something already on screen.
    if (location.hash) {
      const { anchor, panel } = splitHash(location.hash);
      expandAndScrollTo(anchor, { smooth: false, panel });
    }
  }
  return out;
}

/**
 * Force-expand the desk with this anchor on whichever board owns it, then
 * scroll to it — or, with `panel`, to that panel on it. A page's jump nav calls
 * this instead of scrolling itself: expanding changes the document height, so
 * scrolling first would land short. Deliberately does NOT push history — the
 * caller owns the URL.
 */
export function expandAndScrollTo(anchor: string, opts: { smooth?: boolean; panel?: string | null } = {}): boolean {
  const board = boards.find((b) => b.anchors.includes(anchor));
  if (!board) return false;
  board.expandAndScrollTo(anchor, opts);
  return true;
}
