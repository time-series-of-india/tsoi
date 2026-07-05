// The short-form Reads, in display order (flagship first). Source of truth for
// the /economy index listing AND the per-read pages: each page passes only its
// `slug` to ReadLayout, which reads title/deck/crumb from here. Single source.
export interface ReadEntry {
  slug: string;
  title: string;
  deck: string;
  crumb: string; // short breadcrumb label
  source: string; // RBI / NPCI
}

export const READS: ReadEntry[] = [
  {
    slug: 'upi-architecture',
    title: 'UPI: Anatomy of a Transaction',
    deck: 'You pay in seconds. Seven parties make it happen, and you see only one of them. A walk down the machine behind a single UPI payment, and what it does on the days it fails.',
    crumb: 'Anatomy of a Transaction',
    source: 'NPCI / RBI',
  },
  {
    slug: 'how-india-moves',
    title: 'India runs on UPI, but its money moves on RTGS',
    deck: 'By count, nearly nine in ten digital payments are UPI. By value, two-thirds of the rupees still move on RTGS, the banks’ large-value rail.',
    crumb: 'How India moves money',
    source: 'RBI',
  },
  {
    slug: 'shops-vs-people',
    title: 'India pays shops more often than people',
    deck: 'UPI began as a way to split bills. Most payments now go to shops, though by value person-to-person still moves the most money.',
    crumb: 'Shops vs people',
    source: 'NPCI',
  },
  {
    slug: 'what-india-buys',
    title: 'Most of what India buys on UPI is food',
    deck: 'Groceries, restaurants and fast food make up the bulk of UPI merchant spending. And fast food has climbed from far down the list to near the top.',
    crumb: 'What India buys',
    source: 'NPCI',
  },
  {
    slug: 'duel',
    title: 'Two apps run four-fifths of UPI',
    deck: 'PhonePe and Google Pay have split most of UPI for years, well past a cap the regulator keeps deferring. Below them, the order churns.',
    crumb: 'The duel for UPI',
    source: 'NPCI',
  },
  {
    slug: 'where-money-lands',
    title: 'India pays from SBI, and into Yes Bank',
    deck: 'Who sends UPI money and who receives it are almost entirely different banks. The reason is how merchant payments are wired.',
    crumb: 'Where money lands',
    source: 'NPCI',
  },
  {
    slug: 'where-india-pays',
    title: 'Half of India’s UPI comes from five states',
    deck: 'Maharashtra alone is nearly a fifth of it. The west and south lead; much of the north and east is still catching up.',
    crumb: 'Where India pays',
    source: 'NPCI',
  },
  {
    slug: 'bank-reliability',
    title: 'The banks’ own UPI failures are rare, and falling',
    deck: 'When a UPI payment fails it’s usually your side. The banks’ own technical declines now run well under 1%, vary only modestly, and keep dropping.',
    crumb: 'Bank reliability',
    source: 'NPCI',
  },
  {
    slug: 'credit-vs-debit',
    title: 'The debit card faded as UPI rose, the credit card didn’t',
    deck: 'Debit-card payments collapsed as people switched to scanning UPI. Credit cards kept climbing, and overtook debit in 2023.',
    crumb: 'Credit vs debit',
    source: 'RBI',
  },
];
