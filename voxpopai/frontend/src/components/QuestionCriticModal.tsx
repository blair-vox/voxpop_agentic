import { useState } from "react";

// Replace with your API helper or fetch implementation
const apiPost = async (url: string, body: any) => {
  const res = await fetch(`http://localhost:8000${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export default function QuestionCriticModal({
  onAccept,
}: {
  onAccept: (q: string, dims: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [crit, setCrit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const reviewQuestion = async () => {
    if (!raw.trim()) return;
    setLoading(true);
    try {
      const data = await apiPost("/question/critic", { question: raw });
      setCrit(data);
      setOpen(true);
    } catch (e) {
      console.error(e);
      alert("Failed to run critic");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="space-y-2">
        <textarea
          rows={4}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="w-full border p-2"
        />
        <button onClick={reviewQuestion} disabled={loading} className="btn">
          {loading ? "Checking…" : "Review Question"}
        </button>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <h3 className="text-lg font-semibold">Question Review</h3>
        <p>
          <strong>Original:</strong> {raw}
        </p>
        {!crit?.ok && (
          <p>
            <strong>Suggested:</strong> {crit?.rewritten}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => {
              onAccept(
                crit?.ok ? raw : crit?.rewritten,
                crit?.impact_dims?.length
                  ? crit.impact_dims
                  : ["Housing", "Transport", "Community"]
              );
              setOpen(false);
            }}
          >
            {crit?.ok ? "Use question" : "Use suggestion"}
          </button>
          {!crit?.ok && (
            <button
              className="btn-secondary"
              onClick={() => {
                onAccept(raw, crit?.impact_dims ?? []);
                setOpen(false);
              }}
            >
              Keep Original
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 