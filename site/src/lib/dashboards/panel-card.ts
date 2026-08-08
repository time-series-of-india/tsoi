// A board panel's share card: the chart the reader is looking at, composited
// onto a 1200×630 PNG with enough around it to survive being posted somewhere
// nobody has seen the board.
//
// This generalizes lib/rtm-card.ts rather than importing it: the Rupee Time
// Machine hands over a headline sentence and an option it built itself, while a
// board panel hands over a LIVE ECharts instance whose option was built for a
// panel-sized box and has to be talked out of its interactive furniture first.
// The conventions are the same and deliberately so — 1200×630, an offscreen
// instance at twice the pixel ratio, every colour read off :root at compose
// time so a dark-site reader gets a dark card, composition split from delivery
// so the download and the share sheet cannot disagree about what they sent.
//
// What the card must NOT do is re-derive the chart. A card built from the spec
// and the control state would be a second implementation of the board, free to
// drift from it; this one clones the option off the instance on screen, so what
// the reader sends is what the reader saw.
import * as echarts from 'echarts';

const W = 1200;
const H = 630;
const PAD = 64;
/** The plot's width on the card; the height is whatever the header leaves. */
const CHART_W = W - PAD * 2;
/** Below this the chart is too short to be worth a card. */
const MIN_CHART_H = 220;

export interface PanelCardInput {
  /** The live `.chart` element — the ECharts instance is read off it. */
  chartEl: HTMLElement;
  /** The desk this panel sits on, e.g. 'State by state'. */
  deskTitle: string;
  /** The panel's own title. */
  panelTitle: string;
  /**
   * The live control values shaping the view, already in human labels — e.g.
   * 'Series: CPI (General) · Sector: Rural · Month: June 2026'. Empty where a
   * panel answers to nothing.
   */
  context: string;
  /** The dataset's vintage as the page bar prints it, e.g. 'June 2026'. */
  asOf: string;
  /** One line of provenance, already shortened. */
  source: string;
  /** The board's address, printed bare: no scheme, no query. */
  url: string;
  /** Downloaded filename, with its extension. */
  filename: string;
}

interface CardTokens {
  bg: string; ink: string; subtle: string; line: string; saffron: string;
  headlineFont: string; bodyFont: string; monoFont: string;
}

function cardTokens(): CardTokens {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    bg: v('--tsoi-color-background'),
    ink: v('--tsoi-color-on-surface'),
    subtle: v('--tsoi-color-on-surface-variant'),
    line: v('--tsoi-color-outline'),
    saffron: v('--tsoi-color-primary-text'),
    headlineFont: v('--tsoi-font-headline'),
    bodyFont: v('--tsoi-font-body'),
    monoFont: v('--tsoi-font-mono'),
  };
}

/** How many rows a legend of these names needs, at this font and this width. */
function legendRows(names: string[], font: string, width: number): number {
  const m = document.createElement('canvas').getContext('2d');
  if (!m || !names.length) return 1;
  m.font = font;
  // ECharts' own defaults: a 25px swatch, 5px to its label, 10px between items.
  let rows = 1;
  let used = 0;
  for (const n of names) {
    const w = 30 + m.measureText(n).width;
    if (used && used + 10 + w > width) { rows++; used = w; } else used += (used ? 10 : 0) + w;
  }
  return rows;
}

/**
 * The live option with its interactive-only furniture removed.
 *
 * A board's time charts carry a dataZoom slider, and the drag-to-zoom brush
 * brings a (hidden) toolbox with it. None of the three mean anything in a PNG,
 * and the slider is worse than meaningless: the grid reserved 60px of bottom
 * margin for it, so leaving the reservation without the slider prints a band of
 * empty paper under the plot. Taking the slider away therefore takes its margin
 * with it.
 *
 * A horizontal SCROLL legend is the same kind of thing: on a panel it is a
 * control, a pager the reader clicks through to find the fifth series. On a card
 * there is nothing to click, so page two simply never exists and a line on the
 * chart goes unnamed. It is turned back into a plain legend that wraps, and the
 * plot is pushed down by the rows that wrapping adds.
 *
 * The copy is shallow on purpose. `getOption()` hands back an option whose
 * axis and tooltip formatters are FUNCTIONS, so a structured clone throws and a
 * JSON round-trip silently drops them — and an axis that has lost its formatter
 * prints raw numbers where the panel printed units. Nothing below the top level
 * is written to; the offscreen instance only ever reads it.
 */
function cardOption(inst: echarts.ECharts, width: number): Record<string, unknown> {
  const live = inst.getOption() as Record<string, unknown>;
  const option: Record<string, unknown> = { ...live };
  const hadZoom = Array.isArray(option.dataZoom) ? option.dataZoom.length > 0 : !!option.dataZoom;
  delete option.dataZoom;
  delete option.toolbox;
  delete option.brush;

  const seriesNames = ((option.series ?? []) as { name?: string }[])
    .map((s) => s.name).filter((n): n is string => !!n);
  const legends = (Array.isArray(option.legend) ? option.legend : option.legend ? [option.legend] : []) as Record<string, unknown>[];
  let extraRows = 0;
  if (legends.length) {
    option.legend = legends.map((l) => {
      if (l.type !== 'scroll' || l.orient === 'vertical') return l;
      const data = l.data as (string | { name?: string })[] | undefined;
      const names = data?.map((d) => (typeof d === 'string' ? d : d.name ?? '')).filter(Boolean) ?? seriesNames;
      const ts = (l.textStyle ?? {}) as { fontSize?: number; fontFamily?: string };
      extraRows = Math.max(extraRows, legendRows(names, `${ts.fontSize ?? 12}px ${ts.fontFamily ?? 'sans-serif'}`, width - 24) - 1);
      return { ...l, type: 'plain' };
    });
  }

  if ((hadZoom || extraRows) && option.grid) {
    const grids = (Array.isArray(option.grid) ? option.grid : [option.grid]) as Record<string, unknown>[];
    option.grid = grids.map((g) => {
      const next = { ...g };
      if (hadZoom && typeof g.bottom === 'number') next.bottom = Math.max(24, g.bottom - 32);
      if (extraRows && typeof g.top === 'number') next.top = g.top + extraRows * 20;
      return next;
    });
  }
  option.animation = false;
  return option;
}

/**
 * Redraw one panel's option offscreen at the card's size and hand back the
 * raster.
 *
 * The instance needs a laid-out element, so the host is attached to the
 * document — off to the left where nothing can reflow around it — and removed
 * in a `finally`, so a broken option cannot leave a 1072px ghost in the page.
 * A choropleth works here because `echarts.registerMap` is global: the client
 * registered 'india' when the states desk initialized, and this instance can
 * see it.
 */
async function chartImage(option: unknown, width: number, height: number): Promise<HTMLImageElement> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;height:${height}px;`;
  document.body.appendChild(host);
  try {
    const inst = echarts.init(host, undefined, { renderer: 'canvas', width, height });
    inst.setOption(option as unknown as echarts.EChartsOption, true);
    const url = inst.getDataURL({ pixelRatio: 2, backgroundColor: 'transparent' });
    inst.dispose();
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('the panel card could not rasterize its chart'));
      img.src = url;
    });
    return img;
  } finally {
    host.remove();
  }
}

/** Greedy wrap over coloured segments, at the font already set on the context. */
function wrap(ctx: CanvasRenderingContext2D, words: { text: string; color: string }[], max: number) {
  const lines: { text: string; color: string }[][] = [[]];
  let width = 0;
  const space = ctx.measureText(' ').width;
  for (const w of words) {
    const ww = ctx.measureText(w.text).width;
    const line = lines[lines.length - 1];
    if (line.length && width + space + ww > max) {
      lines.push([w]);
      width = ww;
    } else {
      if (line.length) width += space;
      width += ww;
      line.push(w);
    }
  }
  return lines;
}

function drawLine(ctx: CanvasRenderingContext2D, line: { text: string; color: string }[], x: number, y: number) {
  const space = ctx.measureText(' ').width;
  let cursor = x;
  for (const w of line) {
    ctx.fillStyle = w.color;
    ctx.fillText(w.text, cursor, y);
    cursor += ctx.measureText(w.text).width + space;
  }
}

/** Cut a line to the width it has, with an ellipsis where it had to be cut. */
function clip(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + '…').width > max) cut = cut.slice(0, -1);
  return cut.replace(/[\s·,]+$/, '') + '…';
}

/**
 * Compose the card and return it as a PNG blob, delivering it nowhere.
 *
 * Throws where the panel has no chart to put on a card. A stat tile is the case
 * that matters: it is a number on the desk's strip with no ECharts instance
 * behind it and no panel bar to hang a share button on, so reaching here with
 * one is a wiring mistake and says so rather than producing a card with a hole
 * in it.
 */
export async function composePanelCard(input: PanelCardInput): Promise<Blob> {
  const kind = input.chartEl.dataset.chart ?? '';
  if (kind === 'stat') {
    throw new Error(`[panel-card] '${input.panelTitle}' is a stat tile, not a chart: there is no figure to put on a card`);
  }
  const inst = echarts.getInstanceByDom(input.chartEl);
  if (!inst) {
    throw new Error(
      kind === 'widget'
        ? `[panel-card] '${input.panelTitle}' is a widget panel, drawn as HTML rather than by ECharts: it has no option to compose from`
        : `[panel-card] '${input.panelTitle}' has no live chart on it yet: nothing to compose`,
    );
  }

  await document.fonts?.ready;
  const t = cardTokens();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // The format motif: one thin saffron rule across the top, the same mark every
  // other card on the site wears.
  ctx.fillStyle = t.saffron;
  ctx.fillRect(0, 0, W, 4);

  // Wordmark, in byline type: letterspaced mono, the way the site sets it.
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `500 15px ${t.monoFont}`;
  const spacing = (v: string) => {
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = v;
  };
  spacing('0.22em');
  ctx.fillStyle = t.subtle;
  ctx.fillText('TIME SERIES OF INDIA', PAD, 66);
  spacing('0px');

  // Where it comes from, then what it is: the desk names the beat and recedes,
  // the panel title is the sentence.
  ctx.font = `700 30px ${t.headlineFont}`;
  const titleWords = [
    ...input.deskTitle.split(' ').map((text) => ({ text, color: t.subtle })),
    { text: '·', color: t.subtle },
    ...input.panelTitle.split(' ').map((text) => ({ text, color: t.ink })),
  ];
  const titleLines = wrap(ctx, titleWords, W - PAD * 2).slice(0, 2);
  let y = 116;
  for (const line of titleLines) {
    drawLine(ctx, line, PAD, y);
    y += 38;
  }
  y -= 38;

  // What the reader had the board set to. Without it a card of the state map is
  // a map of some month, some sector and some series nobody can name.
  if (input.context) {
    ctx.font = `400 18px ${t.bodyFont}`;
    ctx.fillStyle = t.subtle;
    y += 30;
    ctx.fillText(clip(ctx, input.context, W - PAD * 2), PAD, y);
  }

  // The footer's hairline is fixed, so the chart takes whatever the header left
  // and is drawn at exactly that size rather than scaled into it — a chart
  // squeezed by a drawImage would have text at the wrong aspect.
  const RULE_Y = H - 88;
  const chartTop = y + 14;
  const chartH = RULE_Y - 18 - chartTop;
  if (chartH < MIN_CHART_H) {
    throw new Error(`[panel-card] '${input.panelTitle}' left only ${chartH}px for its chart: the heading is too long for a card`);
  }
  // A map is as tall as its box and no wider than India is wide, so a full-bleed
  // box would strand the ramp at the far left of the card with 300px of paper
  // between it and the country. Drawn in a box of the panel's own proportions
  // instead, centred: the same figure the reader has, not a stretched one.
  const drawW = kind === 'choropleth' ? Math.min(CHART_W, Math.round(chartH * 1.7)) : CHART_W;
  const chart = await chartImage(cardOption(inst, drawW), drawW, chartH);
  ctx.drawImage(chart, PAD + (CHART_W - drawW) / 2, chartTop, drawW, chartH);

  // Footer: the provenance on its own line, then the address and the vintage.
  ctx.fillStyle = t.line;
  ctx.fillRect(PAD, RULE_Y, W - PAD * 2, 1);
  ctx.font = `400 15px ${t.bodyFont}`;
  ctx.fillStyle = t.subtle;
  ctx.fillText(clip(ctx, input.source, W - PAD * 2), PAD, RULE_Y + 28);

  ctx.font = `400 16px ${t.monoFont}`;
  const asOf = input.asOf ? `As of ${input.asOf}` : '';
  ctx.textAlign = 'right';
  const asOfW = asOf ? ctx.measureText(asOf).width : 0;
  if (asOf) ctx.fillText(asOf, W - PAD, RULE_Y + 56);
  ctx.textAlign = 'left';
  ctx.fillText(clip(ctx, input.url, W - PAD * 2 - asOfW - 24), PAD, RULE_Y + 56);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('the panel card produced no image'))), 'image/png');
  });
}

/**
 * Compose the card and hand it to the browser as a download.
 *
 * Returns the blob as well, so a caller that wants to do something else with it
 * — a share sheet, a test — does not have to draw it twice.
 */
export async function downloadPanelCard(input: PanelCardInput): Promise<Blob> {
  const blob = await composePanelCard(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = input.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Given back a tick later: revoking synchronously races the click in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return blob;
}
