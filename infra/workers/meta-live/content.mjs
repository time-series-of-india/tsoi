// Shared by the DB-backed seed and the live worker so a path cannot be assigned
// to different pieces at build time and at the edge. Current URLs come first;
// retired URL forms and finite sub-routes follow for exact matching.
const read = (slug, title, minor = false) => ({
  slug, title, format: 'read', minor,
  paths: [`/economy/read/${slug}/`, `/economy/reads/${slug}/`],
});

const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const RTM = '/economy/explore/rupee-time-machine';
const FOLDED = ['overview', 'product-view', 'bank-performance', 'upi-ecosystem', 'state-wise', 'mcc'];

export const CONTENT = [
  read('upi-architecture', 'UPI: Anatomy of a Transaction'),
  read('price-of-nearly-everything', 'Inflation: The Price of Nearly Everything'),
  read('credit-vs-debit', 'The debit card faded as UPI rose, the credit card didn’t', true),
  read('duel', 'Two apps run four-fifths of UPI', true),
  read('where-india-pays', 'Half of India’s UPI comes from five states', true),
  read('how-india-moves', 'India runs on UPI, but its money moves on RTGS', true),
  read('where-money-lands', 'India pays from SBI, and into Yes Bank', true),
  read('what-india-buys', 'Most of what India buys on UPI is food', true),
  read('shops-vs-people', 'India pays shops more often than people', true),
  read('bank-reliability', 'The banks’ own UPI failures are rare, and falling', true),
  { slug: 'independence', title: 'The Walk through Midnight', format: 'play',
    paths: ['/independence/'] },
  { slug: 'inflation-peaks', title: 'Inflation Peaks', format: 'play',
    paths: ['/economy/play/inflation-peaks/'] },
  { slug: 'off-by-how-much', title: 'Off by How Much?', format: 'play',
    paths: ['/economy/play/off-by-how-much/', '/economy/beats/off-by-how-much/',
      ...span(1, 60).flatMap((n) => [
        `/economy/play/off-by-how-much/${n}/`, `/economy/beats/off-by-how-much/${n}/`])] },
  { slug: 'payments-deck', title: 'Six things India’s payment data knows', format: 'play', minor: true,
    paths: ['/economy/play/payments/', '/economy/beats/payments/'] },
  { slug: 'explore-payments', title: 'India Payments', format: 'explore',
    paths: ['/economy/explore/payments/',
      ...FOLDED.flatMap((s) => [`/economy/explore/${s}/`, `/economy/dashboards/${s}/`])] },
  { slug: 'explore-inflation', title: 'India Inflation', format: 'explore',
    paths: ['/economy/explore/inflation/'] },
  { slug: 'rupee-time-machine', title: 'Rupee Time Machine', format: 'explore',
    paths: [`${RTM}/`, ...span(1947, 2035).map((y) => `${RTM}/${y}/`)] },
];

const RETIRED = /\/(reads|beats|dashboards)\//;
for (const item of CONTENT) {
  if (RETIRED.test(item.paths[0])) {
    throw new Error(`content ${item.slug}: paths[0] must be the current URL, got ${item.paths[0]}`);
  }
}

const slugByPath = new Map(
  CONTENT.flatMap((item) => item.paths.map((path) => [path, item.slug])),
);

export const contentSlugOf = (path) => slugByPath.get(path) ?? null;

export function contentHarvestDays(today, lastHarvestDay) {
  if (lastHarvestDay === today) return [today];
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: 8 }, (_, i) =>
    new Date(todayMs - (7 - i) * 86_400_000).toISOString().slice(0, 10));
}

export function mergeContentDaily(baseContent, freshRows) {
  // Recent worker rows can extend a seeded full history, but cannot create one.
  // Returning null keeps `content` out of the live payload so the page uses its
  // baked full-history snapshot until R2 has been seeded by build-meta.mjs.
  if (!Array.isArray(baseContent) || !baseContent.length) return null;

  const freshSlugs = new Set(freshRows.map((row) => row.slug));
  const catalog = new Map(CONTENT.map((item) => [item.slug, item]));
  const rowsBySlug = new Map();

  for (const item of baseContent || []) {
    rowsBySlug.set(item.slug, {
      ...item,
      daily: new Map((item.daily || []).map((row) => [row.day, { ...row }])),
    });
  }

  for (const slug of freshSlugs) {
    if (rowsBySlug.has(slug)) continue;
    const item = catalog.get(slug);
    if (!item) continue;
    rowsBySlug.set(slug, {
      slug: item.slug,
      title: item.title,
      format: item.format,
      url: item.paths[0],
      ...(item.minor ? { minor: true } : {}),
      daily: new Map(),
    });
  }

  for (const row of freshRows) {
    const item = rowsBySlug.get(row.slug);
    if (!item) continue;
    const old = item.daily.get(row.day);
    item.daily.set(row.day, {
      day: row.day,
      visits: Math.max(old?.visits ?? 0, row.visits ?? 0),
      rum_visits: Math.max(old?.rum_visits ?? 0, row.rum_visits ?? 0),
    });
  }

  return [...rowsBySlug.values()].map((item) => ({
    ...item,
    daily: [...item.daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
  }));
}
