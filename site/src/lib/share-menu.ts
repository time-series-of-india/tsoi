// The share popover's behaviour, shared by every surface that carries one:
// the Rupee Time Machine's panel, a board's page bar, and each chart panel on a
// board. The markup and the styles are its other half, in
// components/dashboard/ShareMenu.astro — one implementation, so explore has one
// share control rather than a family of them.
//
// Open on click, close on Escape (focus back on the trigger) or on a click
// outside. The document-level listeners are wired ONCE for every menu on the
// page rather than once per menu: a board carries a popover on every chart
// panel, and forty copies of the same two handlers is forty walks of the DOM
// per click.

import { fitPopover } from './popover-fit';

export interface ShareMenuHandle {
  /** The `.share` wrapper. */
  root: HTMLElement;
  /** The trigger. */
  button: HTMLButtonElement;
  /** The popover itself. */
  menu: HTMLElement;
  open(open: boolean): void;
  isOpen(): boolean;
}

const menus: ShareMenuHandle[] = [];
let documentWired = false;

function wireDocument() {
  if (documentWired) return;
  documentWired = true;
  document.addEventListener('click', (e) => {
    for (const m of menus) {
      if (m.isOpen() && !m.root.contains(e.target as Node)) m.open(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const m of menus) {
      if (!m.isOpen()) continue;
      m.open(false);
      m.button.focus();
    }
  });
}

/**
 * Wire one `.share` wrapper (whatever the items inside it do). Returns a handle
 * so the caller can close the menu after an item has run.
 */
export function wireShareMenu(root: HTMLElement): ShareMenuHandle {
  const button = root.querySelector<HTMLButtonElement>(':scope > button')!;
  const menu = root.querySelector<HTMLElement>('.share-menu')!;
  const handle: ShareMenuHandle = {
    root,
    button,
    menu,
    open(open: boolean) {
      menu.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      // The trigger is normally at the right end of a bar, where a
      // right-anchored menu has all the room it needs; a maximized panel and a
      // narrow phone both move it. See lib/popover-fit.ts.
      if (open) fitPopover(menu);
    },
    isOpen: () => !menu.hidden,
  };
  // stopPropagation, so the document handler above does not see the click that
  // just opened the menu and close it again — which also hides it from the
  // outside-click closer, so any OTHER open menu is closed here instead. A
  // board carries a popover on every chart panel; at most one may be open.
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    for (const m of menus) if (m !== handle && m.isOpen()) m.open(false);
    handle.open(menu.hidden);
  });
  menus.push(handle);
  wireDocument();
  return handle;
}

/**
 * Say something happened on the item that did it — "Link copied" in place of
 * "Copy link" — and put the label back. The feedback belongs on the item
 * because that is where the reader is looking when it lands.
 */
export function flashLabel(btn: HTMLButtonElement, text: string, ms: number): void {
  const label = btn.dataset.shareLabel ?? btn.textContent ?? '';
  btn.dataset.shareLabel = label;
  btn.textContent = text;
  const prev = Number(btn.dataset.shareTimer ?? 0);
  if (prev) clearTimeout(prev);
  btn.dataset.shareTimer = String(window.setTimeout(() => {
    btn.textContent = label;
    delete btn.dataset.shareTimer;
  }, ms));
}
