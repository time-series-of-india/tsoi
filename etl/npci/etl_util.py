"""Shared DB connection + row-hygiene helpers for the NPCI loaders."""
import os
import psycopg2


def connect():
    """DB connection with env overrides so loaders can target another host
    (e.g. the canonical DB over an SSH tunnel via DB_HOST/DB_PORT) instead of
    only the local compose DB."""
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "5432")),
        user=os.environ.get("DB_USER", "admin"),
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ.get("DB_NAME", "npci"),
    )


def drop_exact_duplicates(rows, label=""):
    """Drop rows identical in every field, keeping the first.

    NPCI double-loads some months in its DB; an identical row is a re-listing,
    not additive volume, so summing it double-counts. The IMPS loader has
    always deduped its input — this makes that policy shared. Rows colliding
    on a key with *different* values are left for each loader's
    aggregate_rows(), which logs what it merges.
    """
    seen = set()
    out = []
    for r in rows:
        k = tuple(sorted(r.items()))
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
    dropped = len(rows) - len(out)
    if dropped:
        print(f"  dropped {dropped} exact-duplicate rows{f' ({label})' if label else ''}")
    return out
