
import os
import psycopg2
from psycopg2 import sql
import json
from datetime import datetime

SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")

def parse_item(item):
    """Parse a JSON record into typed fields. Returns (product, category, sub_category, volume, value, date) or raises."""
    product = item['Product']
    category = item['Category']
    sub_category = item['Sub-Category']

    try:
        volume = 0 if item['Volume'] == 'h' else float(item['Volume'])
    except ValueError:
        print(f"Invalid volume for {item}, using 0")
        volume = 0

    try:
        value = 0 if item['Value'] == 'h' else float(item['Value'])
    except ValueError:
        print(f"Invalid value for {item}, using 0")
        value = 0

    date = datetime(int(item['Year']), datetime.strptime(item['Month'], "%B").month, int(item['Day']))
    return product, category, sub_category, volume, value, date

def load_data(file_path):
    with open(file_path, 'r') as file:
        data_list = json.load(file)

    conn = None
    try:
        conn = psycopg2.connect(
            host="localhost",
            user="admin",
            password=os.environ["DB_PASSWORD"],
            dbname="npci",
            port=5432
        )

        # Build the table identifier once using psycopg2.sql to prevent SQL injection
        # from SCHEMA_NAME being interpolated directly into a query string.
        # ON CONFLICT (product, date) is correct: every product maps to exactly one
        # (category, sub_category) pair in the source data (verified against both
        # rbi and economy_dev schemas — 18 products, each with a unique category).
        table = sql.Identifier(SCHEMA_NAME, "payment_statistics")
        insert_query = sql.SQL(
            "INSERT INTO {} "
            "(product, category, sub_category, volume, value, date) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (product, date) "
            "DO UPDATE SET "
            "  category     = EXCLUDED.category, "
            "  sub_category = EXCLUDED.sub_category, "
            "  volume       = EXCLUDED.volume, "
            "  value        = EXCLUDED.value"
        ).format(table)

        processed = errors = 0
        for item in data_list:
            try:
                product, category, sub_category, volume, value, date = parse_item(item)

                with conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            insert_query,
                            (product, category, sub_category, volume, value, date)
                        )
                processed += 1
            except Exception as e:
                print(f"Warning: Failed to insert record. Item: {item} Error: {e}")
                errors += 1

        print(f"Done — processed: {processed}, errors: {errors}")
    finally:
        if conn is not None:
            conn.close()
