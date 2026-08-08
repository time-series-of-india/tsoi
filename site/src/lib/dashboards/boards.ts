// Boards — the PAGE half of the spec data, as specs.ts is the desk half.
// A board is one subject worked through from several angles: its bar title,
// the controls hoisted to page level, and the desks in running order. Pages
// under /economy/explore/ are thin wrappers over these.
import type { BoardSpec } from './runtime';
import { RANGE } from './specs';

export const BOARDS: BoardSpec[] = [
  {
    slug: 'payments',
    section: 'economy',
    theme: 'payments',
    title: 'India Payments',
    // One Grafana-style time picker for the whole page rather than one per
    // desk. Every desk that carries a 'range' control has it dropped from its
    // own bar and driven from here; state-wise has a month select instead and
    // simply sits out. Same control as the desks', with the tooltip rewritten
    // for the scope it now has.
    globals: [{ ...RANGE, info: 'The time window every desk shows. Drag across any chart to set a custom window; double-click a chart to reset.' }],
    // Running order: the overview first, then its facets, matching the order
    // the explore gateway lists them in.
    desks: [
      { dashboard: 'overview', anchor: 'overview', title: 'Overview',
        info: 'The headline totals and instrument mix at a glance: pick instruments, a time window and an aggregation to compare volume, value and market share side by side.' },
      { dashboard: 'product-view', anchor: 'product', title: 'Product explorer',
        info: 'Drill into one payment instrument at a time by category, operator and product, tracking its volume, value, average daily activity and ticket size.' },
      { dashboard: 'bank-performance', anchor: 'banks', title: 'Bank performance',
        info: 'How individual banks perform on UPI and IMPS, comparing transaction volume and decline rates with a live ranking of the busiest banks.' },
      { dashboard: 'upi-ecosystem', anchor: 'apps', title: 'Apps & PSPs',
        info: 'Which consumer apps and PSP banks move UPI payments, by transaction volume and value over a chosen time window.' },
      { dashboard: 'mcc', anchor: 'mcc', title: 'Merchant categories',
        info: 'What Indians buy on UPI, broken down by merchant category such as groceries, fuel stations and fast food.' },
      { dashboard: 'state-wise', anchor: 'states', title: 'State-wise',
        info: 'UPI activity across India’s states and union territories for a chosen month, ranked from busiest to quietest.' },
    ],
  },
  {
    slug: 'inflation',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation',
    // No page-level controls, unlike payments' one time picker. The month and
    // the sector used to sit here, and it flattered the page at the reader's
    // expense: a bar above everything implies it moves everything, and neither
    // of those moved more than three of the five desks. Each control now sits
    // on the desk — or the single panel — that answers to it, which is also
    // what makes the page bar honest when payments does hoist one.
    globals: [],
    // Running order: the number, what moved it, the items themselves, where it
    // lands, what the basket became, and then the half-century behind it. The
    // headline opens because it is the figure the reader came for, and the four
    // desks after it all cut that same month up, in descending order of how far
    // down they cut. The long run closes rather than sitting second: it is the
    // only desk that leaves this month entirely, so it reads as the step back
    // at the end rather than a detour taken before the basket has been opened.
    desks: [
      { dashboard: 'inflation-headline', anchor: 'headline', title: 'The headline',
        info: 'The one number: where it stands this month, and what each division added to it.' },
      { dashboard: 'inflation-divisions', anchor: 'divisions', title: 'The divisions',
        info: 'Pick divisions of the basket and see both views of them: what each added to the headline, and what their own prices did.' },
      { dashboard: 'inflation-items', anchor: 'items', title: 'The items',
        info: 'All 358 priced items, folded into one number: what each weighs, the month\'s biggest movers, and any one of them through time.' },
      { dashboard: 'inflation-states', anchor: 'states', title: 'State by state',
        info: 'One month of inflation across every state, the chosen state tracked through time, and every state placed against the whole basket at once.' },
      { dashboard: 'inflation-rebase', anchor: 'rebase', title: 'The new basket',
        info: 'What the 2024 base revision did to the shopping basket: every division\'s share of household spending then and now, on the same taxonomy.' },
      { dashboard: 'inflation-history', anchor: 'long-run', title: 'The long run',
        info: 'Fifty-odd years of monthly inflation on one line: the 1974 peak, the decade averages, and how the targeting era has gone.' },
    ],
  },
];

export const getBoard = (slug: string) => BOARDS.find((b) => b.slug === slug);
