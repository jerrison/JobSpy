import { useState } from "react";
import type { ScrapeRequest } from "../types/job";

const SITES = ["linkedin", "indeed", "zip_recruiter", "glassdoor", "google", "bayt", "naukri", "bdjobs", "wellfound"];
const JOB_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "Any job type" },
  { value: "fulltime", label: "Full Time" },
  { value: "parttime", label: "Part Time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];

const formGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const input: React.CSSProperties = { padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 };
const btn: React.CSSProperties = { padding: "10px 24px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 600 };

interface Props {
  onSubmit: (req: ScrapeRequest) => void;
  loading: boolean;
  proxies: string[];
}

export default function JobForm({ onSubmit, loading, proxies }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSites, setSelectedSites] = useState<string[]>([...SITES]);
  const [resultsWanted, setResultsWanted] = useState(15);
  const [isRemote, setIsRemote] = useState(false);
  const [jobType, setJobType] = useState("fulltime");
  const [distance, setDistance] = useState(50);
  const [hoursOld, setHoursOld] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [countryIndeed, setCountryIndeed] = useState("usa");
  const [enforceSalary, setEnforceSalary] = useState(false);
  const [descFmt, setDescFmt] = useState("markdown");
  const [linkedinFetch, setLinkedinFetch] = useState(false);

  function toggleSite(s: string) {
    setSelectedSites((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleAllSites() {
    setSelectedSites((prev) => (prev.length === SITES.length ? [] : [...SITES]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const req: ScrapeRequest = {
      site_name: selectedSites.length ? selectedSites : undefined,
      search_term: searchTerm || undefined,
      location: location || undefined,
      results_wanted: resultsWanted,
      is_remote: isRemote,
      distance,
      job_type: jobType || undefined,
      hours_old: hoursOld ? parseInt(hoursOld) : undefined,
      country_indeed: countryIndeed,
      enforce_annual_salary: enforceSalary,
      description_format: descFmt,
      linkedin_fetch_description: linkedinFetch,
      proxies: proxies.length ? proxies : undefined,
    };
    onSubmit(req);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "#fff", padding: "1.5rem", borderRadius: 8, border: "1px solid #e0e0e0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: "1rem" }}>
        <div style={formGroup}>
          <label><strong>Search Term</strong> <span style={{ fontWeight: 400, color: "#888", fontSize: 13 }}>(supports regex)</span></label>
          <input style={input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. staff product manager  or  \b(staff|principal)\b.*manager" />
        </div>
        <div style={formGroup}>
          <label><strong>Location</strong></label>
          <input style={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" />
        </div>
        <div style={formGroup}>
          <label><strong>Results</strong></label>
          <input style={input} type="number" min={1} max={100} value={resultsWanted} onChange={(e) => setResultsWanted(+e.target.value)} />
        </div>
      </div>

      <div style={formGroup}>
        <label><strong>Sites</strong></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={toggleAllSites} style={{ padding: "4px 10px", border: "1px solid #0066cc", borderRadius: 4, background: selectedSites.length === SITES.length ? "#0066cc" : "#fff", color: selectedSites.length === SITES.length ? "#fff" : "#0066cc", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            {selectedSites.length === SITES.length ? "Deselect All" : "Select All"}
          </button>
          {SITES.map((s) => (
            <label key={s} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 8px", border: "1px solid #ccc", borderRadius: 4, background: selectedSites.includes(s) ? "#e6f0ff" : "#fff" }}>
              <input type="checkbox" checked={selectedSites.includes(s)} onChange={() => toggleSite(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} /> Remote only
        </label>
        <div style={formGroup}>
          <select style={input} value={jobType} onChange={(e) => setJobType(e.target.value)}>
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", textAlign: "left", fontSize: 14 }}>
        {showAdvanced ? "Hide" : "Show"} advanced options
      </button>

      {showAdvanced && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", padding: "1rem", background: "#fafafa", borderRadius: 4 }}>
          <div style={formGroup}>
            <label>Distance (miles)</label>
            <input style={input} type="number" value={distance} onChange={(e) => setDistance(+e.target.value)} />
          </div>
          <div style={formGroup}>
            <label>Hours old</label>
            <input style={input} type="number" value={hoursOld} onChange={(e) => setHoursOld(e.target.value)} placeholder="e.g. 24" />
          </div>
          <div style={formGroup}>
            <label>Country (Indeed)</label>
            <input style={input} value={countryIndeed} onChange={(e) => setCountryIndeed(e.target.value)} />
          </div>
          <div style={formGroup}>
            <label>Description format</label>
            <select style={input} value={descFmt} onChange={(e) => setDescFmt(e.target.value)}>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="plain">Plain text</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={enforceSalary} onChange={(e) => setEnforceSalary(e.target.checked)} /> Enforce annual salary
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={linkedinFetch} onChange={(e) => setLinkedinFetch(e.target.checked)} /> Fetch LinkedIn descriptions
          </label>
        </div>
      )}

      <button type="submit" style={{ ...btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
        {loading ? "Scraping..." : `Start Scrape${proxies.length ? ` (${proxies.length} proxies)` : ""}`}
      </button>
    </form>
  );
}
