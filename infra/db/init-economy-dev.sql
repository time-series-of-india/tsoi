-- Dev schema that mirrors the production 'economy' schema.
-- Run this on a fresh TimescaleDB instance before running the ETL in dev mode.
-- Usage: docker exec infra-timescale-1 psql -U admin -d npci -f /path/to/init-economy-dev.sql
-- (or paste contents directly into psql)

CREATE SCHEMA IF NOT EXISTS economy_dev;

CREATE TABLE IF NOT EXISTS economy_dev.payment_statistics (
    product      character varying NOT NULL,
    category     character varying,
    sub_category character varying,
    volume       numeric,
    value        numeric,
    date         date NOT NULL,
    PRIMARY KEY (product, date)
);
