import uuid
import json
import traceback
from datetime import datetime

import pandas as pd
from jobspy import scrape_jobs

from .database import get_connection
from .models import ScrapeRequest


def run_scrape(session_id: str, req: ScrapeRequest):
    con = get_connection()
    try:
        params = req.model_dump(exclude_none=True)

        search_term = params.get("search_term", "")

        # Log each proxy with a timestamp before the scrape starts
        if req.proxies:
            for proxy in req.proxies:
                con.execute(
                    "INSERT INTO proxy_log (proxy, session_id, used_at) VALUES (?, ?, current_timestamp)",
                    [proxy, session_id],
                )

        df = scrape_jobs(**params)

        # Filter titles using search_term as a regex pattern
        if search_term and not df.empty:
            df = df[df["title"].str.contains(search_term, case=False, regex=True, na=False)]

        if df.empty:
            con.execute(
                "UPDATE scrape_sessions SET status='completed', jobs_found=0, completed_at=current_timestamp WHERE id=?",
                [session_id],
            )
            return

        df["scraped_at"] = datetime.now()
        df["scrape_session_id"] = session_id

        # Ensure id column is string and unique
        df["id"] = df["id"].astype(str)

        # Deduplicate within the scraped batch (keep first per title+company+location)
        df = df.drop_duplicates(subset=["title", "company", "location"], keep="first")

        # Upsert by id: delete existing rows with same id
        ids = df["id"].tolist()
        placeholders = ",".join(["?"] * len(ids))
        con.execute(f"DELETE FROM jobs WHERE id IN ({placeholders})", ids)

        # Also remove existing rows that match on title+company+location (cross-site/session dupes)
        dedup_keys = df[["title", "company", "location"]].fillna("").apply(lambda r: (r["title"].lower(), r["company"].lower(), r["location"].lower()), axis=1).tolist()
        for t, c, l in dedup_keys:
            con.execute(
                "DELETE FROM jobs WHERE LOWER(COALESCE(title,''))=? AND LOWER(COALESCE(company,''))=? AND LOWER(COALESCE(location,''))=?",
                [t, c, l],
            )

        # Align columns with table schema
        table_cols = [row[0] for row in con.execute("DESCRIBE jobs").fetchall()]
        for col in table_cols:
            if col not in df.columns:
                df[col] = None
        df_insert = df[[c for c in table_cols if c in df.columns]]

        con.execute("INSERT INTO jobs SELECT * FROM df_insert")

        count = len(df)
        con.execute(
            "UPDATE scrape_sessions SET status='completed', jobs_found=?, completed_at=current_timestamp WHERE id=?",
            [count, session_id],
        )
    except Exception as e:
        con.execute(
            "UPDATE scrape_sessions SET status='failed', error_message=?, completed_at=current_timestamp WHERE id=?",
            [f"{e}\n{traceback.format_exc()}"[:2000], session_id],
        )
    finally:
        con.close()


def create_session(req: ScrapeRequest) -> str:
    session_id = str(uuid.uuid4())
    con = get_connection()
    con.execute(
        "INSERT INTO scrape_sessions (id, search_term, location, status, parameters) VALUES (?, ?, ?, 'running', ?)",
        [session_id, req.search_term, req.location, json.dumps(req.model_dump(exclude_none=True))],
    )
    con.close()
    return session_id
