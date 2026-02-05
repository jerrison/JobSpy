import { useState, useEffect, useCallback } from "react";
import JobTable from "../components/JobTable";
import JobDetail from "../components/JobDetail";
import Pagination from "../components/Pagination";
import { listJobs, deleteJob, getStats, getProxyLog } from "../api/client";
import type { Job, JobStats, ProxyLogEntry } from "../types/job";

const input: React.CSSProperties = { padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 };

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Job | null>(null);
  const [stats, setStats] = useState<JobStats | null>(null);

  const [site, setSite] = useState("");
  const [search, setSearch] = useState("");
  const [isRemote, setIsRemote] = useState<string>("");
  const [hasSalary, setHasSalary] = useState(false);
  const [country, setCountry] = useState("");
  const [proxyLog, setProxyLog] = useState<ProxyLogEntry[]>([]);
  const [showProxyLog, setShowProxyLog] = useState(false);

  const fetchJobs = useCallback(async (p: number) => {
    const params: Record<string, unknown> = { page: p, per_page: 25 };
    if (site) params.site = site;
    if (search) params.search = search;
    if (isRemote === "true") params.is_remote = true;
    if (isRemote === "false") params.is_remote = false;
    if (hasSalary) params.has_salary = true;
    if (country) params.country = country;
    const res = await listJobs(params);
    setJobs(res.jobs);
    setTotal(res.total);
    setPages(res.pages);
    setPage(p);
  }, [site, search, isRemote, hasSalary, country]);

  useEffect(() => { fetchJobs(1); }, [fetchJobs]);
  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);
  useEffect(() => { getProxyLog().then(setProxyLog).catch(() => {}); }, []);

  async function handleDelete(id: string) {
    await deleteJob(id);
    fetchJobs(page);
    getStats().then(setStats).catch(() => {});
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: "1rem" }}>Saved Jobs</h1>

      {stats && (
        <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem", fontSize: 14, color: "#555" }}>
          <span><strong>{stats.total_jobs}</strong> total jobs</span>
          <span><strong>{stats.remote_count}</strong> remote</span>
          <span><strong>{stats.with_salary_count}</strong> with salary</span>
          <span><strong>{stats.total_sessions}</strong> scrape sessions</span>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <input style={input} placeholder="Search title/company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={input} value={site} onChange={(e) => setSite(e.target.value)}>
          <option value="">All sites</option>
          {stats && Object.keys(stats.by_site).map((s) => <option key={s} value={s}>{s} ({stats.by_site[s]})</option>)}
        </select>
        <select style={input} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {stats && Object.entries(stats.by_country).map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
        </select>
        <select style={input} value={isRemote} onChange={(e) => setIsRemote(e.target.value)}>
          <option value="">Any remote</option>
          <option value="true">Remote only</option>
          <option value="false">Non-remote</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
          <input type="checkbox" checked={hasSalary} onChange={(e) => setHasSalary(e.target.checked)} /> Has salary
        </label>
      </div>

      <div style={{ fontSize: 14, color: "#666", marginBottom: "0.5rem" }}>{total} results</div>
      <JobTable jobs={jobs} onSelect={setSelected} onDelete={handleDelete} />
      <Pagination page={page} pages={pages} onPageChange={fetchJobs} />
      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}

      {proxyLog.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <button onClick={() => setShowProxyLog(!showProxyLog)} style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", fontSize: 14, padding: 0 }}>
            {showProxyLog ? "Hide" : "Show"} proxy usage log ({proxyLog.length} entries)
          </button>
          {showProxyLog && (
            <table style={{ marginTop: 8, width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e0e0e0" }}>Proxy</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e0e0e0" }}>Used At</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e0e0e0" }}>Search Term</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e0e0e0" }}>Session</th>
                </tr>
              </thead>
              <tbody>
                {proxyLog.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #eee", fontFamily: "monospace" }}>{entry.proxy}</td>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #eee" }}>{new Date(entry.used_at).toLocaleString()}</td>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #eee" }}>{entry.search_term || "-"}</td>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #eee", fontSize: 11, fontFamily: "monospace" }}>{entry.session_id.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
