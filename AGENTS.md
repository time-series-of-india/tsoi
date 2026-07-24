# AGENTS.md

Canonical entry point for AI coding agents working on **Time Series of India**
(TSOI). If you're an agent (or pointing one at this repo), start here.

## What this project is

A public-good, mostly-static site charting India's public data — currently
India's payment systems (UPI, IMPS, NEFT, RTGS, cards) from official RBI and NPCI
releases. Maintained by one person in limited hours.

## Read these, in order

1. **[`CLAUDE.md`](CLAUDE.md)** — architecture, components, data flow, schema,
   and the exact build/ETL commands. Your primary technical reference.
2. **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — what's open to contribute (data,
   ETL, code, dashboard bug fixes, data-error reports), the `build-*.mjs`
   static-JSON pipeline, ETL conventions, PR checklist, verification commands.

## Mental model (don't get this wrong)

- The **public site is 100% static.** Runtime `fetch` hits same-origin JSON only
  (`/data/economy/*.json`, `/maps/*.json`). **No database in the serving path** —
  do not add iframes or wire a database into the page.
- **Data JSON is gitignored and generated**, not committed. `npm run build` is
  *just* `astro build` — it does **not** run the generators. Regenerating data is
  a separate step (`node scripts/build-*.mjs`) that needs its source (TimescaleDB
  for dashboard/series data; raw `etl/npci/*.json` for reads data).
- Charts are **spec-driven native ECharts** (`site/src/lib/dashboards/`), not
  iframe embeds.
- **Entity names must be canonicalised** via `site/scripts/lib/canon-bank.mjs`
  (parsed from `etl/npci/normalize.py`). Never hand-roll case-sensitive
  `.replace()` name shorteners — they split entities like "SBI" /
  "State Bank Of India".

## Hard rules

- **Never commit** `.env*`, secrets, `site/public/data/**`, or `etl/**/*.json`
  intermediates — all gitignored, keep them that way.
- **No unsourced claim.** Every figure traces to a cited RBI/NPCI release; any
  interpretation beyond the dataset (mechanism, cause, context) needs its own
  cited reference. Live figures hydrate from generated data at build time; don't
  hard-type them.
- **Editorial prose is maintainer-authored.** You may propose factual corrections
  (with a source); do not author or rewrite narrative prose. This also covers
  puzzle questions/hints/context copy for the game — same rule, same reason.
  Content is CC BY-NC-ND 4.0 — no derivatives or commercial reuse (see
  [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md)); code is Apache-2.0. A game's
  *mechanic* isn't content and isn't restricted — build on it freely; only the
  specific authored puzzle text/design is off-limits to rewrite.
- **Deploys are manual.** No PR auto-publishes; don't add auto-deploy that would.

## Verify before you claim done

```bash
# secrets (docker fallback if not installed locally)
trufflehog git file://. --only-verified                 # zero findings

# ETL (if touched)
cd etl/<source> && SCHEMA_NAME=economy_dev python load_<dataset>.py

# generate data + build (if a generator or chart changed)
cd site && node scripts/build-<relevant>.mjs && npm run build
```

Run the relevant checks and report the actual output — don't assert success you
didn't observe.
