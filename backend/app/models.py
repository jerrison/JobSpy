from pydantic import BaseModel
from typing import Optional


class ScrapeRequest(BaseModel):
    site_name: list[str] | None = None
    search_term: str | None = None
    google_search_term: str | None = None
    location: str | None = None
    distance: int | None = 50
    is_remote: bool = False
    job_type: str | None = None
    easy_apply: bool | None = None
    results_wanted: int = 15
    country_indeed: str = "usa"
    description_format: str = "markdown"
    linkedin_fetch_description: bool = False
    linkedin_company_ids: list[int] | None = None
    offset: int | None = 0
    hours_old: int | None = None
    enforce_annual_salary: bool = False
    verbose: int = 0
    proxies: list[str] | None = None


class ScrapeResponse(BaseModel):
    session_id: str
    status: str


class ProxyLogEntry(BaseModel):
    proxy: str
    used_at: str
    session_id: str
    search_term: str | None = None


class ScrapeStatus(BaseModel):
    session_id: str
    status: str
    jobs_found: int
    error_message: str | None = None
    proxies_used: list[ProxyLogEntry] | None = None


class JobListParams(BaseModel):
    page: int = 1
    per_page: int = 25
    site: str | None = None
    search: str | None = None
    is_remote: bool | None = None
    has_salary: bool | None = None
    sort_by: str = "scraped_at"
    sort_order: str = "desc"


class JobStats(BaseModel):
    total_jobs: int
    by_site: dict[str, int]
    by_country: dict[str, int]
    remote_count: int
    with_salary_count: int
    total_sessions: int
