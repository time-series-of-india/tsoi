// Spec-driven dashboards — the DATA half. Each spec is JSON-serializable
// (no functions): exactly the shape a user-submitted dashboard will take in a
// later phase. The runtime (runtime.ts) renders these; nothing here is code.
import type { DashboardSpec } from './runtime';
import { dataUrl } from '../data-url.ts';

// Time window: Grafana-style popover — quick presets plus a custom From/To month
// range. The value is a range token resolved by runtime.resolveRange (a month
// count, 'ytd'/'fy', or an absolute 'YYYY-MM~YYYY-MM'). Custom From/To months are
// populated from the dataset at runtime, so they only ever offer real months.
const RANGE = { id: 'range', type: 'daterange' as const, label: 'Range', default: '24',
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

export const getSpec = (slug: string) => DASHBOARDS.find((d) => d.slug === slug);
export const dashboardsBySection = (section: string) => DASHBOARDS.filter((d) => d.section === section);
