/** The same fixed viewport and coarse-pointer fullscreen enhancement as The Walk. */
export function mountWeatherLanding() {
  const host = document.querySelector<HTMLElement>('#weather-game');
  const launch = document.querySelector<HTMLButtonElement>('[data-weather-launch]');
  const exit = document.querySelector<HTMLButtonElement>('.weather-exit');
  const styles = document.querySelector<HTMLLinkElement>('#weather-game-styles');
  if (!host || !launch || !exit || !styles) return;
  let moduleLoad: Promise<void> | null = null;
  let entry = 0, active = false, native = false, scroll = 0, bodyClass = '', bodyStyle = '', gameClass = '', gameStyle = '';
  let pageTitle = '', gameTitle = '', viewportContent = '';
  const viewport = document.querySelector<HTMLMetaElement>('meta[name=viewport]');
  const outside = [...document.body.children].filter(el => !el.contains(host) && !['SCRIPT', 'STYLE'].includes(el.tagName));
  const landing = document.querySelector<HTMLElement>('[data-weather-landing]');
  if (landing) outside.push(landing);
  let inert: boolean[] = [];
  const dockExit = () => {
    if (!active) return;
    const dialogs = [...host.querySelectorAll<HTMLDialogElement>('dialog[open]')];
    const top = dialogs.find(dialog => dialog.contains(document.activeElement)) ?? dialogs.at(-1);
    const parent = top ?? host;
    if (exit.parentElement !== parent) parent.append(exit);
  };
  new MutationObserver(dockExit).observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
  const leave = () => {
    if (!active) return;
    active = false; entry++;
    document.dispatchEvent(new Event('weather-wings:leave'));
    gameClass = document.body.className; gameStyle = document.body.style.cssText;
    gameTitle = document.title; document.title = pageTitle;
    if (viewport) viewport.content = viewportContent;
    host.append(exit); exit.hidden = true; host.hidden = true; styles.media = 'not all';
    document.body.className = bodyClass; document.body.style.cssText = bodyStyle;
    outside.forEach((el, i) => { (el as HTMLElement).inert = inert[i]; });
    if (document.fullscreenElement === host) void document.exitFullscreen().catch(() => {});
    native = false; window.scrollTo(0, scroll); launch.focus({ preventScroll: true });
  };
  const enter = async () => {
    if (active) return;
    const current = ++entry;
    active = true; scroll = window.scrollY; bodyClass = document.body.className; bodyStyle = document.body.style.cssText;
    pageTitle = document.title; viewportContent = viewport?.content ?? '';
    if (viewport && !viewport.content.includes('viewport-fit')) viewport.content += ', viewport-fit=cover';
    if (gameTitle) document.title = gameTitle;
    inert = outside.map(el => (el as HTMLElement).inert);
    outside.forEach(el => { (el as HTMLElement).inert = true; });
    document.body.className = gameClass || 'rainfall-mode';
    document.body.style.cssText = gameStyle;
    Object.assign(document.body.style, { position: 'fixed', top: `-${scroll}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
    host.hidden = false; exit.hidden = false; styles.media = 'all';
    // Request in the tap itself, then open dialogs above the fullscreen host.
    // A cached menu opened earlier would be covered when the host joins the top layer.
    let fullscreen: Promise<void> | undefined;
    if (matchMedia('(pointer: coarse)').matches) {
      try { fullscreen = host.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {}); } catch { /* fixed viewport */ }
    }
    try {
      if (fullscreen) await fullscreen;
      if (current !== entry || !active) {
        if (!active && document.fullscreenElement === host) void document.exitFullscreen().catch(() => {});
        return;
      }
      if (!moduleLoad) {
        moduleLoad = new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.type = 'module'; script.src = host.dataset.module!;
          script.onload = () => resolve();
          script.onerror = error => { script.remove(); moduleLoad = null; reject(error); };
          document.head.append(script);
        });
      }
      await moduleLoad;
      // An earlier tap must not close or reopen a newer entry after loading.
      if (!active) { document.dispatchEvent(new Event('weather-wings:leave')); return; }
      if (current !== entry) return;
      document.dispatchEvent(new Event('weather-wings:enter'));
      dockExit();
    } catch (error) {
      if (current !== entry || !active) return;
      console.error('Weather Wings could not start', error);
      leave();
      const label = launch.querySelector('.poster-play');
      if (label) label.textContent = 'Unable to load. Tap to retry.';
    }
  };
  launch.addEventListener('click', () => void enter());
  launch.disabled = false;
  exit.addEventListener('click', leave);
  document.addEventListener('keydown', event => {
    if (active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); leave(); }
  }, true);
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === host) native = true;
    else if (native) leave();
  });
  if (new URL(location.href).searchParams.get('start') === '1') void enter();
}
