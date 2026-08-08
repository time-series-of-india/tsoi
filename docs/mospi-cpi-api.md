# MoSPI CPI API notes

Verified against the live service on 2026-07-26. There **is** a published user
manual, and it is substantially out of date — following it will not work.
Recorded here because most of the failure modes return HTTP 200.

Base: `https://api.mospi.gov.in/api/cpi/`. **No authentication.** These are open
endpoints serving open government data; nothing is gated, and there is no access
control involved in reading them.

Licence: open government data published by the Ministry of Statistics and
Programme Implementation. Attribute to MoSPI.

## The three endpoints

| Endpoint | Base | Grain |
|---|---|---|
| `GET /api/cpi/getCPIIndex` | 2012 | state × sector × group × subgroup, monthly |
| `GET /api/cpi/getItemIndex` | 2012 | item, all-India, monthly |
| `GET /api/cpi/getCPIData` | **2024** | state × sector × full COICOP hierarchy, monthly |

**The first two are the 2012-base service and the third is the 2024-base
service.** They are separate handlers. `getCPIIndex` accepts `base_year=2024`
because the enum lists it and then returns `No Data Found`, which reads exactly
like "the new series is not published yet". It is published; it is just behind
`getCPIData`. See the section on it below.

The two 2012-base endpoints are documented here first because that is what
`etl/mospi/` currently loads.

Required on both: `base_year` (`2012` \| `2010` \| `2024`), `series`
(`Current` \| `Back`), `Format` (`JSON` \| `CSV`).

Optional filters, all taking comma-separated lists; **omitted means unfiltered**:
`year`, `month_code` (1–12), `state_code` (1–36, **99 = All India**),
`group_code`, `subgroup_code`, `sector_code` (1 rural, 2 urban, 3 combined).
Paging: `limit` (default **10**) and `page`.

```
GET /api/cpi/getCPIIndex?base_year=2012&series=Current&year=2025&Format=JSON&limit=40000
```

```json
{ "data": [ { "baseyear":"2012", "year":2025, "month":"December",
              "state":"All India", "sector":"Combined",
              "group":"General", "subgroup":"General-Overall",
              "index":"198.0", "inflation":"1.33", "status":"F" } ],
  "meta_data": { "page":1, "totalRecords":25884, "totalPages":1,
                 "recordPerPage":40000 },
  "msg": "Data fetched successfully", "statusCode": true }
```

`index` and `inflation` are **strings**, and are `null` where unpublished — the
first year of any series has a null `inflation` because there is no year-ago
base. `status` is `F` final / `P` provisional. Codes are never returned, only
display names; `etl/mospi/codes.py` maps them back.

## The trap: rate limiting returns an empty 200

There is no documented rate limit, and the service does **not** answer with
`429`. It answers with **an empty body and HTTP 200**. Four requests spaced eight
seconds apart came back blank; the same request after a longer idle succeeded.

Anything that trusts the status code will write nothing and report success. The
fetcher treats an empty or unparseable body as retryable, and distinguishes it
from the genuine empty result, which is well-formed:

```json
{"data":[],"msg":"No Data Found","statusCode":true}
```

Since a whole year fits in one response — 25,884 rows for 2025 in about three
seconds at `limit=40000` — the entire backfill is ~25 requests and a generous
delay costs nothing.

## What the published manual gets wrong

The [CPI API User Manual](https://api.mospi.gov.in/API/CPI%20API%20User%20Manual.pdf)
predates a restructuring of the platform.

| Manual says | Actually |
|---|---|
| `GET /api/getCPIIndex` | `GET /api/cpi/getCPIIndex`. The old path falls through to the portal's single-page app and returns **HTML with HTTP 200** |
| `POST /api/login` | `POST /api/users/login` (the old path is an Express 404) |
| Sign up, then a 15-minute token | **No auth at all** |
| Without a token you get 10 records | Default `limit` is 10; raise it and you get everything, anonymously |
| `Series=Current_series_2012` | `series=Current` plus a separate `base_year` |
| `Year`, `Month`, `State_code`, `Sector` | lowercase `year`, `month_code`, `state_code`, `sector_code` (`Format` keeps its capital) |
| No pagination | `limit` / `page`, plus a `meta_data` block |

The current contract is documented in the official MCP server's OpenAPI spec,
`swagger/swagger_user_cpi.yaml` in
[nso-india/esankhyiki-mcp](https://github.com/nso-india/esankhyiki-mcp). Trust
that over the PDF, and re-check it when something breaks.

The metadata workbook at `/API/CPI%20Metadata.xlsx` is still the 2012-base one,
but its code tables remain correct: 36 states + 99, 8 groups, 20 subgroups,
3 sectors, 299 items. It is embedded in `etl/mospi/codes.py`.

## Coverage, and the 2024 base

| Endpoint | base_year | series | Span | Rows |
|---|---|---|---|---|
| `getCPIIndex` | 2012 | Current | Jan 2013 – **Dec 2025** | 326,442 |
| `getCPIIndex` | 2012 | Back | Jan 2011 – May 2013 | 52,863 |
| `getItemIndex` | 2012 | Current | Jan 2014 – **Dec 2025** | 42,159 |
| `getCPIIndex` / `getItemIndex` | 2024 | either | — | **0 — misleading, see below** |
| `getCPIData` | **2024** | Current | **Jan 2025 – Jun 2026** | ~68,804 / month |

CPI was rebased from 2012=100 to 2024=100 with effect from January 2026. The
2012 series therefore **stops at December 2025** — that is the series ending by
design, not staleness, and every row of it is final (`status: F`).

The two series are **not comparable**: 6 groups became 12 divisions, 299 items
became 358, and the food weight fell from 45.86% to 36.75%. `base_year` and
`series` are part of the primary key so they can never silently merge. Jan–Dec
2025 exists on **both** bases, so linking factors can be computed from real
overlap rather than assumed.

## `getCPIData` — the 2024-base endpoint

Not in the PDF manual and **not in the MCP server's Swagger spec**. It is what
the eSankhyiki portal's own CPI explorer calls; found by reading the portal
bundle at `esankhyiki.mospi.gov.in/static/js/main.<hash>.js`. Companion
endpoints, same base: `/api/cpi/getCpiBaseYear` (lists valid base years, levels
and series) and `/api/cpi/getCpiFilterByLevelAndBaseYear` (valid years, months,
states and sectors for a given base — this is what reveals that 2024 has 2025
and 2026).

```
GET /api/cpi/getCPIData?base_year=2024&series=Current&level=Group
    &year=2026&month_code=6&state_code=1&sector_code=3&limit=100&page=1
```

```json
{ "base_year":"2024", "series":"Current", "year":"2026", "month":"June",
  "state":"Meghalaya", "sector":"Urban",
  "division":"Food and beverages", "group":"Food",
  "class":"Fruits and nuts", "sub_class":"Dates, figs and tropical fruits, fresh",
  "item":"Papaya", "code":"01.1.6.1.1.05",
  "index":"102.64", "inflation":"12.20", "imputation":"N" }
```

Differences from the 2012 endpoints that matter:

- **Five hierarchy levels**, not two: `division` → `group` → `class` →
  `sub_class` → `item`, with a dotted COICOP-2018 `code`. Rollup rows leave the
  deeper fields null. This does not fit the `mospi_cpi_index` schema.
- **Item indices are per state and per sector.** On the 2012 base they were
  All-India only. This is a genuine expansion of what is possible.
- **`limit` caps at 100**, not 40,000. Over it: `{"error":"Limit parameter too
  large. Maximum allowed is 100."}`. One month at group level is 68,804 rows,
  so ~688 requests; a full 18-month backfill is ~12,400 requests.
- **`imputation`** (`Y`/`N`) is new, flagging imputed rather than collected prices.
- `level` takes `Group` or `Item`, but both return the same 68,804-row set for a
  month — it appears to affect the portal's chart rendering, not the result set.

Bulk export exists but is **not a shortcut**:

```
GET /api/cpi/getCPIData?...&format=xlsx   →  {"file_path":"CPI/cpi_403.xlsx"}
GET /api/download/CPI/cpi_403.xlsx        →  the workbook
```

The workbook contains **division level only** (1,430 rows/month = 37 states × 3
sectors × 13 divisions, less Chandigarh rural). Good enough for the headline
contribution chart, useless for anything below division.

Verified against the June 2026 press release: All-India Combined General =
107.00, inflation 4.38%; Jan 2025 back-cast = 101.67 with null inflation. Both
match exactly.

### Two other routes to the same numbers

- **Data Catalogue** — `GET /api/esankhyiki/cms/golden-sheet/list?product=CPI&limit=600`
  returns 487 CPI entries, of which 24 are base-2024: the four press-release
  annexures as `.xlsx` for each of Jan–Jun 2026. Download via
  `/api/esankhyiki/file/download<file_path><file_name>`. Annexure IV is the
  All-India monthly time series, which is the single most useful file if only
  the headline is needed. Also carries Datawrapper and Flourish embed codes.
- **Press-release PDFs**, linked from each PIB release. Superseded by the above;
  no reason to parse them.

**2020 is thin by design.** Price collection was disrupted by the COVID
lockdown, and March–July 2020 carry far less than a normal month's 2,157 rows:

| Month | Rows | States |
|---|---|---|
| Mar 2020 | 192 | 37 |
| Apr 2020 | 84 | **1 — All India only** |
| May 2020 | 84 | **1 — All India only** |
| Jun 2020 | 183 | 34 |
| Jul 2020 | 192 | 37 |

So April and May 2020 have no state detail at all, and the surrounding months
publish only group-level aggregates rather than the full subgroup cross-section.
Any chart spanning 2020 must handle this explicitly — a state series will simply
have a hole, and a national one will thin out. Do not interpolate across it.
