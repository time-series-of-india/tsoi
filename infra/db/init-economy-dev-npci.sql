-- DDL for economy_dev NPCI tables.
-- Run after init-economy-dev.sql which creates the schema itself.
-- Usage: docker exec infra-timescale-1 psql -U admin -d npci -f /tmp/init-economy-dev-npci.sql

-- UPI App Statistics — PK is (app_name, date); rank is a metric column (nullable)
CREATE TABLE IF NOT EXISTS economy_dev.upi_app_statistics (
    app_name        text    NOT NULL,
    date            date    NOT NULL,
    rank            integer,
    cit_volume_mn   numeric,
    cit_value_cr    numeric,
    b2c_volume_mn   numeric,
    b2c_value_cr    numeric,
    b2b_volume_mn   numeric,
    b2b_value_cr    numeric,
    onus_volume_mn  numeric,
    onus_value_cr   numeric,
    total_volume_mn numeric,
    total_value_cr  numeric,
    PRIMARY KEY (app_name, date)
);

-- UPI Bank Statistics (remitter/beneficiary) — PK same as rbi schema
CREATE TABLE IF NOT EXISTS economy_dev.upi_bank_statistics (
    bank_name                  text    NOT NULL,
    type_name                  text    NOT NULL,
    date                       date    NOT NULL,
    rank                       integer,
    volume_mn                  numeric,
    approved_pct               numeric,
    bd_pct                     numeric,
    td_pct                     numeric,
    deemed_approved_pct        numeric,
    debit_reversal_mn          numeric,
    debit_reversal_success_pct numeric,
    PRIMARY KEY (bank_name, type_name, date)
);

-- IMPS Bank Performance — launch-dashboard-critical table; PK same as rbi schema
CREATE TABLE IF NOT EXISTS economy_dev.imps_bank_performance (
    date                date NOT NULL,
    bank_name           text NOT NULL,
    rank                integer,
    volume_mn           numeric,
    approved_pct        numeric,
    bd_pct              numeric,
    td_pct              numeric,
    deemed_approved_pct numeric,
    PRIMARY KEY (date, bank_name)
);

-- UPI MCC Statistics — PK same as rbi schema
CREATE TABLE IF NOT EXISTS economy_dev.upi_mcc_statistics (
    date          date  NOT NULL,
    mcc           text  NOT NULL,
    category_type text,
    description   text,
    volume_mn     numeric,
    value_cr      numeric,
    PRIMARY KEY (date, mcc)
);

-- UPI P2P/P2M Statistics — PK same as rbi schema
CREATE TABLE IF NOT EXISTS economy_dev.upi_p2p_p2m_statistics (
    date            date    PRIMARY KEY,
    total_volume_mn numeric,
    total_value_cr  numeric,
    p2p_volume_mn   numeric,
    p2p_value_cr    numeric,
    p2m_volume_mn   numeric,
    p2m_value_cr    numeric
);

-- UPI PSP Statistics (payer/payee) — PK same as rbi schema
CREATE TABLE IF NOT EXISTS economy_dev.upi_psp_statistics (
    psp_name      text    NOT NULL,
    type_name     text    NOT NULL,
    date          date    NOT NULL,
    rank          integer,
    volume_mn     numeric,
    approved_pct  numeric,
    bd_pct        numeric,
    td_pct        numeric,
    PRIMARY KEY (psp_name, type_name, date)
);

-- UPI State-wise Statistics — PK same as rbi schema
CREATE TABLE IF NOT EXISTS economy_dev.upi_statewise_statistics (
    date                    date NOT NULL,
    state                   text NOT NULL,
    rank                    integer,
    volume_mn               numeric,
    volume_contribution_pct numeric,
    value_cr                numeric,
    value_contribution_pct  numeric,
    PRIMARY KEY (date, state)
);

-- UPI Top-50 Vol/Val Statistics — PK changed from rbi schema:
-- rbi: (date, rank)  economy_dev: (date, bank_name) — semantically cleaner after aggregation
CREATE TABLE IF NOT EXISTS economy_dev.upi_top50_vol_val_statistics (
    date      date NOT NULL,
    bank_name text NOT NULL,
    rank      integer,
    volume_mn numeric,
    value_cr  numeric,
    PRIMARY KEY (date, bank_name)
);
