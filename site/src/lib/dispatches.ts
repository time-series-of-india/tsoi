// "Dispatches" — the release unit: each thematic launch (longread + beats deck
// + dashboards, shipped together) is a numbered dispatch, and the front page
// (src/pages/index.astro) presents the latest one like a Sunday paper's front
// page; older ones become the "Previous dispatches" stack. Editions are
// numbered, not dated-as-cadence: releases are weeks apart and never promise a
// schedule. Items deep-link straight to content, never via a section index.
// Vocabulary note: "dispatch" is a noun only in this codebase — never name a
// function dispatch() (collides with JS event dispatch).
import type { Section, Theme } from './themes';
import {
  INFLATION_PEAKS_HREF,
  INFLATION_PEAKS_TITLE,
} from './play/inflation-peaks';

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
  cta?: string; // overrides the format's default verb ("Open the dashboard") — a machine is opened, not a dashboard
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
  '2-inflation': {
    edition: 2,
    slug: '2-inflation',
    date: '2026-08-08',
    section: 'economy',
    theme: 'inflation',
    standfirst:
      'What inflation actually measures, how the number is built from a single collector’s tablet up to the headline everyone quotes, and two ways to feel it yourself: a game where the terrain is the series, and a calculator that runs any amount along it.',
    items: [
      {
        format: 'read',
        title: 'Inflation: The Price of Nearly Everything',
        href: '/economy/read/price-of-nearly-everything',
        thumb: '/thumbs/read/price-of-nearly-everything',
        blurb:
          'One number claims to describe a billion baskets. The gap between the headline and your life, the descent from that headline to a collector’s tablet, and where in the country it lands hardest.',
      },
      {
        format: 'game',
        title: INFLATION_PEAKS_TITLE,
        href: INFLATION_PEAKS_HREF,
        blurb:
          'A driving game where the terrain is the inflation series. One button, and a long way down.',
      },
      {
        format: 'dashboard',
        title: 'India Inflation',
        href: '/economy/explore/inflation',
        blurb:
          'Every inflation desk on one page: the headline back to 1969, the divisions that moved it, the whole basket item by item, and every state beside the national number.',
      },
      {
        format: 'dashboard',
        title: 'Rupee Time Machine',
        href: '/economy/explore/rupee-time-machine',
        blurb:
          'Any amount, any two months since August 1969: what it spent like then against what it spends like now, on one continuous price line.',
        cta: 'Open the machine',
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
