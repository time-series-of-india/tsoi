// Prose number formatting in the reader's chosen unit system. Unlike the chart
// runtime (which works from crore / lakh-crore base fields), prose figures are
// few and are tagged with their ABSOLUTE base — a rupee amount (`data-inr`) or a
// transaction count (`data-count`) — so both the Indian and international
// wordings are derived here, never hand-written twice.
//
// Markup contract: <span class="num" data-inr="6600000" data-style="word">…</span>
//   data-inr   — absolute rupees
//   data-count — absolute transaction count
//   data-style — "word" (crore / billion, for running prose) or
//                "abbr" (Cr / bn, for metric callouts); defaults to "word".
// The authored textContent is the Indian form, used as a no-JS fallback.

const grp = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d });
const dec = (n: number) => (n >= 100 ? 0 : n >= 10 ? 1 : 2);

export function fmtInrProse(abs: number, intl: boolean, style: 'word' | 'abbr' = 'word'): string {
  const w = style === 'word';
  if (intl) {
    if (abs >= 1e12) { const v = abs / 1e12; return '₹' + grp(v, dec(v)) + (w ? ' trillion' : ' tn'); }
    if (abs >= 1e9) { const v = abs / 1e9; return '₹' + grp(v, dec(v)) + (w ? ' billion' : ' bn'); }
    if (abs >= 1e6) { const v = abs / 1e6; return '₹' + grp(v, dec(v)) + (w ? ' million' : ' mn'); }
    return '₹' + grp(abs);
  }
  if (abs >= 1e12) { const v = abs / 1e12; return '₹' + grp(v, dec(v)) + (w ? ' lakh crore' : ' Lakh Cr'); }
  if (abs >= 1e7) { const v = abs / 1e7; return '₹' + grp(v, dec(v)) + (w ? ' crore' : ' Cr'); }
  if (abs >= 1e5) { const v = abs / 1e5; return '₹' + grp(v, dec(v)) + (w ? ' lakh' : ' L'); }
  return '₹' + grp(abs);
}

export function fmtCountProse(abs: number, intl: boolean, style: 'word' | 'abbr' = 'word'): string {
  const w = style === 'word';
  if (intl) {
    if (abs >= 1e9) { const v = abs / 1e9; return grp(v, dec(v)) + (w ? ' billion' : ' bn'); }
    if (abs >= 1e6) { const v = abs / 1e6; return grp(v, dec(v)) + (w ? ' million' : ' mn'); }
    return grp(abs);
  }
  if (abs >= 1e7) { const v = abs / 1e7; return grp(v, dec(v)) + (w ? ' crore' : ' Cr'); }
  if (abs >= 1e5) { const v = abs / 1e5; return grp(v, dec(v)) + (w ? ' lakh' : ' L'); }
  return grp(abs);
}

// Rewrite every tagged figure under `root` for the current <html data-units>.
export function applyProseUnits(root: ParentNode = document): void {
  const intl = document.documentElement.dataset.units === 'intl';
  for (const el of root.querySelectorAll<HTMLElement>('.num[data-inr], .num[data-count]')) {
    const style = el.dataset.style === 'abbr' ? 'abbr' : 'word';
    if (el.dataset.inr != null) el.textContent = fmtInrProse(+el.dataset.inr, intl, style);
    else if (el.dataset.count != null) el.textContent = fmtCountProse(+el.dataset.count, intl, style);
  }
}
