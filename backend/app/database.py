import duckdb
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "jobs.duckdb"

def get_connection() -> duckdb.DuckDBPyConnection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(DB_PATH))

def init_db():
    con = get_connection()
    con.execute("""
        CREATE TABLE IF NOT EXISTS scrape_sessions (
            id VARCHAR PRIMARY KEY,
            search_term VARCHAR,
            location VARCHAR,
            status VARCHAR DEFAULT 'running',
            jobs_found INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT current_timestamp,
            completed_at TIMESTAMP,
            parameters JSON,
            error_message VARCHAR
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id VARCHAR PRIMARY KEY,
            site VARCHAR,
            job_url VARCHAR,
            job_url_direct VARCHAR,
            title VARCHAR,
            company VARCHAR,
            location VARCHAR,
            date_posted DATE,
            job_type VARCHAR,
            salary_source VARCHAR,
            interval VARCHAR,
            min_amount DOUBLE,
            max_amount DOUBLE,
            currency VARCHAR,
            is_remote BOOLEAN,
            job_level VARCHAR,
            job_function VARCHAR,
            listing_type VARCHAR,
            emails VARCHAR,
            description VARCHAR,
            company_industry VARCHAR,
            company_url VARCHAR,
            company_logo VARCHAR,
            company_url_direct VARCHAR,
            company_addresses VARCHAR,
            company_num_employees VARCHAR,
            company_revenue VARCHAR,
            company_description VARCHAR,
            skills VARCHAR,
            experience_range VARCHAR,
            company_rating VARCHAR,
            company_reviews_count VARCHAR,
            vacancy_count VARCHAR,
            work_from_home_type VARCHAR,
            scraped_at TIMESTAMP DEFAULT current_timestamp,
            scrape_session_id VARCHAR
        )
    """)
    con.execute("CREATE SEQUENCE IF NOT EXISTS proxy_log_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS proxy_log (
            id INTEGER PRIMARY KEY DEFAULT nextval('proxy_log_seq'),
            proxy VARCHAR NOT NULL,
            session_id VARCHAR NOT NULL,
            used_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    con.close()
