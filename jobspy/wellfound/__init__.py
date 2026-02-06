"""
jobspy.wellfound
~~~~~~~~~~~~~~~~~~~

This module contains the Wellfound (formerly AngelList) scraper.
Fetches job listings from Wellfound's Next.js pages by extracting
the embedded __NEXT_DATA__ Apollo GraphQL state.
"""

from __future__ import annotations

import json
import re
import time
import random
import logging

from jobspy.model import (
    JobPost,
    JobResponse,
    Scraper,
    ScraperInput,
    Site,
)
from jobspy.util import create_session, extract_emails_from_text
from jobspy.wellfound.constant import headers
from jobspy.wellfound.util import (
    parse_compensation,
    parse_date,
    parse_job_type,
    parse_location,
    slugify,
    unpack_apollo_state,
)

log = logging.getLogger("Wellfound")


class Wellfound(Scraper):
    BASE_URL = "https://wellfound.com"

    def __init__(
        self,
        proxies: list[str] | str | None = None,
        ca_cert: str | None = None,
        user_agent: str | None = None,
    ):
        site = Site(Site.WELLFOUND)
        super().__init__(site, proxies=proxies, ca_cert=ca_cert, user_agent=user_agent)
        self.session = None
        self.seen_ids: set[str] = set()

    def scrape(self, scraper_input: ScraperInput) -> JobResponse:
        self.session = create_session(
            proxies=self.proxies, ca_cert=self.ca_cert, has_retry=True
        )
        h = headers.copy()
        if self.user_agent:
            h["user-agent"] = self.user_agent
        self.session.headers.update(h)

        role_slug = slugify(scraper_input.search_term) if scraper_input.search_term else "developer"
        location_slug = slugify(scraper_input.location) if scraper_input.location else None

        job_list: list[JobPost] = []
        results_wanted = scraper_input.results_wanted
        page = 1
        max_pages = 25

        while len(job_list) < results_wanted and page <= max_pages:
            url = self._build_url(role_slug, location_slug, page)
            log.info(f"fetching page {page}: {url}")

            try:
                resp = self.session.get(url)
            except Exception as e:
                log.error(f"request failed: {e}")
                break

            if resp.status_code == 404:
                log.info("got 404, no more results")
                break
            if resp.status_code != 200:
                log.warning(f"unexpected status {resp.status_code}")
                break

            jobs_on_page, total_pages = self._parse_page(resp.text, scraper_input)

            if not jobs_on_page:
                break

            for job in jobs_on_page:
                if job.id not in self.seen_ids:
                    self.seen_ids.add(job.id)
                    job_list.append(job)
                    if len(job_list) >= results_wanted:
                        break

            if total_pages and page >= total_pages:
                break

            page += 1
            if page <= max_pages and len(job_list) < results_wanted:
                time.sleep(random.uniform(3, 7))

        return JobResponse(jobs=job_list[:results_wanted])

    def _build_url(self, role_slug: str, location_slug: str | None, page: int) -> str:
        if location_slug:
            url = f"{self.BASE_URL}/role/l/{role_slug}/{location_slug}"
        else:
            url = f"{self.BASE_URL}/role/{role_slug}"
        if page > 1:
            url += f"?page={page}"
        return url

    def _parse_page(self, html: str, scraper_input: ScraperInput) -> tuple[list[JobPost], int | None]:
        """Extract jobs from page HTML by parsing __NEXT_DATA__ script tag."""
        match = re.search(
            r'<script\s+id="__NEXT_DATA__"\s+type="application/json">\s*({.*?})\s*</script>',
            html,
            re.DOTALL,
        )
        if not match:
            log.warning("could not find __NEXT_DATA__ in page")
            return [], None

        try:
            next_data = json.loads(match.group(1))
        except json.JSONDecodeError as e:
            log.error(f"failed to parse __NEXT_DATA__: {e}")
            return [], None

        apollo_state = (
            next_data
            .get("props", {})
            .get("pageProps", {})
            .get("apolloState", {})
            .get("data", {})
        )

        if not apollo_state:
            log.warning("no apolloState.data found in __NEXT_DATA__")
            return [], None

        # Extract page count from metadata
        total_pages = None
        for key, val in apollo_state.items():
            if key.startswith("JobSearchResult:") and isinstance(val, dict):
                total_pages = val.get("pageCount") or val.get("totalPages")
                break
            if isinstance(val, dict) and "pageCount" in val:
                total_pages = val["pageCount"]
                break

        raw_jobs = unpack_apollo_state(apollo_state)
        jobs: list[JobPost] = []

        for raw in raw_jobs:
            try:
                job = self._parse_job(raw, scraper_input)
                if job:
                    jobs.append(job)
            except Exception as e:
                log.debug(f"failed to parse job entry: {e}")
                continue

        return jobs, total_pages

    def _parse_job(self, raw: dict, scraper_input: ScraperInput) -> JobPost | None:
        """Convert a resolved Apollo StartupResult node into a JobPost."""
        # The node may have the job data at the top level or nested under various keys
        job_id = raw.get("id")
        if not job_id:
            return None

        title = raw.get("title") or raw.get("primaryRoleTitle") or ""
        if not title:
            return None

        # Resolve startup/company info
        startup = raw.get("startup") or raw.get("company") or {}
        if isinstance(startup, dict):
            company_name = startup.get("name") or startup.get("companyName")
            company_logo = startup.get("logoUrl") or startup.get("companyLogoUrl")
            company_url = startup.get("companyUrl") or startup.get("websiteUrl")
            company_size = startup.get("companySize") or startup.get("companySizeString")
            startup_slug = startup.get("slug", "")
        else:
            company_name = None
            company_logo = None
            company_url = None
            company_size = None
            startup_slug = ""

        # Build job URL
        job_slug = raw.get("slug", "")
        if startup_slug and job_slug:
            job_url = f"{self.BASE_URL}/jobs/{startup_slug}/{job_slug}"
        elif job_id:
            job_url = f"{self.BASE_URL}/jobs?id={job_id}"
        else:
            return None

        # Location
        location_names = raw.get("locationNames") or raw.get("locations")
        location = parse_location(location_names)

        # Remote
        is_remote = raw.get("remote") or raw.get("isRemote")
        if isinstance(is_remote, str):
            is_remote = is_remote.lower() in ("true", "yes", "1")

        # Compensation
        comp_str = raw.get("compensation") or raw.get("compensationString")
        compensation = parse_compensation(comp_str)

        # Job type
        job_type_str = raw.get("jobType") or raw.get("employmentType")
        job_type = parse_job_type(job_type_str)

        # Date posted
        date_posted = parse_date(
            raw.get("liveStartAt") or raw.get("postedAt") or raw.get("createdAt")
        )

        # Description
        description = raw.get("description") or raw.get("descriptionHtml") or raw.get("descriptionText")

        return JobPost(
            id=f"wf-{job_id}",
            title=title,
            company_name=company_name,
            job_url=job_url,
            location=location,
            compensation=compensation,
            date_posted=date_posted,
            job_type=job_type,
            is_remote=is_remote if isinstance(is_remote, bool) else None,
            description=description,
            emails=extract_emails_from_text(description) if description else None,
            company_logo=company_logo,
            company_url=company_url,
            company_num_employees=str(company_size) if company_size else None,
        )
