// Keep a popover inside the viewport, whatever edge its CSS anchors it to.
//
// Every menu on a board hangs off a control that sits wherever its own bar puts
// it: the ITEM combobox at the left end of the items desk bar, the RANGE picker
// at the right end of a panel bar, the same item list on both. A stylesheet has
// to pick one edge to hang the menu from, and whichever it picks is wrong for
// one of those positions — a list 770px wide, anchored to its control's right
// edge 475px in from the left, drew all 358 rows off the left of the screen and
// read as a blank menu rather than as a menu in the wrong place.
//
// Which edge to hang from stays a CSS decision, because that is what lines the
// menu up with its control in the common case. This is the correction on top of
// it, and it can only be made at open time: it depends on where the bar has put
// the control and how wide the menu came out.
//
// Shared by the board's four menus (lib/dashboards/client.ts) and by the share
// popover (lib/share-menu.ts), which sits on every panel bar.

/** Gap kept between a nudged popover and the edge of the viewport. */
const GUTTER = 8;

/** Does document scrolling move this element? Not if anything above it is fixed. */
function inFixedSubtree(el: HTMLElement): boolean {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (getComputedStyle(node).position === 'fixed') return true;
  }
  return false;
}

/**
 * Nudge `menu` horizontally if it would spill out of the viewport. Call it
 * while the menu is VISIBLE (a hidden element has no layout to read) and after
 * whatever fills it has been written, since the contents set its width.
 */
export function fitPopover(menu: HTMLElement): void {
  // The wrapper the menu is positioned against (.cb, .ms, .dr, .share).
  const anchor = menu.offsetParent as HTMLElement | null;
  if (!anchor) return;

  // Measured off the ANCHOR rather than off the menu's own rect, and in
  // document rather than viewport coordinates. Both matter, and for the same
  // reason: a menu hanging off the right of the page makes the DOCUMENT wider
  // while it is out there, and the browser answers by scrolling sideways. Read
  // the menu's own rect and the shift you compute is exactly cancelled by the
  // page scrolling back as the overflow it caused goes away — measure again and
  // you get the same answer forever. The anchor is ordinary page content, so
  // where it sits does not depend on what the menu is doing; offsetLeft/Width
  // are layout figures, which a transform does not touch either.
  const originX = inFixedSubtree(menu) ? 0 : window.scrollX;
  const left = anchor.getBoundingClientRect().left + originX + menu.offsetLeft;
  const right = left + menu.offsetWidth;
  // clientWidth, not innerWidth: the latter counts the scrollbar as room the
  // menu could be pushed into, and on a page this tall there always is one.
  const vw = document.documentElement.clientWidth;

  let dx = 0;
  if (left < GUTTER) dx = GUTTER - left;
  // Pulling the right edge in must never push the left edge out — a menu wider
  // than the viewport (max-width caps it near that) lands flush left instead.
  else if (right > vw - GUTTER) dx = Math.max(GUTTER - left, vw - GUTTER - right);
  menu.style.transform = dx ? `translateX(${Math.round(dx)}px)` : '';
}
