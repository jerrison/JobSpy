import math
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import Optional

from .database import get_connection
from .models import ScrapeRequest, ScrapeResponse, ScrapeStatus, JobStats, ProxyLogEntry
from .services import create_session, run_scrape

US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY", "DC",
}

COUNTRY_ALIASES = {
    "US": "United States", "USA": "United States", "UNITED STATES": "United States",
    "UNITED STATES OF AMERICA": "United States",
    "UK": "United Kingdom", "UNITED KINGDOM": "United Kingdom", "GREAT BRITAIN": "United Kingdom",
    "GB": "United Kingdom",
    "CA": "Canada", "CANADA": "Canada",
    "IN": "India", "INDIA": "India",
    "AU": "Australia", "AUSTRALIA": "Australia",
    "DE": "Germany", "GERMANY": "Germany",
    "FR": "France", "FRANCE": "France",
    "SG": "Singapore", "SINGAPORE": "Singapore",
    "JP": "Japan", "JAPAN": "Japan",
    "BR": "Brazil", "BRAZIL": "Brazil",
    "NL": "Netherlands", "NETHERLANDS": "Netherlands",
    "IE": "Ireland", "IRELAND": "Ireland",
    "IL": "Israel", "ISRAEL": "Israel",
    "AE": "UAE", "UAE": "UAE", "UNITED ARAB EMIRATES": "UAE",
    "CN": "China", "CHINA": "China",
    "KR": "South Korea", "SOUTH KOREA": "South Korea",
    "ES": "Spain", "SPAIN": "Spain",
    "IT": "Italy", "ITALY": "Italy",
    "SE": "Sweden", "SWEDEN": "Sweden",
    "CH": "Switzerland", "SWITZERLAND": "Switzerland",
    "PL": "Poland", "POLAND": "Poland",
    "MX": "Mexico", "MEXICO": "Mexico",
    "PH": "Philippines", "PHILIPPINES": "Philippines",
    "BD": "Bangladesh", "BANGLADESH": "Bangladesh",
    "PK": "Pakistan", "PAKISTAN": "Pakistan",
}


def normalize_country(raw: str) -> str:
    val = raw.strip().upper()
    if val in COUNTRY_ALIASES:
        return COUNTRY_ALIASES[val]
    if val in US_STATES:
        return "United States"
    # Return title-cased original if no mapping found
    return raw.strip().title()


router = APIRouter(prefix="/api/v1/jobs")


@router.post("/scrape", response_model=ScrapeResponse)
def start_scrape(req: ScrapeRequest, bg: BackgroundTasks):
    session_id = create_session(req)
    bg.add_task(run_scrape, session_id, req)
    return ScrapeResponse(session_id=session_id, status="running")


@router.get("/scrape/{session_id}", response_model=ScrapeStatus)
def scrape_status(session_id: str):
    con = get_connection()
    row = con.execute(
        "SELECT id, status, jobs_found, error_message FROM scrape_sessions WHERE id=?",
        [session_id],
    ).fetchone()
    if not row:
        con.close()
        raise HTTPException(404, "Session not found")
    proxy_rows = con.execute(
        "SELECT proxy, used_at, session_id FROM proxy_log WHERE session_id=? ORDER BY used_at",
        [session_id],
    ).fetchall()
    con.close()
    proxies_used = [
        ProxyLogEntry(proxy=r[0], used_at=str(r[1]), session_id=r[2], search_term=None)
        for r in proxy_rows
    ] if proxy_rows else None
    return ScrapeStatus(session_id=row[0], status=row[1], jobs_found=row[2], error_message=row[3], proxies_used=proxies_used)


@router.get("/stats", response_model=JobStats)
def job_stats():
    con = get_connection()
    total = con.execute("SELECT count(*) FROM jobs").fetchone()[0]
    by_site_rows = con.execute("SELECT site, count(*) FROM jobs GROUP BY site").fetchall()
    by_country_raw = con.execute(
        "SELECT TRIM(SPLIT_PART(location, ',', -1)), count(*) FROM jobs "
        "WHERE location IS NOT NULL AND location != '' "
        "GROUP BY 1"
    ).fetchall()
    by_country: dict[str, int] = {}
    for raw, count in by_country_raw:
        if not raw:
            continue
        name = normalize_country(raw)
        by_country[name] = by_country.get(name, 0) + count
    by_country = dict(sorted(by_country.items(), key=lambda x: x[1], reverse=True))
    remote = con.execute("SELECT count(*) FROM jobs WHERE is_remote = true").fetchone()[0]
    with_salary = con.execute("SELECT count(*) FROM jobs WHERE min_amount IS NOT NULL OR max_amount IS NOT NULL").fetchone()[0]
    sessions = con.execute("SELECT count(*) FROM scrape_sessions").fetchone()[0]
    con.close()
    return JobStats(
        total_jobs=total,
        by_site=dict(by_site_rows),
        by_country=by_country,
        remote_count=remote,
        with_salary_count=with_salary,
        total_sessions=sessions,
    )


@router.get("/proxy-log")
def get_proxy_log():
    con = get_connection()
    rows = con.execute(
        "SELECT pl.proxy, pl.used_at, pl.session_id, ss.search_term "
        "FROM proxy_log pl LEFT JOIN scrape_sessions ss ON pl.session_id = ss.id "
        "ORDER BY pl.used_at DESC"
    ).fetchall()
    con.close()
    return [
        {"proxy": r[0], "used_at": str(r[1]), "session_id": r[2], "search_term": r[3]}
        for r in rows
    ]


@router.get("")
def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    site: Optional[str] = None,
    search: Optional[str] = None,
    is_remote: Optional[bool] = None,
    has_salary: Optional[bool] = None,
    country: Optional[str] = None,
    sort_by: str = "scraped_at",
    sort_order: str = "desc",
    session_id: Optional[str] = None,
):
    con = get_connection()
    conditions = []
    params = []

    if site:
        conditions.append("site = ?")
        params.append(site)
    if search:
        conditions.append("(title ILIKE ? OR company ILIKE ?)")
        params += [f"%{search}%", f"%{search}%"]
    if is_remote is not None:
        conditions.append("is_remote = ?")
        params.append(is_remote)
    if has_salary:
        conditions.append("(min_amount IS NOT NULL OR max_amount IS NOT NULL)")
    if country:
        # Find all raw suffixes that normalize to this country name
        all_locs = con.execute(
            "SELECT DISTINCT TRIM(SPLIT_PART(location, ',', -1)) FROM jobs "
            "WHERE location IS NOT NULL AND location != ''"
        ).fetchall()
        matching = [r[0] for r in all_locs if r[0] and normalize_country(r[0]) == country]
        if matching:
            placeholders = ",".join(["?"] * len(matching))
            conditions.append(f"UPPER(TRIM(SPLIT_PART(location, ',', -1))) IN ({placeholders})")
            params += [m.strip().upper() for m in matching]
        else:
            conditions.append("1=0")
    if session_id:
        conditions.append("scrape_session_id = ?")
        params.append(session_id)

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""

    allowed_sorts = {"scraped_at", "date_posted", "title", "company", "site", "min_amount"}
    sb = sort_by if sort_by in allowed_sorts else "scraped_at"
    so = "ASC" if sort_order.lower() == "asc" else "DESC"

    total = con.execute(f"SELECT count(*) FROM jobs{where}", params).fetchone()[0]
    offset = (page - 1) * per_page
    rows = con.execute(
        f"SELECT * FROM jobs{where} ORDER BY {sb} {so} NULLS LAST LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchdf()
    con.close()

    jobs = rows.where(rows.notna(), None).to_dict(orient="records")
    for job in jobs:
        for k, v in job.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                job[k] = None
    return {"jobs": jobs, "total": total, "page": page, "per_page": per_page, "pages": max(1, -(-total // per_page))}


@router.get("/{job_id}")
def get_job(job_id: str):
    con = get_connection()
    rows = con.execute("SELECT * FROM jobs WHERE id = ?", [job_id]).fetchdf()
    con.close()
    if rows.empty:
        raise HTTPException(404, "Job not found")
    job = rows.where(rows.notna(), None).to_dict(orient="records")[0]
    return job


@router.delete("/{job_id}")
def delete_job(job_id: str):
    con = get_connection()
    affected = con.execute("DELETE FROM jobs WHERE id = ? RETURNING id", [job_id]).fetchone()
    con.close()
    if not affected:
        raise HTTPException(404, "Job not found")
    return {"deleted": True}
