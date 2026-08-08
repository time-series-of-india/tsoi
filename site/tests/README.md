# Tests

`node:test` (a Node builtin — no test framework dependency) run through `tsx`,
so a test can import the site's TypeScript directly:

```bash
npm test                  # every tests/**/*.test.ts
npm test -- --test-name-pattern 'resolveRange'
```

## What belongs here

Pure, high-churn logic where a silent break is expensive and a screenshot would
not catch it:

- **spec validation** — every panel's encoding names a field its dataset has,
  control ids are unique within a desk, defaults resolve;
- **runtime helpers** — range resolution, aggregation buckets, top-N ranking,
  series filtering;
- **generator transforms** — the pure shaping functions in `scripts/build-*.mjs`.

## What does not

Astro component rendering and chart pixels. Those stay on the screenshot and
preview loop — a test that asserts on an ECharts `option` tree past its data
shape locks in styling, not behaviour.

Anything needing a live database. The generators read TimescaleDB at build time;
their SQL is verified by running them, their pure shaping functions by tests
here.

## Elsewhere

The play-score worker has its own suite under
`infra/workers/play-score/test/` — the board's counting, folding and
recovery, run against miniflare. Separate because it needs a Cloudflare
runtime rather than tsx, and because the worker deploys on its own.
