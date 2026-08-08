// The Rupee Time Machine's share card: the current answer composited onto a
// 1200×630 PNG the reader can download and post.
//
// Kept in its own module, and deliberately generic about what it is handed —
// a headline sentence, a supporting line, an ECharts option and a filename —
// because this is the warm-up for share/embed v1. When a second surface wants
// a card, it should be able to call this rather than copy it.
//
// Everything is drawn in the CURRENT theme's tokens, read off :root at draw
// time: a reader on the dark site who downloads a light card has been handed
// somebody else's page. Fonts are waited for before the first measureText,
// because a card composed against the fallback stack wraps in the wrong place
// and there is no second chance to redraw a downloaded file.
import * as echarts from 'echarts';

const W = 1200;
const H = 630;
const PAD = 64;
const CHART_W = 1100;
const CHART_H = 260;

export interface ShareCardInput {
  /** The headline sentence. Its second ₹ figure is set in saffron. */
  headline: string;
  /** The line under it, in body type. */
  sub: string;
  /** Right-hand footer text, e.g. "MoSPI · Labour Bureau · through June 2026". */
  footer: string;
  /** Downloaded filename, with its extension. */
  filename: string;
  /** Rendered offscreen at 1100×260 and drawn into the card. */
  chartOption: unknown;
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

/**
 * Render an ECharts option to a transparent PNG data URL at twice the pixel
 * ratio, without ever showing it.
 *
 * The instance needs a laid-out element, so the host is attached to the
 * document rather than left detached — off to the left where nothing can
 * reflow around it — and removed in a `finally`, so a broken option cannot
 * leave a 1100px ghost in the page.
 */
async function chartImage(option: unknown): Promise<HTMLImageElement> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-9999px;top:0;width:${CHART_W}px;height:${CHART_H}px;`;
  document.body.appendChild(host);
  try {
    const inst = echarts.init(host, undefined, { renderer: 'canvas', width: CHART_W, height: CHART_H });
    inst.setOption({ ...(option as object), animation: false });
    const url = inst.getDataURL({ pixelRatio: 2, backgroundColor: 'transparent' });
    inst.dispose();
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('the share card could not rasterize its chart'));
      img.src = url;
    });
    return img;
  } finally {
    host.remove();
  }
}

/** Split a sentence into words tagged with the colour they are drawn in. The
 *  SECOND ₹ figure is the answer, and it is the one that takes saffron. */
function colourWords(sentence: string, t: CardTokens): { text: string; color: string }[] {
  let seen = 0;
  return sentence.split(' ').map((text) => {
    const isFig = text.startsWith('₹');
    if (isFig) seen++;
    return { text, color: isFig && seen === 2 ? t.saffron : t.ink };
  });
}

/** Greedy wrap over coloured words, at the font already set on the context. */
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

/**
 * Compose the card and return it as a PNG blob, delivering it nowhere.
 *
 * Composition is split from delivery because the same pixels now have two
 * destinations — a download and the system share sheet — and a card that is
 * drawn twice to be sent two ways is a card that can disagree with itself.
 * This is the seam share/embed v1 will build on, so it stays page-agnostic:
 * everything it knows about the answer arrives in `input`.
 */
export async function composeShareCard(input: ShareCardInput): Promise<Blob> {
  await document.fonts?.ready;
  const t = cardTokens();
  const chart = await chartImage(input.chartOption);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // The format motif: one thin saffron rule across the top, the same mark the
  // page's own card wears.
  ctx.fillStyle = t.saffron;
  ctx.fillRect(0, 0, W, 4);

  // Wordmark, in byline type: letterspaced mono, the way the site sets it.
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 15px ${t.monoFont}`;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.22em';
  ctx.fillStyle = t.subtle;
  ctx.fillText('TIME SERIES OF INDIA', PAD, 68);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  // The answer, large.
  ctx.font = `700 42px ${t.headlineFont}`;
  const lines = wrap(ctx, colourWords(input.headline, t), W - PAD * 2);
  let y = 140;
  for (const line of lines) {
    drawLine(ctx, line, PAD, y);
    y += 54;
  }

  ctx.font = `400 22px ${t.bodyFont}`;
  ctx.fillStyle = t.subtle;
  ctx.fillText(input.sub, PAD, y + 4);

  // The chart sits under whatever the sentence needed, never on top of it.
  const chartTop = Math.max(y + 34, H - 100 - CHART_H);
  ctx.drawImage(chart, (W - CHART_W) / 2, chartTop, CHART_W, CHART_H);

  // Footer: the site on the left, the provenance on the right, over a hairline.
  ctx.fillStyle = t.line;
  ctx.fillRect(PAD, H - 76, W - PAD * 2, 1);
  ctx.font = `400 16px ${t.monoFont}`;
  ctx.fillStyle = t.subtle;
  ctx.textAlign = 'left';
  ctx.fillText('timeseriesofindia.in', PAD, H - 44);
  ctx.textAlign = 'right';
  ctx.fillText(input.footer, W - PAD, H - 44);
  ctx.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('the share card produced no image'))), 'image/png');
  });
}

/**
 * Compose the card and hand it to the browser as a download.
 *
 * Returns the blob as well, so a caller that wants to do something else with
 * it — a clipboard write, a test — does not have to draw it twice.
 */
export async function downloadShareCard(input: ShareCardInput): Promise<Blob> {
  const blob = await composeShareCard(input);
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
