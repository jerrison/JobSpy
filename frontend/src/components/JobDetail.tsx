import type { Job } from "../types/job";

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const panel: React.CSSProperties = { background: "#fff", borderRadius: 8, padding: "2rem", maxWidth: 700, width: "90%", maxHeight: "85vh", overflow: "auto" };
const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "140px 1fr", gap: 4, padding: "4px 0", fontSize: 14 };

interface Props {
  job: Job;
  onClose: () => void;
}

export default function JobDetail({ job, onClose }: Props) {
  const fields: [string, unknown][] = [
    ["Site", job.site],
    ["Title", job.title],
    ["Company", job.company],
    ["Location", job.location],
    ["Remote", job.is_remote ? "Yes" : "No"],
    ["Job Type", job.job_type],
    ["Level", job.job_level],
    ["Salary", job.min_amount || job.max_amount ? `${job.currency || "$"}${job.min_amount ?? "?"} - ${job.currency || "$"}${job.max_amount ?? "?"}${job.interval ? ` / ${job.interval}` : ""}` : null],
    ["Posted", job.date_posted],
    ["Industry", job.company_industry],
    ["Employees", job.company_num_employees],
    ["Emails", job.emails],
  ];

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: 18 }}>{job.title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>x</button>
        </div>

        {fields.map(([label, value]) =>
          value ? (
            <div key={label} style={row}>
              <strong>{label}</strong>
              <span>{String(value)}</span>
            </div>
          ) : null
        )}

        <div style={{ display: "flex", gap: 8, margin: "1rem 0" }}>
          {job.job_url && <a href={job.job_url} target="_blank" rel="noreferrer" style={{ color: "#0066cc" }}>Job URL</a>}
          {job.job_url_direct && <a href={job.job_url_direct} target="_blank" rel="noreferrer" style={{ color: "#0066cc" }}>Direct URL</a>}
          {job.company_url && <a href={job.company_url} target="_blank" rel="noreferrer" style={{ color: "#0066cc" }}>Company</a>}
        </div>

        {job.description && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9f9f9", borderRadius: 4, fontSize: 14, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>
            {job.description}
          </div>
        )}
      </div>
    </div>
  );
}
