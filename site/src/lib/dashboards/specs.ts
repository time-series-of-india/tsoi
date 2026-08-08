// Spec-driven dashboards — the DATA half. Each spec is JSON-serializable
// (no functions): exactly the shape a user-submitted dashboard will take in a
// later phase. The runtime (runtime.ts) renders these; nothing here is code.
import type { DashboardSpec } from './runtime';
import { dataUrl } from '../data-url.ts';

// Time window: Grafana-style popover — quick presets plus a custom From/To month
// range. The value is a range token resolved by runtime.resolveRange (a month
// count, 'ytd'/'fy', or an absolute 'YYYY-MM~YYYY-MM'). Custom From/To months are
// populated from the dataset at runtime, so they only ever offer real months.
export const RANGE = { id: 'range', type: 'daterange' as const, label: 'Range', default: '24',
  info: 'The time window every panel in this desk shows. Drag across any chart to set a custom window; double-click a chart to reset.',
  quick: [
    { value: '3', label: '3M' }, { value: '6', label: '6M' }, { value: '12', label: '12M' },
    { value: '24', label: '24M' }, { value: 'ytd', label: 'YTD' }, { value: 'fy', label: 'FY' },
    { value: '0', label: 'All' },
  ] };

const shapeToggle = (id: string) => ({
  id, type: 'toggle' as const, label: 'Shape', affects: 'chart' as const, default: 'line',
  info: 'Draw this series as a line or as bars.',
  options: [{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }],
});

const METRIC = { id: 'metric', type: 'toggle' as const, label: 'Metric', default: 'volume_cr',
  info: 'Volume counts transactions; Value sums the money they moved.',
  options: [{ value: 'volume_cr', label: 'Volume' }, { value: 'value_lcr', label: 'Value' }] };

// Display labels for the raw DB category values (which are inconsistently cased).
const CATEGORY_LABELS = {
  'PAYMENT TRANSACTIONS': 'Payment transactions',
  'CASH WITHDRAWAL': 'Cash withdrawals',
  'Settlement Systems': 'Settlement systems',
};

// Aggregation bucket for time-series panels (the runtime derives the period from
// the daily `date` field). Monthly by default.
const AGG = { id: 'agg', type: 'select' as const, label: 'Aggregate', default: 'M',
  info: 'How the time series are bucketed: daily, monthly, quarterly or yearly totals.',
  options: [{ value: 'D', label: 'Daily' }, { value: 'M', label: 'Monthly' },
    { value: 'Q', label: 'Quarterly' }, { value: 'Y', label: 'Yearly' }] };

// Monthly-source variant (no Daily) — for datasets whose finest grain is a month.
const AGG_MQY = { id: 'agg', type: 'select' as const, label: 'Aggregate', default: 'M',
  info: 'How the time series are bucketed: monthly, quarterly or yearly totals.',
  options: [{ value: 'M', label: 'Monthly' }, { value: 'Q', label: 'Quarterly' }, { value: 'Y', label: 'Yearly' }] };

const declineToggle = (id: string) => ({
  id, type: 'toggle' as const, label: 'Decline', default: 'bd_pct',
  info: "Switch between business declines (failed on the customer side, like a wrong PIN or an empty account) and technical declines (failed inside the bank's systems).",
  options: [{ value: 'bd_pct', label: 'Business' }, { value: 'td_pct', label: 'Technical' }],
});

// Volume/Value where value is in plain crore (value_cr) — NPCI app/state datasets.
const METRIC_CR = { id: 'metric', type: 'toggle' as const, label: 'Metric', default: 'volume_cr',
  info: 'Volume counts transactions; Value sums the money they moved.',
  options: [{ value: 'volume_cr', label: 'Volume' }, { value: 'value_cr', label: 'Value' }] };

const pspSideToggle = (id: string) => ({
  id, type: 'toggle' as const, label: 'Side', default: 'payer',
  info: 'Payer PSPs route the sending side of a payment; payee PSPs route the receiving side.',
  options: [{ value: 'payer', label: 'Payer' }, { value: 'payee', label: 'Payee' }],
});

export const DASHBOARDS: DashboardSpec[] = [
  {
    slug: 'overview',
    section: 'economy',
    theme: 'payments',
    title: 'India Payments — Overview',
    description:
      'Compare India’s payment instruments side by side. Pick the instruments, the time window and the aggregation (daily to yearly): the lines track each instrument over time, the ring shows their split across the selected range. Volume or value, by category.',
    dataset: dataUrl('/data/economy/product-view.json'),
    // GLOBAL: category + instrument multiselect + Volume/Value + aggregation + range.
    globals: [
      { id: 'category', type: 'select', label: 'Category', field: 'category', labels: CATEGORY_LABELS, default: 'PAYMENT TRANSACTIONS',
        info: 'The RBI ledger the instruments are drawn from: payment transactions, cash withdrawals or settlement systems.' },
      { id: 'product', type: 'multiselect', label: 'Instruments', field: 'product', dependsOn: ['category'],
        default: ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Credit Card'], defaultTop: 6, rankBy: 'volume_cr',
        info: 'Which payment instruments the desk shows. All panels follow this selection.' },
      METRIC, AGG, RANGE,
    ],
    panels: [
      { id: 's_vol', title: 'Total volume', chart: 'stat', stat: 'totalVolume',
        info: 'Transactions across the selected instruments and window.',
        encoding: { y: 'volume_cr', filters: ['category', 'product'], timeRange: 'range' } },
      { id: 's_val', title: 'Total value', chart: 'stat', stat: 'totalValue',
        info: 'Money moved by the selected instruments across the window.',
        encoding: { y: 'value_lcr', filters: ['category', 'product'], timeRange: 'range' } },
      { id: 's_lead', title: 'Leading instrument', chart: 'stat', stat: 'leadShare',
        info: 'The instrument with the largest share of the selected metric in this window.',
        encoding: { y: '@metric', series: 'product', filters: ['category', 'product'], timeRange: 'range' } },
      { id: 'mix', title: 'Instruments over time', chart: 'line',
        info: 'Each selected instrument tracked over the window at the chosen aggregation.',
        encoding: { x: 'date', series: 'product', y: '@metric', filters: ['category', 'product'], timeRange: 'range', period: 'agg' } },
      { id: 'split', title: 'Share over selected range', chart: 'donut',
        info: "How the window's total splits across the selected instruments.",
        encoding: { x: 'product', y: '@metric', filters: ['category', 'product'], timeRange: 'range', limit: 8 } },
    ],
  },
  {
    slug: 'product-view',
    section: 'economy',
    theme: 'payments',
    title: 'Payment Product Explorer',
    description:
      'Drill into any Indian payment instrument by category, operator and product, over a chosen time range and aggregation (daily to yearly). Volume, value, average daily activity and ticket size — all from official RBI payment-system data.',
    dataset: dataUrl('/data/economy/product-view.json'),
    // GLOBAL cascading filters (category → operator → product) + aggregation + range.
    globals: [
      { id: 'category', type: 'select', label: 'Category', field: 'category', labels: CATEGORY_LABELS, default: 'PAYMENT TRANSACTIONS',
        info: 'The RBI ledger the instruments are drawn from: payment transactions, cash withdrawals or settlement systems.' },
      { id: 'sub_category', type: 'select', label: 'Operator', field: 'sub_category', dependsOn: ['category'], default: 'NPCI Operated',
        info: 'Who operates the rail: RBI, NPCI, a card network or CCIL.' },
      { id: 'product', type: 'select', label: 'Product', field: 'product', dependsOn: ['category', 'sub_category'], default: 'UPI',
        info: 'The single instrument this desk drills into.' },
      AGG, RANGE,
    ],
    panels: [
      { id: 's_vol', title: 'Avg daily volume', chart: 'stat', stat: 'avgDailyVolume',
        info: 'Transactions per day, averaged over the selected window.',
        encoding: { y: 'volume_cr', filters: ['category', 'sub_category', 'product'], timeRange: 'range' } },
      { id: 's_val', title: 'Avg daily value', chart: 'stat', stat: 'avgDailyValue',
        info: 'Money moved per day, averaged over the selected window.',
        encoding: { y: 'value_lcr', filters: ['category', 'sub_category', 'product'], timeRange: 'range' } },
      { id: 's_tkt', title: 'Avg ticket size', chart: 'stat', stat: 'ticket',
        info: 'Value divided by volume: what a typical transaction moves.',
        encoding: { y: 'value_lcr', filters: ['category', 'sub_category', 'product'], timeRange: 'range' } },
      { id: 'volume', title: 'Transaction volume', chart: 'line',
        info: "The product's transaction count over the window.",
        encoding: { x: 'date', y: 'volume_cr', filters: ['category', 'sub_category', 'product'], timeRange: 'range', period: 'agg' },
        controls: [shapeToggle('shape_v')] },
      { id: 'value', title: 'Transaction value', chart: 'line',
        info: 'The money the product moved over the window.',
        encoding: { x: 'date', y: 'value_lcr', filters: ['category', 'sub_category', 'product'], timeRange: 'range', period: 'agg' },
        controls: [shapeToggle('shape_x')] },
    ],
  },
  {
    slug: 'bank-performance',
    section: 'economy',
    theme: 'payments',
    title: 'UPI & IMPS — Bank Performance',
    description:
      'How India’s banks perform on real-time payments. Pick a system — the UPI remitter or beneficiary side, or IMPS — then compare banks’ transaction volume and decline rates over time, with a live league table of the busiest banks.',
    dataset: dataUrl('/data/economy/bank-performance.json'),
    // GLOBAL: system select + bank multiselect (cascades on system) + aggregation + range.
    globals: [
      { id: 'system', type: 'select', label: 'System', field: 'system', default: 'UPI Remitter',
        info: 'The rail being measured: the UPI remitter side, the UPI beneficiary side, or IMPS.' },
      { id: 'bank', type: 'multiselect', label: 'Banks', field: 'bank', dependsOn: ['system'],
        default: ['State Bank of India', 'HDFC Bank', 'Bank of Baroda', 'Union Bank of India', 'Punjab National Bank'],
        defaultTop: 5, rankBy: 'volume_cr',
        info: 'Which banks the two time-series panels follow. The stats and the league table always cover the whole system.' },
      AGG_MQY, RANGE,
    ],
    panels: [
      { id: 's_total', title: 'System volume', chart: 'stat', stat: 'totalVolume',
        info: 'All transactions on the selected system in this window, every bank counted.',
        encoding: { y: 'volume_cr', filters: ['system'], timeRange: 'range' } },
      { id: 's_lead', title: 'Leading bank', chart: 'stat', stat: 'leadShare',
        info: 'The bank with the largest volume share of the selected system in this window.',
        encoding: { y: 'volume_cr', series: 'bank', filters: ['system'], timeRange: 'range' } },
      { id: 'vol', title: 'Volume over time', chart: 'line', wide: true,
        info: "Each selected bank's transaction volume on this system.",
        encoding: { x: 'date', series: 'bank', y: 'volume_cr', filters: ['system', 'bank'], timeRange: 'range', period: 'agg' } },
      { id: 'decline', title: 'Decline rate over time', chart: 'line',
        info: "The share of each selected bank's transactions that failed, at the chosen aggregation.",
        encoding: { x: 'date', series: 'bank', y: '@dtype', filters: ['system', 'bank'], timeRange: 'range', period: 'agg', aggregate: 'avg' },
        controls: [declineToggle('dtype')] },
      { id: 'rank', title: 'Busiest banks (latest month)', chart: 'bar',
        info: 'The busiest banks on this system in the latest month, selected or not.',
        encoding: { x: 'bank', y: 'volume_cr', filters: ['system'], latest: true, sort: 'desc', limit: 12, horizontal: true } },
    ],
  },
  {
    slug: 'upi-ecosystem',
    section: 'economy',
    theme: 'payments',
    title: 'UPI Ecosystem — Apps & PSPs',
    description:
      'Who moves UPI. The apps consumers tap (PhonePe, Google Pay, Paytm and the rest) by transaction volume and value, and the PSP banks that route the payments behind them. Switch metric, aggregation and time window.',
    dataset: dataUrl('/data/economy/upi-ecosystem.json'),
    globals: [
      // id equals the dataset field it filters ('name') — the runtime's filters
      // contract maps a control id straight onto the row field of the same name.
      { id: 'name', type: 'multiselect', label: 'Apps', field: 'name', where: { kind: 'app' },
        default: [], defaultTop: 6, rankBy: 'volume_cr',
        info: 'Which UPI apps the desk follows. Every panel except the PSP table tracks this selection.' },
      METRIC_CR, AGG_MQY, RANGE,
    ],
    panels: [
      { id: 's_total', title: 'Total volume', chart: 'stat', stat: 'totalVolume',
        info: 'Transactions by the selected apps in this window.',
        encoding: { y: 'volume_cr', where: { kind: 'app' }, filters: ['name'], timeRange: 'range' } },
      { id: 's_lead', title: 'Leading app', chart: 'stat', stat: 'leadShare',
        info: 'The app with the largest share of the selected metric among the selected apps.',
        encoding: { y: '@metric', series: 'name', where: { kind: 'app' }, filters: ['name'], timeRange: 'range' } },
      { id: 'apps', title: 'Apps over time', chart: 'line', wide: true,
        info: 'Each selected app tracked over the window.',
        encoding: { x: 'date', series: 'name', y: '@metric', where: { kind: 'app' }, filters: ['name'], timeRange: 'range', period: 'agg', limit: 6 } },
      { id: 'split', title: 'App share over selected range', chart: 'donut',
        info: "How the window's total splits across the selected apps.",
        encoding: { x: 'name', y: '@metric', where: { kind: 'app' }, filters: ['name'], timeRange: 'range', limit: 8 } },
      { id: 'psp', title: 'Top PSP banks (latest month)', chart: 'bar',
        info: 'PSP banks route UPI payments behind the apps. Ranked by latest-month volume; independent of the app selection above.',
        encoding: { x: 'name', y: 'volume_cr', where: { kind: 'psp' }, filters: ['psp_type'], latest: true, sort: 'desc', limit: 12, horizontal: true },
        controls: [pspSideToggle('psp_type')] },
    ],
  },
  {
    slug: 'state-wise',
    section: 'economy',
    theme: 'payments',
    title: 'State-Wise Performance',
    description:
      'UPI activity across Indian states and union territories. Month and Volume/Value metric drive both panels together; hover for each state’s rank, and choose how many states to rank.',
    dataset: dataUrl('/data/economy/state-wise.json'),
    globals: [
      { id: 'month', type: 'select', label: 'Month', field: 'month', default: '@latest',
        info: 'The single month both panels show.' },
      { id: 'metric', type: 'toggle', label: 'Metric', default: 'volume_cr',
        info: 'Volume counts transactions; Value sums the money they moved.',
        options: [{ value: 'volume_cr', label: 'Volume' }, { value: 'value_cr', label: 'Value' }] },
      { id: 'topn', type: 'select', label: 'Top', default: '10',
        info: 'How many states the ranking bar shows.',
        options: [{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '15', label: '15' }, { value: '20', label: '20' }] },
    ],
    panels: [
      { id: 'map', title: 'UPI by state', chart: 'choropleth', map: 'india',
        info: "Each state's UPI activity in the chosen month. Hover a state for its values and rank.",
        encoding: { region: 'state', y: '@metric', filters: ['month'] } },
      { id: 'top', title: 'Top states', chart: 'bar',
        info: 'The highest-ranked states for the chosen month and metric.',
        encoding: { x: 'state', y: '@metric', filters: ['month'], sort: 'desc', limit: '@topn', horizontal: true } },
    ],
  },
  {
    slug: 'mcc',
    section: 'economy',
    theme: 'payments',
    title: 'UPI by Merchant Category',
    description:
      'What India buys on UPI. The merchant categories soaking up payments — groceries, fast food, fuel and the rest — by transaction volume and value, over a chosen window and aggregation.',
    dataset: dataUrl('/data/economy/mcc.json'),
    globals: [
      { id: 'category', type: 'multiselect', label: 'Categories', field: 'category',
        // 'Telecom' is the generator's short name for the telecom-services MCC;
        // the long label here silently dropped it from the default selection.
        default: ['Groceries', 'Fast food', 'Restaurants', 'Telecom', 'Fuel stations', 'Pharmacies'],
        defaultTop: 8, rankBy: 'volume_cr',
        info: 'Which merchant categories all panels follow.' },
      METRIC_CR, AGG_MQY, RANGE,
    ],
    panels: [
      { id: 's_total', title: 'Total volume', chart: 'stat', stat: 'totalVolume',
        info: 'Transactions in the selected categories over this window.',
        encoding: { y: 'volume_cr', filters: ['category'], timeRange: 'range' } },
      { id: 's_lead', title: 'Leading category', chart: 'stat', stat: 'leadShare',
        info: 'The category with the largest share of the selected metric in this window.',
        encoding: { y: '@metric', series: 'category', filters: ['category'], timeRange: 'range' } },
      { id: 'cats', title: 'Categories over time', chart: 'line', wide: true,
        info: 'Each selected category tracked over the window.',
        encoding: { x: 'date', series: 'category', y: '@metric', filters: ['category'], timeRange: 'range', period: 'agg', limit: 8 } },
      { id: 'split', title: 'Share over selected range', chart: 'donut',
        info: "How the window's total splits across the selected categories.",
        encoding: { x: 'category', y: '@metric', filters: ['category'], timeRange: 'range', limit: 8 } },
      { id: 'rank', title: 'Top categories (latest month)', chart: 'bar',
        info: 'The biggest categories in the latest month, selected or not.',
        encoding: { x: 'category', y: '@metric', latest: true, sort: 'desc', limit: 12, horizontal: true } },
    ],
  },
];

// ── Inflation ──────────────────────────────────────────────────────────────
// Five desks over one dataset (inflation-board.json). That dataset is a nested
// document rather than a tidy table — a long spine, a modern window per
// sector, contribution months, an aggregation tree, per-state values, two
// baskets — so every spec below declares `shape: 'inflation'` and lib/shapes.ts
// flattens it into the rows these encodings read. Rows are discriminated by
// a `kind` field.
//
// Units ride on the field names, which is how the runtime formats them:
// `_pct` percent, `_pp` percentage points of the headline, `_pts` index points.

// Combined / Rural / Urban, and the single month a point-in-time panel reads.
//
// Neither is hoisted to the page bar any more. A page-level control has to be
// true of the whole page, and these two never were: three desks answer to the
// sector and two to the month, so the bar was offering every reader a switch
// that did nothing to most of what was under it. Each now sits on the desk
// that reads it — or on the one panel that reads it, where a desk's other
// panels would sit the choice out.
const SECTOR = { id: 'sector', type: 'toggle' as const, label: 'Sector', default: 'Combined',
  info: 'Rural and urban India are weighed and priced separately; Combined is the published national figure.',
  options: [{ value: 'Combined', label: 'Combined' }, { value: 'Rural', label: 'Rural' }, { value: 'Urban', label: 'Urban' }] };

// The single month the point-in-time panels show. Options come from the
// dataset, so it only ever offers months that have a published reading.
const CPI_MONTH = { id: 'month', type: 'select' as const, label: 'Month', field: 'month', default: '@latest',
  info: 'The month this panel reads. Year-on-year on the 2024 base begins with its first full year.' };

const CPI_SOURCE = 'Source: MoSPI Consumer Price Index, base 2024=100 · timeseriesofindia.com';

// Index or rate, on the same lines. Both are published for the same rows, so
// this switches the measure rather than the dataset: the levels run from the
// first month of the 2024 base, the rates from a year into it. The headline
// desk keeps its two dedicated panels — there the pair IS the desk — and every
// other line panel on the board carries this instead of a second chart.
const MEASURE = { id: 'measure', type: 'toggle' as const, label: 'Measure', default: 'idx_pts',
  info: 'The index is the price level on the 2024 base. Year-on-year is that index against the same month a year earlier.',
  options: [{ value: 'idx_pts', label: 'Index' }, { value: 'infl_pct', label: 'Year-on-year' }] };
const MEASURE_LABELS = { idx_pts: 'INDEX, 2024=100', infl_pct: 'YEAR ON YEAR, %' };
// A second copy under its own id, for the one desk that carries the same switch
// on two panels. Control ids are the desk's namespace, so sharing one would
// have both bars writing the same value and only one of them repainting.
const MEASURE_ITEM = { ...MEASURE, id: 'imeasure' };
// And a third, for the state desk, where whether a measure can be drawn is a
// question about the rows currently in scope rather than about the spec: a
// state with no rural series, or an item nobody has fetched yet, leaves the
// switch with nothing to switch to. Nothing here names an item — the rule asks
// the rows which measures they carry, and items now carry both.
const MEASURE_STATES = {
  ...MEASURE,
  liveOptions: { where: { kind: 'series' }, filters: ['region', 'sector', 'sel>code_name'], by: 'field' as const },
};

// The states a desk is looking at. The VALUE is the map's own upper-case region
// name, which is what makes the map a picker: clicking a region writes exactly
// what this control holds, so the map, the lines and the swarm cannot drift
// apart. `labelField` gives it MoSPI's spelling to read by. Scoped to the
// SERIES rows rather than the map's, because those carry All India — which is
// not a region on any map but is the line every state is read against.
// All India alone to open with: the desk starts on the national line and every
// state a reader picks is added to it, which is the comparison the lines exist
// for. Naming a second state here would have been an editorial pick of one
// state out of thirty-six.
const CPI_STATES = { id: 'region', type: 'multiselect' as const, label: 'States', field: 'region',
  labelField: 'state', where: { kind: 'series' }, default: ['ALL INDIA'],
  info: 'The states the lines draw. Click the map to pick one, ⌘-click to add another, click again to drop it. All India stays as the reference line.' };

const INFLATION_DASHBOARDS: DashboardSpec[] = [
  {
    slug: 'inflation-headline',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation — The headline',
    description:
      'The one number, now. The published index on the 2024 base and the year-on-year rate it produces, for rural, urban or combined India, and the chosen month ranked by what each division added to it.',
    dataset: dataUrl('/data/economy/inflation-board.json'),
    shape: 'inflation',
    // A citation, not a second essay. The Labour Bureau mention rode with the
    // long line to its own desk, so this is the 2024 base and nothing else.
    source: CPI_SOURCE,
    // When the next number lands. A fact about the desk rather than any one
    // figure on it, so it takes no panel label; computed at build time from the
    // vintage, so it can never be a date that has already passed.
    noteFrom: ['nextPrint.note'],
    // Only the sector reaches this desk, and only its two 2024-base panels.
    globals: [SECTOR],
    panels: [
      // The index first and the rate it produces second, tile and chart alike:
      // what MoSPI publishes, then what is read off it. The hues hold wherever
      // either appears on the desk — ink is the level, saffron is the headline
      // rate — so the pair is one thing seen twice rather than two panels.
      { id: 's_idx', title: 'The index', chart: 'stat', stat: 'cpiLatest', accent: 'ink',
        info: 'The published price level on the 2024 base, and its move on the month. 100 is the 2024 average, so 107 is 7% above it.',
        encoding: { y: 'idx_pts', where: { kind: 'modern' }, filters: ['sector'] } },
      { id: 's_rate', title: 'Year-on-year', chart: 'stat', stat: 'cpiLatest', accent: 'primary',
        info: 'The published rate, and its move on the month. A falling rate still means prices rose, only more slowly.',
        encoding: { y: 'infl_pct', where: { kind: 'modern' }, filters: ['sector'] } },
      { id: 's_mover', title: 'Biggest mover', chart: 'stat', stat: 'cpiTopMover', accent: 'teal',
        info: 'The division that moved the headline furthest, up or down. Combined only: the sector switch does not reach it.',
        encoding: { y: 'contrib_pp', series: 'division', where: { kind: 'contrib' } } },
      { id: 'index', title: 'The index, 2024 = 100', chart: 'line', accent: 'ink',
        info: 'What MoSPI publishes and the whole basket aggregates into: the price level on the current base.',
        encoding: { x: 'date', y: 'idx_pts', where: { kind: 'modern' }, filters: ['sector'],
          yLabel: 'INDEX, 2024=100' } },
      { id: 'rate', title: 'Year-on-year, the 2024 base', chart: 'line', accent: 'primary',
        info: 'The same index against the same month a year earlier. It starts in January 2026: a rate needs a year of the base behind it.',
        note: 'The 2024 base opened in January 2025, so its first year-on-year could not print until January 2026. The line to the left of that month is not missing: it does not exist yet.',
        // The target the print is read against, drawn rather than described.
        // The sentence that says what it is comes from the dataset, where the
        // generator keeps the four numbers the band is made of.
        noteFrom: ['band.note'],
        encoding: { x: 'date', y: 'infl_pct', where: { kind: 'modern' }, filters: ['sector'],
          referenceBand: { kind: 'band' },
          yLabel: 'YEAR ON YEAR, %' } },
      // The ranking sits here, between the current rate and the long run: it
      // answers "what is behind this month's number" while that number is
      // still on screen, which is where a reader asks it.
      { id: 'breakdown', title: 'The chosen month, ranked by how far it moved the headline', chart: 'contribbars', wide: true, accent: 'teal',
        info: 'The month split into the divisions that built it. A heavy division with a mild rate can outweigh a light one with a violent one. Combined only.',
        encoding: { x: 'division', y: 'contrib_pp', where: { kind: 'contrib' }, filters: ['month'],
          yLabel: 'PERCENTAGE POINTS OF THE HEADLINE' },
        controls: [CPI_MONTH] },
    ],
  },
  // ── the long run ─────────────────────────────────────────────────────────
  // The spine used to close the headline desk, which put a history piece at the
  // foot of a now-story: a reader who had come for this month's number met
  // 1974 as a postscript. It is a desk of its own now, second on the page, with
  // the record around the line rather than under it — the peak, the targeting
  // era, and what each decade averaged.
  {
    slug: 'inflation-history',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation — The long run',
    description:
      'The same number, run back to 1969. Monthly year-on-year consumer inflation across four changes of source or base, joined end to end: the Labour Bureau\'s CPI for Industrial Workers, which prices the households of workers in organised industry, up to 2013, and MoSPI\'s CPI Combined, which prices every household, from 2014. Around the line, its record: the 1974 peak, the decade averages, and how the inflation-targeting era has actually gone.',
    dataset: dataUrl('/data/economy/inflation-board.json'),
    shape: 'inflation',
    source: 'Sources: MoSPI Consumer Price Index, base 2024=100 and base 2012=100, and the Labour Bureau\'s CPI for Industrial Workers before 2014 · timeseriesofindia.com',
    // All-India combined from end to end, so there is no sector to offer. The
    // window control sits on the spine's own bar, because the decade bars read
    // their own rows and would sit it out.
    globals: [],
    panels: [
      { id: 's_peak', title: 'The peak', chart: 'stat', stat: 'extreme', accent: 'primary',
        info: 'The highest monthly print on the whole line, and when it landed.',
        encoding: { x: 'date', y: 'infl_pct', where: { kind: 'spine' }, sort: 'desc' } },
      { id: 's_inband', title: 'Inside the band', chart: 'stat', stat: 'countOf', accent: 'ink',
        info: 'Months since August 2016 that landed inside the 2–6 band. Flexible inflation targeting began that month.',
        encoding: { x: 'since', y: 'inside', y2: 'total', where: { kind: 'band' }, yLabel: 'months' } },
      { id: 's_breach', title: 'Since the last breach', chart: 'stat', stat: 'sinceEvent', accent: 'teal',
        info: 'How long the rate has stayed inside the band, and the month it last left it.',
        encoding: { x: 'breach_month', y: 'elapsed', y2: 'breach_pct', where: { kind: 'band' }, yLabel: 'months' } },
      { id: 'spine', title: 'Year-on-year inflation since 1969', chart: 'spine', wide: true, accent: 'primary',
        info: 'The whole monthly run, four changes of source or base joined end to end. The key names each mark. Combined only.',
        encoding: { x: 'date', y: 'infl_pct', where: { kind: 'spine' }, timeRange: 'range', yLabel: 'YEAR ON YEAR, %',
          // Clips itself to the months the target has actually applied to,
          // which is what keeps a 2016 policy off a 1974 line.
          referenceBand: { kind: 'band' },
          // Five dated marks, each verified against this line at build time.
          events: { kind: 'event' } },
        controls: [{ ...RANGE, default: '0',
          info: 'The window this line shows. Drag across the chart to set a custom window; double-click to reset.' }],
        // The instrument switch belongs against the line it qualifies: a reader
        // comparing 1975 with 2025 is comparing two different surveys of two
        // different populations. The rounding width comes from the dataset.
        note: 'Two instruments joined end to end: the Labour Bureau\'s CPI for Industrial Workers, which prices only the households of workers in organised industry, up to 2013, and MoSPI\'s CPI Combined, which prices every household, from 2014.',
        noteFrom: ['headline.spine.quantizationNote'] },
      // Its own rows, its own axis: the window control above windows the line,
      // not this. Seven bars are the whole line at a glance, which is the one
      // thing the line itself cannot give a reader who is not counting.
      // accent: 'ink' reads fine on the LINE above (a thin stroke), but a BAR
      // filled solid in accentColor's 'ink' (t.text, on-surface) comes out
      // black on the light theme. Saffron is the house default for a chart
      // mark with nothing more specific to say, and pairs with the spine's
      // own primary-accented line above it.
      { id: 'decades', title: 'Decade by decade', chart: 'bar', accent: 'primary',
        info: 'The average of the monthly prints across each decade of the line. The first bar covers 1969 alone; the last runs to the latest print.',
        encoding: { x: 'decade', y: 'infl_pct', where: { kind: 'decade' },
          yLabel: 'AVERAGE YEAR ON YEAR, %' } },
    ],
  },
  // ── the divisions ────────────────────────────────────────────────────────
  // Half of what used to be "Inside the basket". That desk ran two stories down
  // one column — what moved the number, and what the items themselves did —
  // with the tree between them and no stat row on either. Split, each half gets
  // the headline desk's shape: the statement first, then the figures that open
  // it.
  {
    slug: 'inflation-divisions',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation — The divisions',
    description:
      'What moved the number. Pick divisions of the basket and read them twice over: what each added to the headline, month by month, and what their own index and rate did across the same window.',
    dataset: dataUrl('/data/economy/inflation-board.json'),
    shape: 'inflation',
    source: 'Sources: MoSPI Consumer Price Index (base 2024=100), published index levels, and the 2024 weighing diagram, Annexure 5.3 · timeseriesofindia.com',
    note: 'Every panel here reads the all-India combined basket.',
    // One selection, two views of it: what the chosen divisions contributed to
    // the headline, and what their own index did. The picker belongs to the
    // desk rather than to either panel because both answer the same "these
    // divisions" question.
    globals: [{
      id: 'code', type: 'multiselect', label: 'Divisions', field: 'code', labelField: 'division',
      where: { kind: 'contrib' },
      info: 'Which divisions this desk is about. Both figures follow the selection.',
      default: ['01', '04', '07', '13'],
    }],
    panels: [
      { id: 's_mover', title: 'Biggest mover', chart: 'stat', stat: 'cpiTopMover', accent: 'teal',
        info: 'The division that moved the headline furthest this month, up or down.',
        encoding: { y: 'contrib_pp', series: 'division', where: { kind: 'contrib' } } },
      // Not the same question, and putting the two side by side is the point:
      // the division that moved the headline furthest is usually not the one
      // whose own prices rose fastest, because weight is doing the work.
      { id: 's_fastest', title: 'Fastest prices', chart: 'stat', stat: 'extreme', accent: 'primary',
        info: 'The division whose own prices rose quickest this month, whatever it weighs.',
        encoding: { x: 'division', y: 'infl_pct', where: { kind: 'contrib' }, latest: true, sort: 'desc' } },
      // Side by side: what they ADDED to the headline, and what their own
      // prices did. Same divisions, same colours, two different questions —
      // and reading them together is how a heavy division with a mild rate
      // stops being a paradox.
      { id: 'stack', title: 'What each division added, month by month', chart: 'bar', accent: 'teal',
        info: 'Each stack is one month\'s headline, split into the selected divisions. A segment below zero pulled the headline down.',
        encoding: { x: 'date', series: 'division', y: 'contrib_pp', where: { kind: 'contrib' },
          filters: ['code'],
          yLabel: 'PERCENTAGE POINTS OF THE HEADLINE',
          coverage: '{n} months so far. Division-level year-on-year begins with {from}.',
          // The two panels colour by different fields — this one by the
          // division's name, the lines below by the series name — so the same
          // division wore two colours on one desk until both were told to look
          // its code up in one hand-laid table.
          colorBy: 'division',
          tooltipFields: [{ field: 'weight_wt', label: 'weight in the basket' }, { field: 'infl_pct', label: 'its own rate' }] } },
      { id: 'divlines', title: 'Division by division, month by month', chart: 'line',
        info: 'Each division through time, the headline dashed behind. On the index every line starts at 100 in 2024, so the gap between two is how differently their prices have moved.',
        // Both measures on one pair of axes rather than two panels: the same
        // lines, read twice. The rate half starts a year into the index half,
        // which is not a hole in the data — see the note at the foot.
        controls: [MEASURE],
        encoding: { x: 'date', series: 'code_name', y: '@measure',
          where: { kind: 'series', state: 'All India', sector: 'Combined' },
          // The headline is not one of the twelve and is never picked as one,
          // but every division line is read against it, so it stays whatever
          // the selection does.
          filters: ['code'], filtersKeep: { code: ['GEN'] },
          colorBy: 'division',
          referenceSeries: 'CPI (General)', yLabels: MEASURE_LABELS } },
    ],
  },
  // ── the items ────────────────────────────────────────────────────────────
  // The other half. One control at the top of the desk threads all four panels
  // to the same item: the tile that says what it did and what it weighs, the
  // tree it hangs in, the month's extremes with it picked out if it is among
  // them, and its own line through time.
  {
    slug: 'inflation-items',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation — The items',
    description:
      'The items themselves. All 358 priced items folded floor by floor into the one number, with any one of them threaded through the tree; the month\'s biggest movers; and the chosen item through time, index or rate.',
    dataset: dataUrl('/data/economy/inflation-board.json'),
    shape: 'inflation',
    source: 'Sources: MoSPI Consumer Price Index (base 2024=100), published index levels, and the 2024 weighing diagram, Annexure 5.3. Class and sub-class shares are sums of their member items · timeseriesofindia.com',
    note: 'Every panel here reads the all-India combined basket. The tree is a single month — the latest published one — because a weighting diagram is an as-of statement, not a series.',
    // The picker moved up here from the funnel's own bar. It never only drove
    // the funnel: the tile, the line and the emphasis on the movers chart all
    // answer to it, and a control that reaches four panels sitting on one of
    // them reads as belonging to that one. The ink toggle stays down on the
    // funnel, because it genuinely reaches nothing else.
    globals: [{
      id: 'item', type: 'select', label: 'Item', field: 'code', labelField: 'node',
      where: { kind: 'tree', level: 'item' }, default: '01.1.7.2.1.01',
      // 358 options is a list nobody scrolls to the end of: the control takes a
      // type-ahead instead, and keeps the native select underneath for a reader
      // without JavaScript.
      search: true,
      info: 'The item this desk is threaded to. Type to search; clicking a cell in the tree moves it too.',
    }],
    panels: [
      { id: 's_item', title: 'The chosen item', chart: 'stat', stat: 'cpiItem', accent: 'ink',
        info: 'The item the desk is threaded to: its latest rate, and what it weighs in the ₹100 basket.',
        encoding: { x: 'item_name', y: 'infl_pct', y2: 'weight_wt', where: { kind: 'item' }, filters: ['item'] } },
      { id: 'funnel', title: 'Every item in the basket, folded into one number', chart: 'widget', widget: 'pyramid', wide: true,
        info: 'All 358 priced items and everything they fold into, floor by floor. Click a cell to follow its strand up the tree.',
        encoding: { y: 'weight_wt', where: { kind: 'basket' } },
        controls: [
          { id: 'ink', type: 'toggle', label: 'Ink', default: 'weight',
            info: 'What the shading means. Weight leaves every cell equal, so only width is read; Change darkens what rose fastest.',
            options: [{ value: 'weight', label: 'Weight' }, { value: 'change', label: 'Change' }] },
        ] },
      // Below the funnel, because both of these are about the floor it ends on.
      // The tree is one month deep and says what an item WEIGHS; these two say
      // what the items DID — the month's two extremes, and then whichever one
      // the desk is threaded to.
      { id: 'movers', title: 'The month\'s biggest item movers', chart: 'divbars', accent: 'teal',
        info: 'The ten items whose rate rose most and the ten that fell most. A loud item with a tiny weight barely moves the headline; the weight is on the hover.',
        encoding: { x: 'item_name', y: 'infl_pct', where: { kind: 'item' }, filters: ['month'],
          extremes: 10, yLabel: 'YEAR ON YEAR, %',
          // The desk's own item, picked out of the twenty where it is one of
          // them. Without it a reader who has just chosen an item has no way of
          // telling whether it is on this chart at all.
          emphasis: '@item', emphasisKey: 'code',
          // Weight rides the hover because the bar cannot carry it: an item up
          // 40 per cent that is a twentieth of a rupee in the hundred barely
          // moves the headline, and the length of its bar says the opposite.
          tooltipFields: [{ field: 'weight_wt', label: 'weight in the basket' },
            { field: 'idx_pts', label: 'index' }] },
        controls: [{ ...CPI_MONTH, where: { kind: 'item' },
          info: 'The month this ranking reads. Item rates begin with the 2024 base\'s first full year-on-year.' }] },
      { id: 'itemline', title: 'The chosen item, month by month', chart: 'line', accent: 'item',
        info: 'The item this desk is threaded to, through time: its published index, or its rate.',
        controls: [MEASURE_ITEM],
        encoding: { x: 'date', y: '@imeasure', where: { kind: 'item' }, filters: ['item'],
          yLabels: MEASURE_LABELS } },
    ],
  },
  {
    slug: 'inflation-states',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation — State by state',
    description:
      'One month of consumer inflation across India\'s states and union territories, for the headline index, any single division or any single priced item, rural, urban or combined — with the state you pick tracked through its own index, and every state placed against every division at once.',
    dataset: dataUrl('/data/economy/inflation-board.json'),
    shape: 'inflation',
    source: CPI_SOURCE,
    // The imputation sentence that used to sit here promised a marker the map
    // can never draw: MoSPI flags imputation on individual items, several
    // floors below a state total. Saying where the flag actually lives is the
    // honest version, and the funnel above is where it can be seen.
    note: 'State-level year-on-year exists only on the 2024 base, so this desk covers that window and no earlier. Chandigarh publishes no rural series, so it reads as no data under Rural. Individual items stand on their own footing: MoSPI prices each item only in the states that report it, so a thinly reported item leaves states blank, and an item\'s numbers load when it is picked. MoSPI flags imputation only on individual items, several floors below anything a state total can show, so no reading on this map carries that mark.',
    // Four desk controls, in the order the desk is read: WHICH KIND of thing,
    // which one of them, whose, and on which side of the rural/urban split. The
    // month is not among them — it is the map's own question (and the swarm's,
    // which reads the same month), so it hangs on the map's bar and everything
    // that filters on it follows from there.
    //
    // Two pickers rather than one grouped dropdown. A published CPI series and
    // a single priced item are not two entries in one list: they are published
    // for different sets of states, over different windows, and the item's
    // numbers are not even in the file until it is picked. The switch says
    // which of the two the desk is on, and the picker that is not in charge
    // dims rather than disappearing, so a reader can see both ways in.
    globals: [
      { id: 'focus', type: 'toggle', label: 'Show', default: 'Series',
        info: 'Whether the desk reads a published CPI series or a single priced item. The picker that is not in charge dims.',
        options: [{ value: 'Series', label: 'Series' }, { value: 'Item', label: 'Item' }] },
      { id: 'code_name', type: 'select', label: 'Series', field: 'code_name', default: 'CPI (General)',
        where: { kind: 'map', level: 'series' },
        // Dimmed under Item, and still doing work: it is what narrows the item
        // list below to one division's items, so it stays usable rather than
        // being disabled outright.
        deadWhen: { control: 'focus', is: 'Item' },
        info: 'The headline index or any one of the twelve divisions. The map and the lines follow it.' },
      { id: 'sitem', type: 'select', label: 'Item', field: 'node', default: 'Tomato',
        where: { kind: 'tree', level: 'item' },
        // Filed under the division each item hangs in, and narrowed to that
        // division when the Series picker is on one. Under CPI (General) the
        // narrowing has nothing to narrow to, and `cascadeOrAll` is what turns
        // that into "all 358" rather than into an empty list.
        groupBy: 'division', dependsOn: ['code_name>division'], cascadeOrAll: true,
        search: true,
        deadWhen: { control: 'focus', is: 'Series' },
        info: 'One priced item on the map and the lines. Type to search. Items are published for fewer states than the CPI series, so some states can read as no data.' },
      CPI_STATES,
      // Both switches are data-driven, and now that items arrive with every
      // sector and both measures they simply stay alive on an item. Nothing
      // here knows what an item is: the rule asks the rows in scope.
      { ...SECTOR, field: 'sector',
        liveOptions: { where: { kind: 'map' }, filters: ['sel>code_name'] } },
    ],
    // Which of the two pickers is in charge. Every panel below filters
    // `code_name` through this rather than testing the switch itself, so the
    // map, the tiles and the lines cannot end up on different answers.
    derived: [{ id: 'sel', from: 'focus', cases: { Series: 'code_name', Item: 'sitem' } }],
    // An item's per-state numbers are not in the main file: 358 items × 37
    // states × 3 sectors × 18 months is nine megabytes, and a reader wants one
    // of them. Each item ships as its own content-hashed shard and arrives when
    // it is picked (see DashboardSpec.lazyRows). The filename comes from the
    // main dataset's own item list, never from a pattern.
    lazyRows: {
      control: 'sitem',
      where: { kind: 'item' },
      match: 'item_name',
      file: 'file',
      base: '/data/economy/inflation-items/',
      shape: 'inflationItem',
    },
    panels: [
      // The two ends of the map, as numbers. A choropleth answers "where" well
      // and "how far apart" badly: the ramp has to be read against its own
      // legend to turn a colour into a rate, and the two states a reader most
      // wants named are the ones at the ends of it. Both tiles follow every
      // control the map does, so they are the map's own extremes and not a
      // second reading of a different month.
      { id: 's_high', title: 'Highest state', chart: 'stat', stat: 'extreme', accent: 'primary',
        info: 'The state with the highest rate for the chosen series or item, month and sector.',
        encoding: { x: 'state', y: 'infl_pct', where: { kind: 'map' },
          filters: ['month', 'sector', 'sel>code_name'], sort: 'desc' } },
      { id: 's_low', title: 'Lowest state', chart: 'stat', stat: 'extreme', accent: 'teal',
        info: 'The state with the lowest rate for the same series or item, month and sector.',
        encoding: { x: 'state', y: 'infl_pct', where: { kind: 'map' },
          filters: ['month', 'sector', 'sel>code_name'], sort: 'asc' } },
      { id: 'map', title: 'Year-on-year inflation by state', chart: 'choropleth', map: 'india',
        info: 'Each state\'s year-on-year rate for the chosen month, series and sector. Hover a state for its rate and where it ranks. Click one to make it the state this desk is about; hold ⌘ (or Ctrl) and click to add another and compare; click the last one again to go back to All India alone.',
        // The map is the desk's picker as well as its figure: a click writes
        // the state control, which is what the lines draw and what the swarm
        // accents. Selected states are named on the map rather than ringed.
        // All India is the floor the picking happens above: it is not a region
        // on the map, so it can only ever be added or removed from the
        // dropdown, and dropping the last picked state falls back to it rather
        // than to an empty panel.
        selects: 'region', selectsBase: 'ALL INDIA',
        encoding: { region: 'region', y: 'infl_pct', where: { kind: 'map' },
          filters: ['month', 'sector', 'sel>code_name'], highlight: '@region' },
        controls: [{ ...CPI_MONTH, info: 'The month the map and the swarm below read. The lines beside this are a run of months and sit it out.' }] },
      { id: 'stateline', title: 'The chosen states, month by month', chart: 'line',
        info: 'Each selected state on the chosen series. The index runs eighteen months, the rate six: a state\'s rate needs a year of the base behind it too.',
        note: 'On the index, every line is on the same national 2024 = 100 base, so states can be compared with each other and with All India. A level is still not a cost of living: it says how far that state\'s prices have moved since 2024, not that it is dearer than its neighbour.',
        controls: [MEASURE_STATES],
        encoding: { x: 'date', series: 'state', y: '@measure', where: { kind: 'series' },
          filters: ['region', 'sector', 'sel>code_name'],
          referenceSeries: 'All India', yLabels: MEASURE_LABELS } },
      // The map answers one series at a time; this answers all thirteen at
      // once. One dot per state per row, the selected states lit in every row,
      // which is the read the map cannot give: whether a state is high on
      // everything or only on food.
      { id: 'spread', title: 'Every state, every series, one month', chart: 'strips', wide: true,
        info: 'One row per series, one dot per state, the selected states lit in every row. The headline and its twelve divisions only, whatever the desk above is showing.',
        encoding: { x: 'region', series: 'code_name', y: 'infl_pct', where: { kind: 'map', level: 'series' },
          filters: ['month', 'sector'], highlightMember: '@region', memberLabel: 'state' } },
    ],
  },
  {
    slug: 'inflation-rebase',
    section: 'economy',
    theme: 'inflation',
    title: 'India Inflation — The new basket',
    description:
      'What thirteen years did to the shopping basket. Every division\'s share of household spending under the 2012 weights and under the 2024 ones, on the same taxonomy, for rural, urban or combined India; the one year both bases ran, on a shared 100; and rural against urban weight by weight.',
    dataset: dataUrl('/data/economy/inflation-board.json'),
    shape: 'inflation',
    source: CPI_SOURCE,
    // Without this the desk invites exactly the misreading it exists to
    // prevent: that the left column is what the 2012 index published. It is
    // not. It is the 2011-12 consumption basket restated onto the twelve-way
    // 2018 taxonomy so the two columns can share an axis at all. The
    // six-group food figure the sentence has to head off arrives from the
    // dataset (basket.restatementNote), where the generator reads it out of
    // the same weights table as everything else.
    note: 'The 2012 column is MoSPI\'s restatement of the 2011-12 consumption basket onto the twelve-division 2018 taxonomy used here, which is what makes the two columns comparable at all.',
    noteFrom: ['basket.restatementNote'],
    globals: [SECTOR],
    panels: [
      { id: 'slope', title: 'Division weights: the 2012 basket against the 2024 one', chart: 'slope', wide: true,
        info: 'A revision re-weighs the basket to what households spend now. A division that fell has not got cheaper: it takes a smaller slice of the budget.',
        encoding: { x: 'division', y: 'w2012_wt', y2: 'w2024_wt', where: { kind: 'basket' }, filters: ['sector'],
          yLabel: '2012 BASKET', y2Label: '2024 BASKET' } },
      // The one year the two bases both existed, which is the only place they
      // can be put on one chart at all. Index paths, not rates — the foot says
      // why the comparison a reader expects is not here.
      { id: 'overlap', title: 'One year, two rulers', chart: 'line',
        info: 'The 2012 base and the 2024 base across 2025, each set to 100 in January so the two paths can share an axis.',
        noteFrom: ['rebase.overlap.note'],
        encoding: { x: 'date', series: 'basis', y: 'idx_pts', where: { kind: 'overlap' },
          yLabel: 'INDEX, JAN 2025 = 100',
          tooltipFields: [{ field: 'raw_pts', label: 'published index' }] } },
      // Rural and urban households buy different baskets, and the combined
      // weight every other panel here uses is the two of them added up. This is
      // the addition undone: both halves at once, so the desk's sector toggle
      // has nothing to say to it.
      { id: 'dumbbell', title: 'Rural against urban, weight by weight', chart: 'dotplot',
        info: 'Each division\'s share of the rural basket and of the urban one, sorted by the gap between them.',
        note: 'This panel shows both sectors at once, so the Sector switch above does not reach it.',
        encoding: { x: 'division', y: 'w_rural_wt', y2: 'w_urban_wt', where: { kind: 'sectorweights' },
          yLabel: 'RURAL', y2Label: 'URBAN' } },
      // 'additions' ("What entered the basket", the chip widget) left this
      // desk (2026-08-02) as its own last panel — a chip list read as a
      // second, weaker basket figure beside the slope/overlap/dumbbell three
      // above. initBasketAdditions stays in inflation-widgets.ts, unwired,
      // for wherever the chips are wanted next.
    ],
  },
];

DASHBOARDS.push(...INFLATION_DASHBOARDS);

export const getSpec = (slug: string) => DASHBOARDS.find((d) => d.slug === slug);
export const dashboardsBySection = (section: string) => DASHBOARDS.filter((d) => d.section === section);
