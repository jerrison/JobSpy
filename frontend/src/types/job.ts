export interface Job {
  id: string;
  site: string;
  job_url: string;
  job_url_direct: string | null;
  title: string;
  company: string;
  location: string;
  date_posted: string | null;
  job_type: string | null;
  salary_source: string | null;
  interval: string | null;
  min_amount: number | null;
  max_amount: number | null;
  currency: string | null;
  is_remote: boolean;
  job_level: string | null;
  job_function: string | null;
  listing_type: string | null;
  emails: string | null;
  description: string | null;
  company_industry: string | null;
  company_url: string | null;
  company_logo: string | null;
  company_url_direct: string | null;
  company_addresses: string | null;
  company_num_employees: string | null;
  company_revenue: string | null;
  company_description: string | null;
  scraped_at: string;
  scrape_session_id: string;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ScrapeRequest {
  site_name?: string[];
  search_term?: string;
  google_search_term?: string;
  location?: string;
  distance?: number;
  is_remote?: boolean;
  job_type?: string;
  easy_apply?: boolean;
  results_wanted?: number;
  country_indeed?: string;
  description_format?: string;
  linkedin_fetch_description?: boolean;
  hours_old?: number;
  enforce_annual_salary?: boolean;
  proxies?: string[];
}

export interface ProxyLogEntry {
  proxy: string;
  used_at: string;
  session_id: string;
  search_term: string | null;
}

export interface ScrapeStatus {
  session_id: string;
  status: "running" | "completed" | "failed";
  jobs_found: number;
  error_message: string | null;
  proxies_used: ProxyLogEntry[] | null;
}

export interface JobStats {
  total_jobs: number;
  by_site: Record<string, number>;
  by_country: Record<string, number>;
  remote_count: number;
  with_salary_count: number;
  total_sessions: number;
}
