import assert from 'node:assert/strict';
import test from 'node:test';

import { refresh } from './worker.js';

const isoDay = (offset = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const contentSeed = () => [{
  slug: 'upi-architecture',
  title: 'UPI: Anatomy of a Transaction',
  format: 'read',
  url: '/economy/read/upi-architecture/',
  daily: [{ day: isoDay(-1), visits: 10, rum_visits: 6 }],
}];

const baseSeed = (overrides = {}) => ({
  built_at: `${isoDay(-1)}T23:55:00.000Z`,
  daily: [{ day: isoDay(-1), uniques: 7, page_views: 9, requests: 11, visits: 8 }],
  hourly: [],
  beacon_daily: [],
  countries_daily: [],
  countries_human_daily: [],
  referrers_daily: [],
  formats_daily: [],
  dispatches: [],
  ...overrides,
});

function memoryR2(seed) {
  let value = structuredClone(seed);
  let puts = 0;
  return {
    bucket: {
      async get(key) {
        assert.equal(key, 'traffic.json');
        return value ? { json: async () => structuredClone(value) } : null;
      },
      async put(key, body) {
        assert.equal(key, 'traffic.json');
        value = JSON.parse(body);
        puts += 1;
      },
    },
    value: () => structuredClone(value),
    puts: () => puts,
  };
}

function graphqlMock({ failContentHuman = false } = {}) {
  const queries = [];
  const fn = async (_url, options) => {
    const query = JSON.parse(options.body).query;
    queries.push(query);

    const contentHuman = query.includes('sum { visits } dimensions { date requestPath }');
    const contentEdge = query.includes('sum { visits } dimensions { clientRequestPath }');
    const requestedDay = query.match(/date_geq: "([^"]+)"/)?.[1]
      ?? query.match(/datetime_geq: "([^T]+)T/)?.[1];

    if (failContentHuman && contentHuman) return new Response(null, { status: 503 });

    let viewer;
    if (query.includes('httpRequests1dGroups')) {
      viewer = { zones: [{ g: [
        { dimensions: { date: isoDay(-1) }, sum: { requests: 11, pageViews: 9 }, uniq: { uniques: 7 } },
        { dimensions: { date: isoDay() }, sum: { requests: 5, pageViews: 4 }, uniq: { uniques: 3 } },
      ] }] };
    } else if (contentHuman) {
      viewer = { accounts: [{ g: requestedDay === isoDay() ? [{
        sum: { visits: 3 },
        dimensions: { date: isoDay(), requestPath: '/economy/read/upi-architecture/' },
      }] : [] }] };
    } else if (contentEdge) {
      viewer = { zones: [{ g: requestedDay === isoDay() ? [{
        sum: { visits: 4 },
        dimensions: { clientRequestPath: '/economy/read/upi-architecture/' },
      }] : [] }] };
    } else if (query.includes('httpRequestsAdaptiveGroups(limit: 1')) {
      viewer = { zones: [{ g: requestedDay === isoDay() ? [{ sum: { visits: 4 } }] : [] }] };
    } else if (query.includes('accounts(filter:')) {
      viewer = { accounts: [{ g: [] }] };
    } else {
      viewer = { zones: [{ g: [] }] };
    }
    return Response.json({ data: { viewer } });
  };
  return { fn, queries };
}

async function withFetch(mock, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const envFor = (bucket) => ({
  META: bucket,
  ACCOUNT_TAG: 'account',
  ZONE_TAG: 'zone',
  CF_ANALYTICS_TOKEN: 'token',
});

test('refresh merges content into seeded history and advances the UTC harvest marker', async () => {
  const r2 = memoryR2(baseSeed({ content: contentSeed(), content_harvest_day: isoDay(-1) }));
  const gql = graphqlMock();

  const result = await withFetch(gql.fn, () => refresh(envFor(r2.bucket)));
  const written = r2.value();

  assert.equal(r2.puts(), 1);
  assert.equal(result.merged.content_days, 8);
  assert.equal(written.content_harvest_day, isoDay());
  assert.deepEqual(written.content[0].daily, [
    { day: isoDay(-1), visits: 10, rum_visits: 6 },
    { day: isoDay(), visits: 4, rum_visits: 3 },
  ]);
});

test('the next refresh on the same UTC day harvests only that day', async () => {
  const r2 = memoryR2(baseSeed({ content: contentSeed(), content_harvest_day: isoDay(-1) }));
  const first = graphqlMock();
  await withFetch(first.fn, () => refresh(envFor(r2.bucket)));

  const second = graphqlMock();
  const result = await withFetch(second.fn, () => refresh(envFor(r2.bucket)));

  assert.equal(result.merged.content_days, 1);
  const contentQueries = second.queries.filter((query) =>
    query.includes('sum { visits } dimensions { date requestPath }')
      || query.includes('sum { visits } dimensions { clientRequestPath }'));
  assert.equal(contentQueries.length, 2);
  assert.ok(contentQueries.every((query) => query.includes(isoDay())));
});

test('refresh keeps content absent when R2 has no full-history seed', async () => {
  const r2 = memoryR2(baseSeed());
  const gql = graphqlMock();

  await withFetch(gql.fn, () => refresh(envFor(r2.bucket)));
  const written = r2.value();

  assert.equal(r2.puts(), 1);
  assert.equal('content' in written, false);
  assert.equal('content_harvest_day' in written, false);
  assert.equal(gql.queries.some((query) =>
    query.includes('sum { visits } dimensions { date requestPath }')
      || query.includes('sum { visits } dimensions { clientRequestPath }')), false);
});

test('a failed content request aborts refresh before the atomic R2 write', async () => {
  const r2 = memoryR2(baseSeed({ content: contentSeed(), content_harvest_day: isoDay() }));
  const gql = graphqlMock({ failContentHuman: true });

  await assert.rejects(
    withFetch(gql.fn, () => refresh(envFor(r2.bucket))),
    /gql http 503/,
  );
  assert.equal(r2.puts(), 0);
  assert.deepEqual(r2.value().content, contentSeed());
});
