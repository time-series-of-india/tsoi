-- DDL for economy_dev MoSPI Consumer Price Index.
-- Run after init-economy-dev.sql which creates the schema itself.
-- Usage: docker exec infra-timescale-1 psql -U admin -d npci -f /tmp/init-economy-dev-mospi-cpi.sql

-- Official CPI index and inflation from the MoSPI API platform
-- (api.mospi.gov.in/api/cpi/, no authentication). Open government data; the
-- endpoint is public and documented, with no access control involved. See
-- docs/mospi-cpi-api.md for the contract and its failure modes.
--
-- The API reports year plus a month NAME; the loader resolves both to a real
-- date at the first of the month, so these tables join directly to the other
-- price tables on a shared calendar.
--
-- base_year and series sit INSIDE the primary key on purpose. CPI was rebased
-- from 2012=100 to 2024=100 with effect from January 2026, and the two series
-- are not comparable: 6 groups became 12 categories, 299 items became 358, and
-- the food weight fell from 45.86% to 36.75%. Keeping both in the key means the
-- series can coexist, can never silently overwrite one another, and can never
-- be joined across the seam without saying so explicitly in the query.
--
-- As of 2026-07-26 the 2012 base runs Jan 2013 - Dec 2025 (plus a Back series
-- covering 2011-2013) and every row is final. The 2024 base is a valid
-- parameter value that returns no data at all: MoSPI publishes it by press
-- release but does not yet serve it here.

-- Group and subgroup level, by state and sector.
CREATE TABLE IF NOT EXISTS economy_dev.mospi_cpi_index (
    date          date NOT NULL,   -- first of the reported month
    base_year     text NOT NULL,   -- '2012' | '2010' | '2024'
    series        text NOT NULL,   -- 'Current' | 'Back'
    state         text NOT NULL,   -- 'All India' for the national series
    sector        text NOT NULL,   -- 'Rural' | 'Urban' | 'Combined'
    cpi_group     text NOT NULL,   -- "group" is a reserved word
    subgroup      text NOT NULL,
    index_value   numeric,         -- "index" is a reserved word; null where unpublished
    inflation     numeric,         -- y/y %, null for the first year of a series
    status        text,            -- 'F' final | 'P' provisional
    state_code    integer,         -- resolved from the metadata workbook, for stable joins
    group_code    integer,
    subgroup_code text,            -- dotted, e.g. '1.1.07' for Vegetables
    PRIMARY KEY (date, base_year, series, state, sector, cpi_group, subgroup)
);

-- Yearly chunks: this is monthly data at ~2,157 rows per month, so a monthly
-- chunk interval would be needlessly small.
SELECT create_hypertable(
    'economy_dev.mospi_cpi_index', 'date',
    chunk_time_interval => INTERVAL '1 year',
    if_not_exists => TRUE
);

-- The two access patterns: a national series for one subgroup over time, and a
-- state cross-section for one month.
CREATE INDEX IF NOT EXISTS mospi_cpi_index_subgroup_date
    ON economy_dev.mospi_cpi_index (subgroup, sector, date DESC);
CREATE INDEX IF NOT EXISTS mospi_cpi_index_state_date
    ON economy_dev.mospi_cpi_index (state, date DESC);


-- Item level, all-India only on the 2012 base (the API exposes no state
-- parameter for items until the 2024 base, which carries state_code and
-- sector_code but currently serves nothing).
CREATE TABLE IF NOT EXISTS economy_dev.mospi_cpi_item_index (
    date        date NOT NULL,
    base_year   text NOT NULL,
    series      text NOT NULL,
    item        text NOT NULL,   -- display name; the API returns no item code
    index_value numeric,
    inflation   numeric,
    status      text,
    item_code   text,            -- resolved from the metadata workbook where the name matches
    PRIMARY KEY (date, base_year, series, item)
);

SELECT create_hypertable(
    'economy_dev.mospi_cpi_item_index', 'date',
    chunk_time_interval => INTERVAL '1 year',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS mospi_cpi_item_index_item_date
    ON economy_dev.mospi_cpi_item_index (item, date DESC);
