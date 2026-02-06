import { useState, useEffect, useRef } from "react";
import JobForm from "../components/JobForm";
import JobTable from "../components/JobTable";
import JobDetail from "../components/JobDetail";
import Pagination from "../components/Pagination";
import ProxyList, { PROXIES_STORAGE_KEY, saveProxies } from "../components/ProxyList";
import { startScrape, getScrapeStatus, listJobs } from "../api/client";
import type { Job, ScrapeRequest, ScrapeStatus } from "../types/job";

export default function ScraperPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState<Job | null>(null);
  const sessionRef = useRef<string | null>(null);
  const [proxies, setProxies] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PROXIES_STORAGE_KEY) || "[]"); } catch { return []; }
  });

  function handleProxiesChange(next: string[]) {
    setProxies(next);
    saveProxies(next);
  }

  async function handleSubmit(req: ScrapeRequest) {
    setLoading(true);
    setStatus(null);
    setJobs([]);
    try {
      const res = await startScrape(req);
      sessionRef.current = res.session_id;
      setStatus({ session_id: res.session_id, status: "running", jobs_found: 0, error_message: null, proxies_used: null });
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!status || status.status !== "running") return;
    const interval = setInterval(async () => {
      const s = await getScrapeStatus(status.session_id);
      setStatus(s);
      if (s.status !== "running") {
        clearInterval(interval);
        setLoading(false);
        if (s.status === "completed" && s.jobs_found > 0) {
          const res = await listJobs({ session_id: s.session_id, per_page: 25, page: 1 });
          setJobs(res.jobs);
          setTotal(res.total);
          setPages(res.pages);
          setPage(1);
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [status?.session_id, status?.status]);

  async function handlePageChange(p: number) {
    if (!sessionRef.current) return;
    const res = await listJobs({ session_id: sessionRef.current, per_page: 25, page: p });
    setJobs(res.jobs);
    setPage(p);
    setPages(res.pages);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: "1rem" }}>Job Scraper</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1rem", alignItems: "start" }}>
        <JobForm onSubmit={handleSubmit} loading={loading} proxies={proxies} />
        <ProxyList proxies={proxies} onChange={handleProxiesChange} />
      </div>

      {status && (
        <div style={{ margin: "1rem 0", padding: "0.75rem 1rem", borderRadius: 4, background: status.status === "failed" ? "#fff0f0" : status.status === "running" ? "#fffbe6" : "#f0fff0", border: "1px solid #e0e0e0" }}>
          {status.status === "running" && "Scraping in progress..."}
          {status.status === "completed" && `Completed - ${status.jobs_found} jobs found`}
          {status.status === "failed" && `Failed: ${status.error_message || "Unknown error"}`}
          {status.proxies_used && status.proxies_used.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, borderTop: "1px solid #e0e0e0", paddingTop: 8 }}>
              <strong>Proxies used:</strong>
              <table style={{ marginTop: 4, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "2px 12px 2px 0" }}>Proxy</th>
                    <th style={{ textAlign: "left", padding: "2px 0" }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {status.proxies_used.map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: "2px 12px 2px 0", fontFamily: "monospace" }}>{p.proxy}</td>
                      <td style={{ padding: "2px 0" }}>{new Date(p.used_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <div style={{ margin: "0.5rem 0", fontSize: 14, color: "#666" }}>{total} results</div>
          <JobTable jobs={jobs} onSelect={setSelected} />
          <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
        </>
      )}

      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
