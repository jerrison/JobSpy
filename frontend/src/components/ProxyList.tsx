import { useState, useRef } from "react";

const PROXIES_STORAGE_KEY = "jobspy_proxies";

function loadProxies(): string[] {
  try { return JSON.parse(localStorage.getItem(PROXIES_STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveProxies(proxies: string[]) {
  localStorage.setItem(PROXIES_STORAGE_KEY, JSON.stringify(proxies));
}

function normalizeProxy(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^(https?|socks[45]):\/\//i.test(s)) return s;
  return `http://${s}`;
}

function parseProxyText(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .flatMap((chunk) => chunk.trim().split(/\s+/))
    .map(normalizeProxy)
    .filter(Boolean);
}

interface Props {
  proxies: string[];
  onChange: (proxies: string[]) => void;
}

export default function ProxyList({ proxies, onChange }: Props) {
  const [bulkText, setBulkText] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  function addBulk() {
    const parsed = parseProxyText(bulkText);
    if (!parsed.length) return;
    const set = new Set(proxies);
    parsed.forEach((p) => set.add(p));
    onChange(Array.from(set));
    setBulkText("");
  }

  function handleBulkKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      addBulk();
    }
  }

  function handleBulkPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const parsed = parseProxyText(text);
    if (!parsed.length) return;
    const set = new Set(proxies);
    parsed.forEach((p) => set.add(p));
    onChange(Array.from(set));
    setBulkText("");
  }

  function removeProxy(idx: number) {
    onChange(proxies.filter((_, i) => i !== idx));
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditValue(proxies[idx]);
    setTimeout(() => editRef.current?.focus(), 0);
  }

  function commitEdit() {
    if (editingIdx === null) return;
    const normalized = normalizeProxy(editValue);
    if (normalized && normalized !== proxies[editingIdx]) {
      const next = [...proxies];
      next[editingIdx] = normalized;
      onChange(next);
    }
    setEditingIdx(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditValue("");
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }

  return (
    <div style={{ background: "#fff", padding: "1.25rem", borderRadius: 8, border: "1px solid #e0e0e0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Proxy List
          {proxies.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "#555", background: "#e6f0ff", padding: "2px 8px", borderRadius: 10 }}>
              {proxies.length}
            </span>
          )}
        </h2>
        {proxies.length > 0 && (
          <button type="button" onClick={() => onChange([])} style={{ background: "none", border: "none", color: "#c00", cursor: "pointer", fontSize: 13, padding: 0 }}>
            Clear all
          </button>
        )}
      </div>

      {/* Bulk paste area */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <textarea
          style={{ flex: 1, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13, fontFamily: "monospace", minHeight: 56, resize: "vertical" }}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          onKeyDown={handleBulkKeyDown}
          onPaste={handleBulkPaste}
          placeholder={"Paste IPs here (one per line, or comma/space separated)\n1.2.3.4:8080\nhttp://user:pass@5.6.7.8:3128\nsocks5://9.10.11.12:1080"}
        />
        <button
          type="button"
          onClick={addBulk}
          disabled={!bulkText.trim()}
          style={{ padding: "8px 16px", background: bulkText.trim() ? "#0066cc" : "#ccc", color: "#fff", border: "none", borderRadius: 4, cursor: bulkText.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, alignSelf: "flex-end", whiteSpace: "nowrap" }}
        >
          Add
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
        Bare IP:port auto-prefixed with http://. Click a proxy to edit it.
      </div>

      {/* Proxy list */}
      {proxies.length > 0 && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 4, maxHeight: 260, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
                <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, borderBottom: "1px solid #e0e0e0", width: 40 }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, borderBottom: "1px solid #e0e0e0" }}>Proxy</th>
                <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: 600, borderBottom: "1px solid #e0e0e0", width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {proxies.map((p, i) => (
                <tr key={`${p}-${i}`} style={{ borderBottom: i < proxies.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                  <td style={{ padding: "5px 10px", color: "#999", fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: "3px 10px", fontFamily: "monospace", fontSize: 13 }}>
                    {editingIdx === i ? (
                      <input
                        ref={editRef}
                        style={{ width: "100%", border: "1px solid #0066cc", borderRadius: 3, padding: "3px 6px", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={commitEdit}
                      />
                    ) : (
                      <span
                        onClick={() => startEdit(i)}
                        style={{ cursor: "pointer", display: "block", padding: "3px 0", borderRadius: 3 }}
                        title="Click to edit"
                      >
                        {p}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", padding: "3px 10px" }}>
                    <button
                      type="button"
                      onClick={() => removeProxy(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16, padding: "2px 6px", lineHeight: 1, borderRadius: 3 }}
                      title="Remove"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#c00")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {proxies.length === 0 && (
        <div style={{ textAlign: "center", color: "#aaa", padding: "20px 0", fontSize: 13 }}>
          No proxies configured. Paste a list above to get started.
        </div>
      )}
    </div>
  );
}

export { PROXIES_STORAGE_KEY, loadProxies, saveProxies };
