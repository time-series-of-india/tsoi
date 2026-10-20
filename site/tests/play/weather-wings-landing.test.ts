import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWeatherLanding } from '../../src/lib/play/weather-wings-landing';

class Element extends EventTarget {
  hidden = false;
  disabled = true;
  inert = false;
  className = '';
  style = { cssText: '' };
  dataset = { module: '/weather-wings/test/game.js' };
  parentElement: Element | null = null;
  tagName = 'DIV';
  content = 'width=device-width, initial-scale=1';
  children: Element[] = [];
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  textContent = '';
  requestFullscreen?: () => Promise<void>;
  append(child: Element) { child.parentElement = this; this.children.push(child); }
  contains(child: Element): boolean { return this === child || this.children.some(e => e.contains(child)); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  focus() {}
  remove() {}
}

async function withLanding(run: (ctx: {host: Element; launch: Element; exit: Element; head: Element; landing: Element; viewport: Element; events: {entries: number; leaves: number}; settle: () => Promise<unknown>; doc: EventTarget & {fullscreenElement: Element | null};}) => Promise<void>, coarse = false) {
  const host = new Element(), launch = new Element(), exit = new Element();
  const styles = new Element(), landing = new Element(), viewport = new Element();
  const body = new Element(), head = new Element();
  const selectors = new Map([
    ['#weather-game', host], ['[data-weather-launch]', launch],
    ['.weather-exit', exit], ['#weather-game-styles', styles],
    ['[data-weather-landing]', landing], ['meta[name=viewport]', viewport],
  ]);
  body.append(landing); body.append(host); host.append(exit);
  const doc = Object.assign(new EventTarget(), {
    body, head, title: 'Weather Wings', fullscreenElement: null as Element | null,
    exitFullscreen(): Promise<void> { doc.fullscreenElement = null; return Promise.resolve(); },
    querySelector: (selector: string) => selectors.get(selector) ?? null,
    createElement: () => new Element(),
  });
  const replacements = {
    document: doc,
    window: { scrollY: 120, scrollTo() {} },
    location: { href: 'http://example.test/play/weather-wings/' },
    matchMedia: () => ({ matches: coarse }),
    MutationObserver: class { observe() {} },
  };
  const original = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const events = {entries: 0, leaves: 0};
  doc.addEventListener('weather-wings:enter', () => events.entries++);
  doc.addEventListener('weather-wings:leave', () => events.leaves++);
  try {
    for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, value });
    mountWeatherLanding();
    await run({host, launch, exit, head, landing, viewport, events, settle, doc});
  } finally {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test('exit and reopen during a pending import restores the latest entry once', async () => {
  await withLanding(async ({host, launch, exit, head, landing, viewport, events, settle}) => {
    launch.dispatchEvent(new Event('click'));
    assert.equal(head.children.length, 1);
    exit.dispatchEvent(new Event('click'));
    assert.equal(host.hidden, true);
    launch.dispatchEvent(new Event('click'));
    assert.equal(head.children.length, 1, 'a pending import must be shared');
    head.children[0].onload!();
    await settle();
    assert.equal(events.entries, 1, 'the current entry must explicitly restore its menu');
    assert.equal(events.leaves, 1, 'the stale startup must not close the current entry');
    assert.equal(host.hidden, false);
    exit.dispatchEvent(new Event('click'));
    assert.equal(landing.inert, false);
    launch.dispatchEvent(new Event('click'));
    await settle();
    assert.equal(events.entries, 2, 'subsequent entries restore the already loaded game');
    assert.equal(head.children.length, 1);
    exit.dispatchEvent(new Event('click'));
    assert.equal(viewport.content, 'width=device-width, initial-scale=1');
  });
});

test('finishing an import after exit closes any game dialogs without reopening', async () => {
  await withLanding(async ({host, launch, exit, head, events, settle}) => {
    launch.dispatchEvent(new Event('click'));
    exit.dispatchEvent(new Event('click'));
    head.children[0].onload!();
    await settle();
    assert.equal(host.hidden, true);
    assert.equal(events.entries, 0);
    assert.equal(events.leaves, 2, 'a game initialized after exit must also be suspended');
    launch.dispatchEvent(new Event('click'));
    await settle();
    assert.equal(events.entries, 1);
    assert.equal(head.children.length, 1);
  });
});


test('native fullscreen finishes before first import and before reopening a cached menu', async () => {
  await withLanding(async ({host, launch, exit, head, events, settle, doc}) => {
    let finish!: () => void;
    const layers: string[] = [];
    host.requestFullscreen = () => new Promise<void>(resolve => {
      finish = () => { doc.fullscreenElement = host; layers.push('fullscreen'); resolve(); };
    });
    doc.addEventListener('weather-wings:enter', () => layers.push('menu'));
    launch.dispatchEvent(new Event('click'));
    assert.equal(head.children.length, 0, 'module initialization must wait for fullscreen promotion');
    finish(); await settle();
    assert.equal(head.children.length, 1);
    head.children[0].onload!(); await settle();
    assert.deepEqual(layers, ['fullscreen', 'menu']);
    exit.dispatchEvent(new Event('click'));
    launch.dispatchEvent(new Event('click'));
    await settle();
    assert.equal(events.entries, 1, 'cached menu must stay closed until fullscreen finishes');
    finish(); await settle();
    assert.deepEqual(layers, ['fullscreen', 'menu', 'fullscreen', 'menu']);
    assert.equal(events.entries, 2);
    assert.equal(head.children.length, 1);
  }, true);
});

test('denied fullscreen still launches the fixed viewport game', async () => {
  await withLanding(async ({host, launch, head, events, settle}) => {
    host.requestFullscreen = async () => { throw Error('Fullscreen unavailable'); };
    launch.dispatchEvent(new Event('click')); await settle();
    assert.equal(head.children.length, 1);
    head.children[0].onload!(); await settle();
    assert.equal(events.entries, 1); assert.equal(host.hidden, false);
  }, true);
});

test('exiting during a pending fullscreen request does not import or reveal the game', async () => {
  await withLanding(async ({host, launch, exit, head, events, settle, doc}) => {
    let finish!: () => void;
    host.requestFullscreen = () => new Promise<void>(resolve => {
      finish = () => { doc.fullscreenElement = host; resolve(); };
    });
    launch.dispatchEvent(new Event('click'));
    exit.dispatchEvent(new Event('click'));
    finish(); await settle();
    assert.equal(head.children.length, 0);
    assert.equal(events.entries, 0);
    assert.equal(host.hidden, true);
    assert.equal(doc.fullscreenElement, null);
  }, true);
});
