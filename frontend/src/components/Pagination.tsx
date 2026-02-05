interface Props {
  page: number;
  pages: number;
  onPageChange: (p: number) => void;
}

const btn: React.CSSProperties = { padding: "6px 12px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 };

export default function Pagination({ page, pages, onPageChange }: Props) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: "1rem 0" }}>
      <button style={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
      <span style={{ fontSize: 14 }}>Page {page} of {pages}</span>
      <button style={btn} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}
