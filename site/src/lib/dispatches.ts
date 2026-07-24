// "Dispatches" — the release unit: each thematic launch (longread + beats deck
// + dashboards, shipped together) is a numbered dispatch, and the front page
// (src/pages/index.astro) presents the latest one like a Sunday paper's front
// page; older ones become the "Previous dispatches" stack. Editions are
// numbered, not dated-as-cadence: releases are weeks apart and never promise a
// schedule. Items deep-link straight to content, never via a section index.
// Vocabulary note: "dispatch" is a noun only in this codebase — never name a
// function dispatch() (collides with JS event dispatch).
import type { Section, Theme } from './themes';

// One card variant per format; a future format (game, comic) means a new card
// variant on the front page, not a new surface.
export type DispatchFormat = 'read' | 'beat-deck' | 'dashboard' | 'game' | 'comic';

export interface DispatchItem {
  format: DispatchFormat;
  title: string;
  href: string; // deep link straight to the content
  blurb: string; // sells the item — what you'll come away with, not a contents list
  thumb?: string; // reads only: thumbnail base path; page appends .png / -dark.png
  meta?: string; // short kicker addendum: "6 cards", "updated daily"
}

export interface Dispatch {
  edition: number; // "Dispatch No. N"
  slug: string; // reserved for /dispatch/<slug> permalink pages (v2)
  date: string; // ISO release date; rendered as "July 2026"
  section: Section;
  theme: Theme; // label via THEME_LABELS — the edition line's theme name
  standfirst: string; // release context — not on the front page (the lead sells the dispatch); for permalink pages (v2)
  items: DispatchItem[]; // items[0] is the lead story (the read gets the big slot)
}

export const DISPATCHES: Record<string, Dispatch> = {
  '1-payments': {
    edition: 1,
    slug: '1-payments',
    date: '2026-07-06',
    section: 'economy',
    theme: 'payments',
    standfirst:
      'How India moves money — the machinery behind a single UPI payment, and the official numbers on who runs the rails and where the rupees actually flow.',
    items: [
      {
        format: 'read',
        title: 'UPI: Anatomy of a Transaction',
        href: '/economy/read/upi-architecture',
        blurb:
          'You pay in seconds. Seven parties make it happen, and you see only one of them. A walk down the machine behind a single UPI payment, and what it does on the days it fails.',
        thumb: '/thumbs/read/upi-architecture',
      },
      {
        format: 'game',
        title: 'Off by How Much?',
        href: '/economy/play/off-by-how-much/',
        blurb:
          'Four real numbers from India’s payment systems. Guess each one, then find out how far off you were.',
      },
      {
        format: 'dashboard',
        title: 'India Payments',
        href: '/economy/explore/payments',
        blurb:
          'Every rail on one board — UPI, cards, NEFT, RTGS — volume and value over any window, with five more boards behind it for banks, apps, states and merchant categories.',
      },
    ],
  },
};

// "Read", not "longread": small reads are retired, so the one surviving
// written format needs no qualifier.
export const FORMAT_LABELS: Record<DispatchFormat, string> = {
  read: 'Read',
  'beat-deck': 'Deck',
  dashboard: 'Dashboard',
  game: 'Game',
  comic: 'Comic',
};

// Newest first — the front page leads with [0], the rest form the stack.
export const DISPATCH_LIST: Dispatch[] = Object.values(DISPATCHES).sort(
  (a, b) => b.edition - a.edition
);

export const getDispatch = (slug: string) => DISPATCHES[slug];
