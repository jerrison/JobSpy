# JobSpy Web App — Agent Instructions

## Project Overview

A full-stack job scraping app built on top of the `python-jobspy` library (in the repo root). The web app lives in `backend/` (FastAPI + DuckDB) and `frontend/` (React + Vite + TypeScript).

## Architecture

```
backend/
  app/
    main.py        # FastAPI app, CORS, startup (init_db)
    database.py    # DuckDB connection + schema (jobs, scrape_sessions, proxy_log)
    models.py      # Pydantic request/response models
    routes.py      # All API endpoints + country normalization logic
    services.py    # Scraper wrapper (background task) + dedup + DB storage
frontend/
  src/
    App.tsx                   # Router: ScraperPage + SavedJobsPage
    api/client.ts             # axios API client for all endpoints
    types/job.ts              # TypeScript interfaces matching backend models
    components/
      JobForm.tsx             # Scrape params form (search, sites, filters, proxies)
      JobTable.tsx            # Results table
      JobDetail.tsx           # Modal with full job info
      Pagination.tsx          # Page controls
    pages/
      ScraperPage.tsx         # Form + polling + results
      SavedJobsPage.tsx       # Browse/filter/delete saved jobs + proxy log
data/
  jobs.duckdb               # DuckDB file (auto-created on first run)
```

## How to Run

```bash
# Backend (Terminal 1) — from backend/
cd backend && uv sync && uv pip install -e .. && uv run uvicorn app.main:app --reload --port 8000

# Frontend (Terminal 2) — from frontend/
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `localhost:8000`.

## Key Setup Gotchas

1. **python-jobspy dependency**: The backend does NOT list `python-jobspy` in `pyproject.toml` because the local package uses hatchling and `${PROJECT_ROOT}` / path sources don't work cleanly. Instead, after `uv sync`, run `uv pip install -e ..` to install the local jobspy package in editable mode.

2. **`requires-python >= 3.11`**: python-jobspy requires 3.11+. Don't use 3.10.

3. **`[tool.hatch.build.targets.wheel] packages = ["app"]`**: Required in `backend/pyproject.toml` because hatchling can't auto-discover the `app/` package otherwise.

4. **DuckDB NaN handling**: DuckDB returns NaN floats that break JSON serialization. The `list_jobs` and `get_job` routes sanitize with `math.isnan`/`math.isinf` checks after `rows.where(rows.notna(), None).to_dict()`.

5. **Route ordering**: In `routes.py`, any fixed paths like `/stats`, `/proxy-log`, `/scrape` MUST be defined before the `/{job_id}` catch-all route, or FastAPI will match them as job IDs.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/jobs/scrape | Start scrape (background task), returns session_id |
| GET | /api/v1/jobs/scrape/{session_id} | Poll scrape status + proxy usage |
| GET | /api/v1/jobs/stats | Aggregate stats (by_site, by_country, remote, salary) |
| GET | /api/v1/jobs/proxy-log | All proxy usage history |
| GET | /api/v1/jobs | List jobs (paginated, filterable by site/search/remote/salary/country/session) |
| GET | /api/v1/jobs/{job_id} | Single job detail |
| DELETE | /api/v1/jobs/{job_id} | Delete a job |

## How Scraping Works

1. `POST /scrape` creates a `scrape_sessions` row and launches `run_scrape()` as a FastAPI `BackgroundTask`.
2. `run_scrape()` calls `jobspy.scrape_jobs(**params)` which returns a pandas DataFrame.
3. The search_term is applied as a **regex filter** on titles (case-insensitive) after scraping.
4. **Deduplication**: Within the batch by `title+company+location`, then deletes existing DB rows matching those same keys before inserting.
5. Frontend polls `GET /scrape/{session_id}` every 1.5s until status != "running".

## Country Normalization

`routes.py` has `normalize_country()` with `COUNTRY_ALIASES` and `US_STATES` dicts. It maps raw location suffixes (e.g., "US", "USA", "UNITED STATES", "CA", "NY") to canonical names ("United States", "Canada", etc.). US state abbreviations resolve to "United States". Used in both stats aggregation and the country filter.

## DuckDB Direct Access

For one-off data operations (bulk deletes, fixes), use the database directly:

```bash
cd backend && uv run python -c "
from app.database import get_connection
con = get_connection()
# Example: delete jobs not matching a pattern
con.execute(\"DELETE FROM jobs WHERE LOWER(title) NOT LIKE '%product manager%'\")
con.close()
"
```

## Frontend Conventions

- All styling is inline (no CSS framework). Common style objects (`formGroup`, `input`, `btn`, `th`, `td`) at top of components.
- State management is local (useState/useCallback). No global store.
- The `ScrapeRequest` TypeScript interface must match the backend `ScrapeRequest` Pydantic model.
- `JobStats.by_country` is `Record<string, number>` — keys are normalized country names.

## Adding New Features Checklist

1. Update `backend/app/models.py` (Pydantic model)
2. Update `backend/app/routes.py` or `services.py` (endpoint/logic)
3. Update `frontend/src/types/job.ts` (TypeScript interface)
4. Update `frontend/src/api/client.ts` (API call if new endpoint)
5. Update the relevant component/page
6. Run `npx tsc --noEmit` from `frontend/` to type-check
7. Restart backend: `lsof -ti:8000 | xargs kill -9; cd backend && uv run uvicorn app.main:app --port 8000`
8. Frontend hot-reloads automatically via Vite
