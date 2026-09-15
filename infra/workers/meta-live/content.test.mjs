import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contentHarvestDays,
  contentSlugOf,
  mergeContentDaily,
} from './content.mjs';
import { freshContent } from './worker.js';

test('current, retired and sub-routes resolve to the same piece', () => {
  assert.equal(contentSlugOf('/economy/read/upi-architecture/'), 'upi-architecture');
  assert.equal(contentSlugOf('/economy/reads/upi-architecture/'), 'upi-architecture');
  assert.equal(contentSlugOf('/economy/play/off-by-how-much/42/'), 'off-by-how-much');
  assert.equal(contentSlugOf('/economy/explore/rupee-time-machine/1992/'), 'rupee-time-machine');
  assert.equal(contentSlugOf('/economy/read/'), null);
});

test('the first daily run backfills the full 7D window including today', () => {
  assert.deepEqual(contentHarvestDays('2026-08-28'), [
    '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
    '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
  ]);
  assert.deepEqual(contentHarvestDays('2026-08-28', '2026-08-28'), ['2026-08-28']);
});

test('recent rows cannot stand in for an absent full-history seed', () => {
  const fresh = [
    { slug: 'upi-architecture', day: '2026-08-28', visits: 4, rum_visits: 3 },
  ];
  assert.equal(mergeContentDaily(undefined, fresh), null);
  assert.equal(mergeContentDaily([], fresh), null);
});

test('human catch-up queries each UTC day inside its own group limit', async () => {
  const originalFetch = globalThis.fetch;
  const queries = [];
  globalThis.fetch = async (_url, options) => {
    const query = JSON.parse(options.body).query;
    queries.push(query);
    const day = query.match(/date_geq: "([^"]+)"/)?.[1]
      ?? query.match(/datetime_geq: "([^T]+)T/)?.[1];
    const path = '/economy/read/upi-architecture/';
    const viewer = query.includes('accounts(filter:')
      ? { accounts: [{ g: [{ sum: { visits: 2 }, dimensions: { date: day, requestPath: path } }] }] }
      : { zones: [{ g: [{ sum: { visits: 3 }, dimensions: { clientRequestPath: path } }] }] };
    return Response.json({ data: { viewer } });
  };

  try {
    const rows = await freshContent({
      ACCOUNT_TAG: 'account', ZONE_TAG: 'zone', CF_ANALYTICS_TOKEN: 'token',
    }, ['2026-08-27', '2026-08-28']);
    const humanQueries = queries.filter((query) => query.includes('accounts(filter:'));
    assert.equal(humanQueries.length, 2);
    assert.match(humanQueries[0], /date_geq: "2026-08-27", date_lt: "2026-08-28"/);
    assert.match(humanQueries[1], /date_geq: "2026-08-28", date_lt: "2026-08-29"/);
    assert.deepEqual(rows, [
      { slug: 'upi-architecture', day: '2026-08-27', visits: 3, rum_visits: 2 },
      { slug: 'upi-architecture', day: '2026-08-28', visits: 3, rum_visits: 2 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a partially empty harvest keeps the metric that did arrive', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const query = JSON.parse(options.body).query;
    const day = query.match(/date_geq: "([^"]+)"/)?.[1]
      ?? query.match(/datetime_geq: "([^T]+)T/)?.[1];
    const viewer = query.includes('accounts(filter:')
      ? { accounts: [{ g: [] }] }
      : { zones: [{ g: [{
          sum: { visits: 5 },
          dimensions: { clientRequestPath: '/economy/read/upi-architecture/' },
        }] }] };
    return Response.json({ data: { viewer } });
  };

  try {
    assert.deepEqual(await freshContent({
      ACCOUNT_TAG: 'account', ZONE_TAG: 'zone', CF_ANALYTICS_TOKEN: 'token',
    }, ['2026-08-28']), [{
      slug: 'upi-architecture', day: '2026-08-28', visits: 5, rum_visits: 0,
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a failed content query rejects the harvest instead of publishing a partial result', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const query = JSON.parse(options.body).query;
    if (query.includes('accounts(filter:')) return new Response(null, { status: 503 });
    return Response.json({ data: { viewer: { zones: [{ g: [] }] } } });
  };

  try {
    await assert.rejects(
      freshContent({
        ACCOUNT_TAG: 'account', ZONE_TAG: 'zone', CF_ANALYTICS_TOKEN: 'token',
      }, ['2026-08-28']),
      /gql http 503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fresh rows extend seeded history without allowing counters to regress', () => {
  const base = [{
    slug: 'upi-architecture',
    title: 'UPI: Anatomy of a Transaction',
    format: 'read',
    url: '/economy/read/upi-architecture/',
    daily: [{ day: '2026-08-27', visits: 12, rum_visits: 7 }],
  }];
  const merged = mergeContentDaily(base, [
    { slug: 'upi-architecture', day: '2026-08-27', visits: 11, rum_visits: 9 },
    { slug: 'upi-architecture', day: '2026-08-28', visits: 4, rum_visits: 3 },
    { slug: 'independence', day: '2026-08-28', visits: 2, rum_visits: 1 },
  ]);

  assert.deepEqual(merged[0].daily, [
    { day: '2026-08-27', visits: 12, rum_visits: 9 },
    { day: '2026-08-28', visits: 4, rum_visits: 3 },
  ]);
  assert.deepEqual(merged[1], {
    slug: 'independence',
    title: 'The Walk through Midnight',
    format: 'play',
    url: '/independence/',
    daily: [{ day: '2026-08-28', visits: 2, rum_visits: 1 }],
  });
});
