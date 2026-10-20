# National monsoon snapshot

Manually checked on 18 October 2026 against IMD's
[Salient Features of the 2026 Southwest Monsoon Season](https://internal.imd.gov.in/press_release/20260930_pr_5361.pdf),
listed on its [press-release index](https://internal.imd.gov.in/pages/press_release_mausam.php)
on 30 September 2026.

The committed CSV transcribes the national June–September total and its
long-period average from **Table 1, page 4**: 759.4 mm actual and 868.6 mm normal.
The **1971–2020** reference period is stated on page 19. The shortfall is
calculated as `(1 - actual / normal) * 100`, rounded to 12.6% for the headline.
The single track represents normal rainfall, with 87.4% received and an empty
12.6% shortfall. Track geometry uses the unrounded ratio.

The maintainer replaced the earlier three-state comparison on 19 October.
Its source records and map remain in private review evidence. This national
snapshot does not combine state, regional or monthly rainfall products.

This is a dated seasonal snapshot outside the database-backed data lineage.
There is no automated IMD retrieval or schedule. A future season requires a
manually verified replacement with its own source, dates, totals and normal
period. TSOI claims no ownership of IMD's data and does not redistribute the
report.

Run `node site/scripts/build-home-monsoon.mjs` from the repository root (or any
working directory). It validates the source record and generates the ignored
`site/public/data/environment/home-monsoon.json` used at Astro build time.
The release script includes this generation step.
