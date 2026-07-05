#!/usr/bin/env python3
"""Load UPI app statistics from raw_apps/ into {SCHEMA_NAME}.upi_app_statistics."""
import csv
import json
import os
import re
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from pathlib import Path

SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")

MONTHS = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,
          "Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}

# Maps raw NPCI names (after # stripping) to canonical names.
# NPCI inconsistently changes capitalisation, spacing, and adds ' #' suffix to PSP apps.
_NAME_MAP = {
    # Case / capitalisation
    "Au Small Finance Bank Apps":   "AU Small Finance Bank Apps",
    "Fino Payments bank App":       "Fino Payments Bank Apps",
    "Fino Payments bank Apps":      "Fino Payments Bank Apps",
    "JAR":                          "Jar",
    "KIWI":                         "Kiwi",
    "OBOPAY":                       "Obopay",
    "OMNI":                         "OmniCard",
    "RBLBANK":                      "RBL Bank Apps",
    "SBI Bank Apps":                "State Bank of India Apps",
    "SLICE":                        "Slice",
    "Phonepe":                      "PhonePe",
    "Whatsapp":                     "WhatsApp",
    "slice":                        "Slice",
    # Spacing / punctuation
    "Go Kiwi":                      "GoKiwi",
    "Gokiwi":                       "GoKiwi",
    "Kredit.Pe":                    "Kredit Pe",
    "MakeMy Trip":                  "MakeMyTrip",
    "Omni Card":                    "OmniCard",
    "Omnicard":                     "OmniCard",
    "Paytm (OCL )":                 "Paytm (OCL)",
    "Phone Pe":                     "PhonePe",
    "Shri Ram One":                 "Shriram One",
    "Tata Neu":                     "TataNeu",
    # Bank: "App" → "Apps"
    "AU Small Finance Bank App":    "AU Small Finance Bank Apps",
    "Allahabad Bank App":           "Allahabad Bank Apps",
    "Bank of India App":            "Bank of India Apps",
    "Bank of Maharashtra App":      "Bank of Maharashtra Apps",
    "Canara Bank App":              "Canara Bank Apps",
    "Central Bank of India App":    "Central Bank of India Apps",
    "Citi Bank App":                "Citi Bank Apps",
    "City Union Bank App":          "City Union Bank Apps",
    "DBS Bank Apps":                "DBS Digibank Apps",
    "DBS Digibank App":             "DBS Digibank Apps",
    "Deutsche Bank App":            "Deutsche Bank Apps",
    "Dhanlaxmi Bank App":           "Dhanlaxmi Bank Apps",
    "Federal Bank App":             "Federal Bank Apps",
    "HSBC Bank App":                "HSBC Bank Apps",
    "IDBI Bank App":                "IDBI Bank Apps",
    "IDFC Bank App":                "IDFC Bank Apps",
    "IDFC First Bank Apps":         "IDFC Bank Apps",
    "India Post Payments Bank App": "India Post Payments Bank Apps",
    "Indian Bank App":              "Indian Bank Apps",
    "IndusInd Bank App":            "IndusInd Bank Apps",
    "Jammu and Kashmir Bank App":   "Jammu and Kashmir Bank Apps",
    "Jio Payments Bank App":        "Jio Payments Bank Apps",
    "Karnataka Bank App":           "Karnataka Bank Apps",
    "Karur Vysya Bank App":         "Karur Vysya Bank Apps",
    "NSDL Payments Bank App":       "NSDL Payments Bank Apps",
    "Punjab National Bank App":     "Punjab National Bank Apps",
    "RBL Bank App":                 "RBL Bank Apps",
    "South Indian Bank App":        "South Indian Bank Apps",
    "Standard Chartered Bank App":  "Standard Chartered Bank Apps",
    "UCO Bank App":                 "UCO Bank Apps",
    # Other canonical fixes
    "Equitas Small Apps":           "Equitas Small Finance Bank Apps",
    "Janta Sahakari Bank App":      "Janata Sahakari Bank Apps",
    "Punjab And Sind Bank Apps":    "Punjab Sind Bank Apps",
    "Punjab Sindh Bank App":        "Punjab Sind Bank Apps",
    "Punjab Sindh Bank Apps":       "Punjab Sind Bank Apps",
    "Union Bank Of India Apps":     "Union Bank Apps",
    # Casing fixes
    "Aditya Birla Capital Digital Limited": "Aditya Birla Capital Digital",
    "CBDC Apps":                    "CBDC",
    "Dena Bank App":                "Dena Bank Apps",
    "DHANI":                        "Dhani",
    "DIGIKHATA":                    "Digikhata",
    "EROUTE":                       "Eroute",
    "Freo Money":                   "Freo",
    "Go Niyo":                      "GoNiyo",
    "INDIE - Indus Ind":            "INDIE",
    "LivQuick PPI":                 "LivQuik Apps",
    "Omnicard PPI":                 "OmniCard PPI",
    "Other":                        "Others",
    "Other Apps":                   "Others",
    "PAYTMWALLET":                  "Paytm Wallet",
    "Paytm Payments Bank App":      "Paytm Payments Bank Apps",
    "PINELABS":                     "Pine Labs",
    "Rapipay":                      "Rapi Pay",
    "SHRIRAM":                      "Shriram One",
    "Shriram":                      "Shriram One",
    "SURYODAY":                     "Suryoday Bank Apps",
    "Suryoday":                     "Suryoday Bank Apps",
    # Jupiter variants
    "Jupiter Edge (LivQuick PPI App)": "Jupiter Edge",
    "Jupiter Edge (LivQuick PPI)":  "Jupiter Edge",
    "Jupiter Money":                "Jupiter",
    # FamPay variants (all non-PPI → FamPay; PPI stays separate)
    "FAM":                          "FamPay",
    "Fam App by Trio":              "FamPay",
    "Fam Pay by Trio":              "FamPay",
    "FamApp by Trio":               "FamPay",
    "FamPay by Trio":               "FamPay",
    "Fampay":                       "FamPay",
    "Fampay by Trio":               "FamPay",
    "Fampay PPI":                   "FamPay PPI",
}

def normalize_app_name(name: str) -> str:
    """Strip NPCI's trailing ' #' PSP marker and apply canonical name mapping."""
    name = re.sub(r"\s*#\s*$", "", name).strip()
    name = re.sub(r"\s+", " ", name)
    return _NAME_MAP.get(name, name)

def _f(v):
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None

def _to_float(v):
    return float(v) if v not in (None, "") else None

def _to_int(v):
    return int(float(v)) if v not in (None, "") else None

def aggregate_rows(rows):
    """Merge rows sharing (app_name, date) after normalization. Volumes/values summed; rank kept minimum."""
    from collections import defaultdict
    groups = defaultdict(list)
    for r in rows:
        groups[(r["app_name"], r["date"])].append(r)

    result = []
    vol_val_cols = [
        "cit_volume_mn", "cit_value_cr",
        "b2c_volume_mn", "b2c_value_cr",
        "b2b_volume_mn", "b2b_value_cr",
        "onus_volume_mn", "onus_value_cr",
        "total_volume_mn", "total_value_cr",
    ]
    for (app, date), group in sorted(groups.items()):
        if len(group) == 1:
            result.append(group[0])
            continue
        ranks = [_f(r["rank"]) for r in group if _f(r["rank"]) is not None]
        merged = {"app_name": app, "date": date, "rank": int(min(ranks)) if ranks else ""}
        for col in vol_val_cols:
            vals = [_f(r[col]) for r in group if _f(r[col]) is not None]
            merged[col] = str(sum(vals)) if vals else ""
        result.append(merged)
    return result

def parse_num(v):
    if v in (None, "-", ""):
        return ""
    try:
        return str(float(str(v).replace(",", "")))
    except ValueError:
        return ""

raw_dir = Path(__file__).parent / "raw_apps"
csv_path = Path(__file__).parent / "upi_app_stats.csv"

cols = [
    "app_name", "date", "rank",
    "cit_volume_mn", "cit_value_cr",
    "b2c_volume_mn", "b2c_value_cr",
    "b2b_volume_mn", "b2b_value_cr",
    "onus_volume_mn", "onus_value_cr",
    "total_volume_mn", "total_value_cr",
]

rows = []
for f in sorted(raw_dir.glob("*.json")):
    year, month = f.stem.split("_")
    date = f"{year}-{MONTHS[month]:02d}-01"
    with open(f) as fp:
        month_data = json.load(fp)
    for r in month_data:
        rows.append({
            "app_name":      normalize_app_name(r.get("application_name", "")),
            "date":          date,
            "rank":          r.get("srno", ""),
            "cit_volume_mn": parse_num(r.get("customer_initiated_transactions_volume_mn")),
            "cit_value_cr":  parse_num(r.get("customer_initiated_transactions_value_cr")),
            "b2c_volume_mn": parse_num(r.get("b_2_c_transactions_volume_mn")),
            "b2c_value_cr":  parse_num(r.get("b_2_c_transactions_value_cr")),
            "b2b_volume_mn": parse_num(r.get("b_2_b_transactions_volume_mn")),
            "b2b_value_cr":  parse_num(r.get("b_2_b_transactions_value_cr")),
            "onus_volume_mn":parse_num(r.get("onus_transactions_volume_mn")),
            "onus_value_cr": parse_num(r.get("onus_transactions_value_cr")),
            "total_volume_mn":parse_num(r.get("total_volume_mn")),
            "total_value_cr": parse_num(r.get("total_value_cr")),
        })

rows = aggregate_rows(rows)

with open(csv_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)
print(f"Parsed {len(rows)} rows → {csv_path}")


def load_to_db(rows):
    conn = psycopg2.connect(
        host="localhost", user="admin",
        password=os.environ["DB_PASSWORD"], dbname="npci", port=5432
    )
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql.SQL("""
                    CREATE TABLE IF NOT EXISTS {} (
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
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_app_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_app_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (app_name, date, rank,
                        cit_volume_mn, cit_value_cr, b2c_volume_mn, b2c_value_cr,
                        b2b_volume_mn, b2b_value_cr, onus_volume_mn, onus_value_cr,
                        total_volume_mn, total_value_cr)
                    VALUES %s
                    ON CONFLICT (app_name, date) DO UPDATE SET
                        rank            = EXCLUDED.rank,
                        cit_volume_mn   = EXCLUDED.cit_volume_mn,
                        cit_value_cr    = EXCLUDED.cit_value_cr,
                        b2c_volume_mn   = EXCLUDED.b2c_volume_mn,
                        b2c_value_cr    = EXCLUDED.b2c_value_cr,
                        b2b_volume_mn   = EXCLUDED.b2b_volume_mn,
                        b2b_value_cr    = EXCLUDED.b2b_value_cr,
                        onus_volume_mn  = EXCLUDED.onus_volume_mn,
                        onus_value_cr   = EXCLUDED.onus_value_cr,
                        total_volume_mn = EXCLUDED.total_volume_mn,
                        total_value_cr  = EXCLUDED.total_value_cr
                """).format(table)

                values = [
                    (
                        r["app_name"], r["date"], _to_int(r["rank"]),
                        _to_float(r["cit_volume_mn"]), _to_float(r["cit_value_cr"]),
                        _to_float(r["b2c_volume_mn"]), _to_float(r["b2c_value_cr"]),
                        _to_float(r["b2b_volume_mn"]), _to_float(r["b2b_value_cr"]),
                        _to_float(r["onus_volume_mn"]), _to_float(r["onus_value_cr"]),
                        _to_float(r["total_volume_mn"]), _to_float(r["total_value_cr"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_app_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_app_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = psycopg2.connect(
    host="localhost", user="admin",
    password=os.environ["DB_PASSWORD"], dbname="npci", port=5432
)
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT min(date), max(date), count(*) AS rows, count(DISTINCT app_name) AS apps FROM {}").format(
                sql.Identifier(SCHEMA_NAME, "upi_app_statistics")
            )
        )
        row = cur.fetchone()
        print(f"  min_date={row[0]}, max_date={row[1]}, rows={row[2]}, apps={row[3]}")
finally:
    conn.close()
