-- MoSPI CPI, 2024=100 base series (COICOP-2018).
--
-- Separate table from mospi_cpi_index on purpose. The 2012 series has two
-- hierarchy levels (group, subgroup); this one has five (division, group,
-- class, sub_class, item) and is not comparable to it -- different basket
-- (358 items vs 299), different weights (HCES 2023-24), different method.
-- Splicing the two is an explicit editorial act, never an implicit join.
--
-- Source: GET /api/cpi/getCPIData, which is documented in neither the PDF
-- manual nor MoSPI's own Swagger spec. See docs/mospi-cpi-api.md.
--
--   psql -h localhost -U admin -d npci -f init-economy-dev-mospi-cpi-2024.sql

CREATE SCHEMA IF NOT EXISTS economy_dev;

CREATE TABLE IF NOT EXISTS economy_dev.mospi_cpi_coicop (
    date          date NOT NULL,   -- first of the reported month
    base_year     text NOT NULL,   -- '2024'
    series        text NOT NULL,   -- 'Current' | 'Back'
    state         text NOT NULL,   -- 'All India' is a value here, not code 99
    sector        text NOT NULL,   -- 'Rural' | 'Urban' | 'Combined'

    -- Dotted COICOP-2018 code, e.g. '01' Food and beverages, '01.1.6.1.1.05'
    -- Papaya. The CPI (General) rollup has no code upstream and is stored as
    -- 'GEN' so it can sit in the primary key.
    code          text NOT NULL,

    -- The five hierarchy levels, null below whatever level a row rolls up to.
    -- "group" and "class" are reserved words, hence the suffixes.
    division      text,
    group_name    text,
    class_name    text,
    sub_class     text,
    item          text,

    index_value   numeric,         -- "index" is a reserved word
    inflation     numeric,         -- null for 2025: no year-ago base yet
    imputation    text,            -- 'Y' | 'N' -- imputed vs collected price

    state_code    integer,
    sector_code   integer,

    PRIMARY KEY (date, base_year, series, state, sector, code)
);

SELECT create_hypertable('economy_dev.mospi_cpi_coicop', 'date',
    chunk_time_interval => INTERVAL '1 year', if_not_exists => TRUE);

-- The two access patterns: a series for one node, and a cross-section of one
-- month. The primary key already covers (date, ...) prefix lookups.
CREATE INDEX IF NOT EXISTS mospi_cpi_coicop_code_idx
    ON economy_dev.mospi_cpi_coicop (code, state, sector, date DESC);
CREATE INDEX IF NOT EXISTS mospi_cpi_coicop_item_idx
    ON economy_dev.mospi_cpi_coicop (item, date DESC) WHERE item IS NOT NULL;
