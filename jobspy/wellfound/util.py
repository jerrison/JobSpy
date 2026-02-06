from __future__ import annotations

import re
from datetime import date, datetime

from jobspy.model import (
    Compensation,
    CompensationInterval,
    JobType,
    Location,
)


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug (lowercase, hyphens for spaces/special chars)."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def unpack_apollo_state(apollo_data: dict) -> list[dict]:
    """
    Unpack Apollo GraphQL cache state into a list of resolved job listing dicts.

    The Apollo state is a flat dict of keyed nodes (e.g. "Startup:123", "StartupResult:456").
    Nodes reference each other via {"type": "id", "id": "Startup:123"} pointers.
    We resolve all references and return the StartupResult entries (job listings).
    """
    if not apollo_data:
        return []

    def resolve(value):
        """Recursively resolve Apollo node references."""
        if isinstance(value, dict):
            if value.get("type") == "id" and "id" in value:
                ref_key = value["id"]
                if ref_key in apollo_data:
                    return resolve(apollo_data[ref_key])
                return value
            return {k: resolve(v) for k, v in value.items()}
        if isinstance(value, list):
            return [resolve(item) for item in value]
        return value

    jobs = []
    for key, node in apollo_data.items():
        if key.startswith("StartupResult:") and isinstance(node, dict):
            resolved = resolve(node)
            jobs.append(resolved)
    return jobs


def parse_compensation(comp_string: str | None) -> Compensation | None:
    """
    Parse a Wellfound compensation string like "$100k – $150k" or "$80K - $120K · 0.01% - 0.1%"
    into a Compensation object.
    """
    if not comp_string:
        return None

    # Match patterns like "$100k", "$100K", "$100,000"
    amounts = re.findall(r"\$[\d,]+(?:\.\d+)?[kK]?", comp_string)
    if len(amounts) < 1:
        return None

    def parse_amount(s: str) -> float | None:
        s = s.replace("$", "").replace(",", "").strip()
        multiplier = 1
        if s.lower().endswith("k"):
            multiplier = 1000
            s = s[:-1]
        try:
            return float(s) * multiplier
        except ValueError:
            return None

    min_amount = parse_amount(amounts[0])
    max_amount = parse_amount(amounts[1]) if len(amounts) > 1 else min_amount

    if min_amount is None:
        return None

    return Compensation(
        interval=CompensationInterval.YEARLY,
        min_amount=min_amount,
        max_amount=max_amount,
        currency="USD",
    )


def parse_location(location_names: list | str | None) -> Location | None:
    """Parse Wellfound locationNames into a Location object."""
    if not location_names:
        return None

    if isinstance(location_names, str):
        location_names = [location_names]

    if not location_names:
        return None

    loc_str = location_names[0] if location_names else ""
    if not loc_str:
        return None

    parts = [p.strip() for p in loc_str.split(",")]
    city = parts[0] if len(parts) >= 1 else None
    state = parts[1] if len(parts) >= 2 else None
    country = parts[2] if len(parts) >= 3 else (parts[1] if len(parts) == 2 else None)

    # If only two parts and second looks like a country (not a US state abbreviation)
    if len(parts) == 2 and state and len(state) > 2:
        country = state
        state = None

    return Location(city=city, state=state, country=country)


def parse_job_type(job_type_str: str | None) -> list[JobType] | None:
    """Map Wellfound job type strings to JobType enums."""
    if not job_type_str:
        return None

    mapping = {
        "full_time": JobType.FULL_TIME,
        "fulltime": JobType.FULL_TIME,
        "full-time": JobType.FULL_TIME,
        "part_time": JobType.PART_TIME,
        "parttime": JobType.PART_TIME,
        "part-time": JobType.PART_TIME,
        "contract": JobType.CONTRACT,
        "contractor": JobType.CONTRACT,
        "internship": JobType.INTERNSHIP,
        "intern": JobType.INTERNSHIP,
        "cofounder": JobType.OTHER,
        "co-founder": JobType.OTHER,
    }

    normalized = job_type_str.lower().strip().replace(" ", "_")
    jt = mapping.get(normalized)
    return [jt] if jt else None


def parse_date(date_str: str | int | None) -> date | None:
    """Parse a date string or Unix timestamp from Wellfound into a date object."""
    if date_str is None:
        return None

    if isinstance(date_str, (int, float)):
        try:
            # Unix timestamp (seconds)
            return datetime.fromtimestamp(date_str / 1000 if date_str > 1e12 else date_str).date()
        except (ValueError, OSError):
            return None

    if isinstance(date_str, str):
        for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
    return None
