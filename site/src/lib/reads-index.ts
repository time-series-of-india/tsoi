// The reads registry. Source of truth for the /economy/read shelf, RSS, AND
// the per-read pages: each page passes only its `slug` to ReadLayout, which
// reads title/deck/crumb from here. Single source.
// `kind` — 'read' is the surviving written format (the longreads); 'short' is
// the retired short-form. Retired means unlisted, not unpublished: the pages
// stay live (beats and dashboards deep-link to them, RSS already carried them)
// but no index lists them.
import type { Theme } from './themes';

export interface ReadEntry {
  slug: string;
  kind: 'read' | 'short';
  title: string;
  deck: string;
  crumb: string; // short breadcrumb label
  source: string; // RBI / NPCI
  theme: Theme; // subject cluster within the section (kicker label + grouping)
  published: string; // ISO date (YYYY-MM-DD) — RSS pubDate; set when the read ships
}

export const READS: ReadEntry[] = [
  {
    slug: 'upi-architecture',
    kind: 'read',
    title: 'UPI: Anatomy of a Transaction',
    deck: 'You pay in seconds. Seven parties make it happen, and you see only one of them. A walk down the machine behind a single UPI payment, and what it does on the days it fails.',
    crumb: 'Anatomy of a Transaction',
    source: 'NPCI / RBI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'how-india-moves',
    kind: 'short',
    title: 'India runs on UPI, but its money moves on RTGS',
    deck: 'By count, nearly nine in ten digital payments are UPI. By value, two-thirds of the rupees still move on RTGS, the banks’ large-value rail.',
    crumb: 'How India moves money',
    source: 'RBI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'shops-vs-people',
    kind: 'short',
    title: 'India pays shops more often than people',
    deck: 'UPI began as a way to split bills. Most payments now go to shops, though by value person-to-person still moves the most money.',
    crumb: 'Shops vs people',
    source: 'NPCI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'what-india-buys',
    kind: 'short',
    title: 'Most of what India buys on UPI is food',
    deck: 'Groceries, restaurants and fast food make up the bulk of UPI merchant spending. And fast food has climbed from far down the list to near the top.',
    crumb: 'What India buys',
    source: 'NPCI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'duel',
    kind: 'short',
    title: 'Two apps run four-fifths of UPI',
    deck: 'PhonePe and Google Pay have split most of UPI for years, well past a cap the regulator keeps deferring. Below them, the order churns.',
    crumb: 'The duel for UPI',
    source: 'NPCI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'where-money-lands',
    kind: 'short',
    title: 'India pays from SBI, and into Yes Bank',
    deck: 'Who sends UPI money and who receives it are almost entirely different banks. The reason is how merchant payments are wired.',
    crumb: 'Where money lands',
    source: 'NPCI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'where-india-pays',
    kind: 'short',
    title: 'Half of India’s UPI comes from five states',
    deck: 'Maharashtra alone is nearly a fifth of it. The west and south lead; much of the north and east is still catching up.',
    crumb: 'Where India pays',
    source: 'NPCI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'bank-reliability',
    kind: 'short',
    title: 'The banks’ own UPI failures are rare, and falling',
    deck: 'When a UPI payment fails it’s usually your side. The banks’ own technical declines now run well under 1%, vary only modestly, and keep dropping.',
    crumb: 'Bank reliability',
    source: 'NPCI',
    theme: 'payments',
    published: '2026-07-06',
  },
  {
    slug: 'credit-vs-debit',
    kind: 'short',
    title: 'The debit card faded as UPI rose, the credit card didn’t',
    deck: 'Debit-card payments collapsed as people switched to scanning UPI. Credit cards kept climbing, and overtook debit in 2023.',
    crumb: 'Credit vs debit',
    source: 'RBI',
    theme: 'payments',
    published: '2026-07-06',
  },
];
