import { useState, useEffect } from "react";
import { useApi } from "../lib/api";

export default function QuestionCriticModal({
  initialQuestion,
  initialPromptTemplate,
  onAccept,
  onClose,
}: {
  initialQuestion: string;
  initialPromptTemplate: string;
  onAccept: (q: string, dims: string[], tpl: string, gridLabels: any) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(initialQuestion);
  const [crit, setCrit] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [draftPromptTemplate, setDraftPromptTemplate] = useState(initialPromptTemplate);

  const { request } = useApi();

  const runCritic = async (q: string) => {
    setLoading(true);
    try {
      const data = await request("/question/critic", {
        method: "POST",
        body: JSON.stringify({ question: q, context }),
      });
      setCrit(data);
    } catch (e) {
      console.error(e);
      alert("Failed to contact critic");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCritic(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <h3 className="text-lg font-semibold">Question Review</h3>
        {loading && !crit && <p>Checking clarity…</p>}
        {!loading && (
          <>
            <p>
              <strong>Original:</strong> {draft}
            </p>
            {crit?.rewritten && crit.rewritten !== draft && (
              <p>
                <strong>Suggested:</strong> {crit?.rewritten}
              </p>
            )}
            {crit?.reason && (
              <p className="text-sm text-gray-600"><em>Why: {crit.reason}</em></p>
            )}
            <label className="block mt-2 text-sm">
              Additional context (optional)
              <textarea
                rows={3}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full border p-2"
              />
            </label>
            <button
              className="btn-secondary mt-2"
              disabled={loading}
              onClick={() => runCritic(draft)}
            >
              Check again
            </button>
            {crit?.survey_grid_labels && (
              <div className="mt-2 p-2 bg-gray-50 border rounded">
                <strong>Survey Grid Preview:</strong>
                <div>Support: {crit.survey_grid_labels.support_label}</div>
                <div>Impacts: {crit.survey_grid_labels.impact_labels?.join(", ")}</div>
              </div>
            )}
            <label className="block mt-2 text-sm">
              <strong>Prompt Template (LLM will see this):</strong>
              <textarea
                rows={8}
                value={draftPromptTemplate}
                onChange={e => setDraftPromptTemplate(e.target.value)}
                className="w-full border p-2 mt-1 font-mono text-xs"
              />
            </label>
          </>
        )}
        <div className="flex gap-2">
          {!loading && (
            <>
              <button
                className="btn"
                onClick={() => {
                  onAccept(
                    crit?.ok ? draft : crit?.rewritten,
                    crit?.impact_dims?.length
                      ? crit.impact_dims
                      : ["Housing", "Transport", "Community"],
                    draftPromptTemplate,
                    crit?.survey_grid_labels
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
                    onAccept(draft, crit?.impact_dims ?? [], draftPromptTemplate, crit?.survey_grid_labels);
                    setOpen(false);
                  }}
                >
                  Keep Original
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 