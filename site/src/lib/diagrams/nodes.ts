// Shared node builders for the UPI read's interaction diagrams (server-side: used
// in .astro frontmatter to build the static markup that the client engine then
// animates). Keep icons thin-line so they read as one family with the charts.
export const IC: Record<string, string> = {
  phone: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/><line x1="10" y1="18.6" x2="14" y2="18.6"/></svg>',
  bank: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 21 8 3 8Z"/><line x1="5.5" y1="9" x2="5.5" y2="17"/><line x1="10" y1="9" x2="10" y2="17"/><line x1="14" y1="9" x2="14" y2="17"/><line x1="18.5" y1="9" x2="18.5" y2="17"/><line x1="3.5" y1="19" x2="20.5" y2="19"/></svg>',
  hub: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><line x1="12" y1="8.8" x2="12" y2="3.8"/><line x1="12" y1="15.2" x2="12" y2="20.2"/><line x1="8.8" y1="12" x2="3.8" y2="12"/><line x1="15.2" y1="12" x2="20.2" y2="12"/><circle cx="12" cy="3.4" r="1.25"/><circle cx="12" cy="20.6" r="1.25"/><circle cx="3.4" cy="12" r="1.25"/><circle cx="20.6" cy="12" r="1.25"/></svg>',
  qr: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="6" height="6"/><rect x="14.5" y="3.5" width="6" height="6"/><rect x="3.5" y="14.5" width="6" height="6"/><line x1="14.5" y1="14.5" x2="14.5" y2="20.5"/><line x1="17.5" y1="14.5" x2="17.5" y2="17.5"/><line x1="20.5" y1="17.5" x2="20.5" y2="20.5"/><line x1="14.5" y1="20.5" x2="17.5" y2="20.5"/></svg>',
  lock: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.1"/></svg>',
  // touchpoint-strip icons (the five moments you see)
  user: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 10 18 19.5 6.5"/></svg>',
  bell: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17V11a5 5 0 0 1 10 0v6"/><line x1="4.5" y1="17" x2="19.5" y2="17"/><path d="M10 19.8a2 2 0 0 0 4 0"/></svg>',
  eyeoff: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12s3.3-5.5 8-5.5 8 5.5 8 5.5-3.3 5.5-8 5.5S4 12 4 12Z"/><circle cx="12" cy="12" r="2.5"/><line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/></svg>',
};

// one node = a round icon badge + a label. `cls` carries an entity class (e-app,
// e-psp, ...) for colour and any layout/area classes.
export const INode = (cls: string, icon: string, k: string, s: string) =>
  `<div class="inode ${cls}"><span class="badge">${IC[icon]}</span><span class="tx"><span class="k">${k}</span><span class="s">${s}</span></span></div>`;

// a labelled lifeline header for a sequence diagram (wraps a node with an id used
// by the engine to position the lifeline + message arrows).
export const Actor = (id: string, cls: string, icon: string, k: string, s: string) =>
  `<div class="actor ${id}" data-id="${id}">${INode(cls, icon, k, s)}</div>`;
