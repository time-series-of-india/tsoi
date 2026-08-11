# Independence Day flagship — source data

Retrieved **2026-08-11**. Build spec:
`tsoi-internal/docs/editorial/independence-flagship-build-spec.md`.

These CSVs are committed deliberately (see the `!/data/independence/` exception
in `.gitignore`). They are small, static, externally sourced, and will never be
refreshed by a cron, so they bypass the usual
ETL → TimescaleDB → generator pipeline.

**Consequence, accepted knowingly: `tsoi trace` lineage does not cover these
series.**

Files are stored **exactly as downloaded** — unfiltered, all countries. That is
why comparison lines (World, USA, China) cost nothing. Do not hand-edit them; if
a file looks wrong, re-download and diff.

## Retrieval

All Our World in Data files came from:

```
https://ourworldindata.org/grapher/<slug>.csv
```

No API key. The `?country=IND` parameter does **not** filter the file — every
CSV contains all countries.

| File | Slug | India span | Check values |
|---|---|---|---|
| `gdp-per-capita-maddison.csv` | `gdp-per-capita-maddison` | 1600–2022 | 1900 = 955 · 1947 = 985 · 2022 = 7765.6 |
| `child-mortality.csv` | `child-mortality` | 1911–2024 | 1911 = 33.34% · 2024 = 2.66% |
| `co-emissions-per-capita.csv` | `co-emissions-per-capita` | 1858–2024 | IND 2024 = 2.20 t · World = 4.73 · USA = 14.20 |
| `annual-temperature-anomalies.csv` | `annual-temperature-anomalies` | 1940–2025 | 1940 = −0.922 · 2025 = +0.068 |
| `per-capita-energy-use.csv` | `per-capita-energy-use` | 1965–2025 | IND 2025 = 7,419 · World = 20,258 · USA = 75,051 |
| `share-of-the-population-with-access-to-electricity.csv` | same | 1993–2024 | 1993 = 50.9% · 2024 = 99.9% |
| `share-of-women-in-parliament.csv` | `share-of-women-in-parliament` | 1900–2025 | 1952 = 4.0% · 2019 = 14.4% · 2024 = 13.7% |
| `share-electricity-renewables.csv` | `share-electricity-renewables` | 1985–2025 | 1985 = 27.8% · 2025 = 24.1% (it **fell**) |

Values are for `Code == IND` unless stated. Child mortality is **percent of live
births**, not per-1,000.

## Drought data

**Drought (SPEI)** — Drought Atlas of India v2, Zenodo
`10.5281/zenodo.20368514`, `DroughtAtlas_v2.zip`, 3.08 GB, **CC BY 4.0**.
Extracted 2026-08-11 via HTTP range requests against the Zenodo zip (only the
47 KB member was fetched, not the archive). Stored as `drought-spei-india.csv`:
`year,month,spei_1month,spei_4month,spei_12month`, 1901–2025, 1500 rows.

Take it from the **Zenodo DOI only**. The Water & Climate Lab's web portal footer
says "All rights reserved" and its GitHub repos declare no licence — the CC BY
grant exists solely on the Zenodo deposit. Never scrape the portal or use its
"Export Time Series" output.

## Attribution to ship on the page

- **GDP per capita** — Maddison Project Database, via Our World in Data.
- **Child mortality, energy use, CO₂, temperature anomaly, women in parliament,
  renewable share** — Our World in Data. Underlying sources vary (UN, World Bank,
  Energy Institute, Copernicus/ERA5, IPU). **Cite the underlying source shown on
  each OWID chart, not OWID alone.**
- **Temperature** — contains modified Copernicus Climate Change Service
  information.
- **Drought** — Chuphal, D. S., Kushwaha, A. P., Aadhar, S. & Mishra, V.
  *Drought Atlas of India*, Scientific Data 11:7 (2024). CC BY 4.0.
  doi:10.5281/zenodo.20368514

## Sources deliberately excluded

- **IITM** rainfall and temperature — licensed non-commercial research only, and
  TSOI may become commercial. Nothing here needs it.
- **IMD Data Supply Portal** (`dsp.imdpune.gov.in`) — terms forbid internet
  redistribution. Never procure from it.
- **Berkeley Earth** — CC BY-NC. Same trap as IITM.
- **IMD free gridded download** — states no licence at all.

Full reasoning: `tsoi-internal/docs/editorial/climate-flagship-data-sources.md`.
