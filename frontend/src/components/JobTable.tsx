import type { Job } from "../types/job";

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e0e0e0", fontSize: 13, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid #eee", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

function formatSalary(job: Job) {
  if (!job.min_amount && !job.max_amount) return "-";
  const cur = job.currency || "$";
  const fmt = (n: number) => n.toLocaleString();
  if (job.min_amount && job.max_amount) return `${cur}${fmt(job.min_amount)} - ${cur}${fmt(job.max_amount)}`;
  return job.min_amount ? `${cur}${fmt(job.min_amount)}+` : `Up to ${cur}${fmt(job.max_amount!)}`;
}

interface Props {
  jobs: Job[];
  onSelect: (job: Job) => void;
  onDelete?: (id: string) => void;
}

export default function JobTable({ jobs, onSelect, onDelete }: Props) {
  if (!jobs.length) return <p style={{ color: "#888", padding: "1rem 0" }}>No jobs to display.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
        <thead>
          <tr>
            <th style={th}>Site</th>
            <th style={th}>Title</th>
            <th style={th}>Company</th>
            <th style={th}>Location</th>
            <th style={th}>Salary</th>
            <th style={th}>Posted</th>
            <th style={th}>Remote</th>
            <th style={th}>Link</th>
            {onDelete && <th style={th}></th>}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} style={{ cursor: "pointer" }} onClick={() => onSelect(job)} onMouseOver={(e) => (e.currentTarget.style.background = "#f8f8f8")} onMouseOut={(e) => (e.currentTarget.style.background = "")}>
              <td style={td}><span style={{ background: "#eee", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>{job.site}</span></td>
              <td style={{ ...td, fontWeight: 500 }}>{job.title}</td>
              <td style={td}>{job.company}</td>
              <td style={td}>{job.location}</td>
              <td style={td}>{formatSalary(job)}</td>
              <td style={td}>{job.date_posted || "-"}</td>
              <td style={td}>{job.is_remote ? "Yes" : "-"}</td>
              <td style={td}>
                {job.job_url && (
                  <a href={job.job_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#0066cc" }}>
                    View
                  </a>
                )}
              </td>
              {onDelete && (
                <td style={td}>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(job.id); }} style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: 13 }}>
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
