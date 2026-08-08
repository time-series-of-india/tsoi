-- DDL for the Labour Bureau CPI-IW table.
-- Run after init-economy-dev.sql which creates the schema itself.
-- Usage: docker exec infra-timescale-1 psql -U admin -d npci -f /tmp/init-economy-dev-cpi-iw.sql

-- All-India Consumer Price Index for Industrial Workers, monthly general index.
--
-- Raw as published: one row per (month, base). The four bases are separate
-- scales and are NOT comparable to each other — 1988-09 on 1960=100 is 806
-- and 1988-10 on 1982=100 is 167, the same price level counted twice. Linking
-- them into one continuous index needs the Labour Bureau's published linking
-- factors and is done in site/scripts/build-inflation-peaks.mjs, where the
-- seams are validated and the splice is disclosed to the reader.
--
-- base_year is text, not integer, because it names a base ('1960' = the
-- 1960=100 scale) rather than measuring anything.
CREATE TABLE IF NOT EXISTS economy_dev.cpi_iw_index (
    date        date    NOT NULL,
    base_year   text    NOT NULL,
    index_value numeric,
    PRIMARY KEY (date, base_year)
);

CREATE INDEX IF NOT EXISTS cpi_iw_index_date_idx ON economy_dev.cpi_iw_index (date DESC);
