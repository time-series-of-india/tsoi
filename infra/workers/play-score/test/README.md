# play-score tests

```sh
npm install     # once — esbuild and wrangler (miniflare rides in with it)
npm test
```

Twenty-two tests, about sixteen seconds. All but one run in well under a
second; `rescore-scale.test.mjs` seeds twelve thousand filings and takes
most of it, because the property it proves only exists above eight and a
half thousand.

## Why miniflare as a library rather than `wrangler dev`

`peaks/board-state.json` is never served verbatim — its one reader is the
health shape — and most of what is worth testing here is what happens when
that file is stale, missing or raced. A harness that could only reach it
through an HTTP route would be proving the route exists. `harness.mjs` opens the bucket directly and lets the worker see
nothing but requests.

The worker imports its weight table as a JSON module, so esbuild bundles it
first — the same step wrangler's own build does before handing workerd a
script. Miniflare is resolved through wrangler rather than installed
separately, so the runtime under test is the one the deploy uses.

## What belongs here

Arithmetic that fails silently. The board is maintained incrementally against
storage with no transactions, under a scheduler with no mutual exclusion, and
nearly everything that can go wrong looks fine from outside — the version this
replaced reported half its players for weeks and nobody could have told. So
these assert counts, orders and absences:

- a fold over four hundred filings agrees bin for bin with a full rescore;
- a rescore too big for one invocation resumes and converges on the exact board;
- overlapping crons lose nothing and duplicate nothing;
- no histogram bin goes negative, and the nightly rescore repairs one that did;
- the served board contains no pid, and the health route publishes only the
  fields it names;
- every response carries CORS, rejections included.

## What does not

The page. `site/src/components/play/InflationPeaks.astro` is checked on the
screenshot and preview loop, and its one piece of pure scoring logic —
`recordRun`, where the per-era best became months-then-time — is covered by
`site/tests/play/record-run.test.ts`.

The design these are drawn from:
the board rebuild note (internal ops docs), §7.
