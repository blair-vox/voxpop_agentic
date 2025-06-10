import React, { useEffect, useState } from "react";

interface Props {
  runId: string;
  personaId: number | string;
}

export const PersonaTimeline: React.FC<Props> = ({ runId, personaId }) => {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");
    fetch(`${apiBase}/api/logs/${runId}/${personaId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setEvents(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, runId, personaId]);

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ fontSize: "0.8rem" }}>
        {open ? "Hide Interactions" : "View Interactions"}
      </button>
      {open && (
        <div style={{ marginTop: "0.5rem", border: "1px solid #ddd", padding: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
          {loading && <p>Loading…</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {!loading && !error && (
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {events.map((ev, idx) => (
                <li key={idx} style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#555" }}>
                    {new Date(ev.ts).toLocaleTimeString()} – {ev.step || "LLM"}
                  </div>
                  {ev.prompt && (
                    <pre style={{ background: "#f7f7f7", padding: "0.25rem", whiteSpace: "pre-wrap" }}>
                      <strong>Prompt:</strong> {ev.prompt}
                    </pre>
                  )}
                  {ev.response && (
                    <pre style={{ background: "#eef", padding: "0.25rem", whiteSpace: "pre-wrap" }}>
                      <strong>Response:</strong> {ev.response}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}; 