import React, { useState, useEffect, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart, Pie, Cell,
  LabelList,
} from "recharts";
import { Run, Persona, DriverSummaryRow } from "../types";
import { PersonaCard } from "../components/PersonaCard";
import QuestionCriticModal from "../components/QuestionCriticModal";

export default function Home() {
  const [area, setArea] = useState("");
  const [numberOfPersonas, setNumberOfPersonas] = useState(1);
  const [question, setQuestion] = useState(
    "Waverley Council is considering a policy that would remove minimum parking requirements for new apartment developments in Bondi. This means developers could build fewer or no car spaces if they believe it suits the residents' needs."
  );
  const [responses, setResponses] = useState<Persona[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runDemo, setRunDemo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [driverSummary, setDriverSummary] = useState<DriverSummaryRow[] | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);

  // Add loading and error states for new simulation
  const [loadingSim, setLoadingSim] = useState(false);
  const [errorSim, setErrorSim] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Add state for location frequency
  const [locationFreq, setLocationFreq] = useState<Record<string, number> | null>(null);

  const [domain, setDomain] = useState<string>("civic-policy");
  const [impactDims, setImpactDims] = useState<string[]>([]);

  const [showCritic, setShowCritic] = useState(false);
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const defaultTemplate = `NARRATIVE:\n<5-10 sentence first-person statement>\n\nSURVEY:\nSupport Level (1-5): <#>\n{impact_lines}Key Concerns: item1, item2\nSuggested Improvements: item1, item2`;
  const [promptTemplate, setPromptTemplate] = useState(defaultTemplate);

  const [isPending, startTransition] = useTransition();

  const [surveyGridLabels, setSurveyGridLabels] = useState<any>(null);

  const runSimulation = async (q: string, d?: string) => {
    // helper to run sim when critic modal accepted or normal form submit
    setLoadingSim(true);
    setErrorSim(null);
    setProgress(0);
    try {
      const res = await fetch("http://localhost:8000/personas/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(area.trim() ? { area } : {}),
          number_of_personas: numberOfPersonas,
          questions: [q],
          domain: d || domain,
          impact_dims: impactDims,
          prompt_template: promptTemplate,
          survey_grid_labels: surveyGridLabels,
        }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.type === "progress") {
              setProgress(data.progress);
            } else if (data.type === "complete") {
              const responseData = data.data;
              setResponses(responseData.responses);
              setSummary(responseData.summary);
              setRunId(responseData.run_id);
              setRunDemo(responseData.demographics);
              setDriverSummary(responseData.driver_summary);
              setRecentQuestions(prev => prev.includes(q) ? prev : [q, ...prev.slice(0, 4)]);
              setLocationFreq(responseData.location_freq);
            }
          }
        }
      }
    } catch (err: any) {
      setErrorSim(err.message || "Unknown error");
    } finally {
      setLoadingSim(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSimulation(question);
  };

  // ---- History helpers ----
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  useEffect(() => {
    if (activeTab === "history" && runs === null) {
      fetch("http://localhost:8000/runs")
        .then((r) => r.json())
        .then((data) => setRuns(data));
    }
  }, [activeTab, runs]);

  const loadRun = async (id: string) => {
    const res = await fetch(`http://localhost:8000/runs/${id}`);
    const data = await res.json();
    setSelectedRun(data);
  };

  // Build support data and a short summary of main narrative reason for each support level
  const buildSupportDataWithSummaries = (respArray: any[], driverSummary?: any[]) => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    respArray.forEach((p) => {
      const v = p.survey_numbers?.support;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    let mainSummaries: Record<number, string> = {};
    if (driverSummary && Array.isArray(driverSummary)) {
      driverSummary.forEach(({ level, drivers }) => {
        mainSummaries[level] = drivers.slice(0, 2).map(([d]) => d).join(', ');
      });
    } else {
      // fallback to old logic...
      const narratives: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      respArray.forEach((p) => {
        const v = p.survey_numbers?.support;
        if (v && p.drivers && p.drivers.length > 0) {
          narratives[v].push(...p.drivers);
        }
      });
      const driverCounts: Record<number, Record<string, number>> = {};
      Object.entries(narratives).forEach(([level, drivers]) => {
        if (!drivers.length) return;
        driverCounts[Number(level)] = {};
        drivers.forEach(driver => {
          driverCounts[Number(level)][driver] = (driverCounts[Number(level)][driver] || 0) + 1;
        });
      });
      Object.entries(driverCounts).forEach(([level, counts]) => {
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        mainSummaries[Number(level)] = sorted.slice(0, 2).map(([driver]) => driver).join(", ");
      });
    }
    // Always return all 5 levels, even if count is 0
    const supportData = [1, 2, 3, 4, 5].map((k) => {
      let percent = (Number(counts[k]) / total) * 100;
      // Ensure a minimum visible bar for nonzero counts
      if (counts[k] > 0 && percent < 0.01) percent = 0.01;
      return {
        level: String(k),
        count: counts[k],
        percent: Number(percent),
        summary: counts[k] > 0 ? mainSummaries[k] : "",
      };
    });
    console.log('Support data:', supportData);
    return supportData;
  };

  const buildAgeOverlay = (demo: any) => {
    if (!demo) return [];
    const persona = demo.age.persona || {};
    const pop = demo.age.population || {};
    const keys = Array.from(new Set([...Object.keys(persona), ...Object.keys(pop)]));
    // sort by numeric lower bound if pattern like "20-24 years"
    keys.sort((a,b)=>{
      const numA=parseInt(a as string);
      const numB=parseInt(b as string);
      return numA-numB;
    });
    const totalPersona = Object.values(persona).reduce((s:any,v:any)=>s+v,0);
    const totalPop = Object.values(pop).reduce((s:any,v:any)=>s+v,0);
    return keys.map((k) => ({
      name: k,
      persona: totalPersona ? (Number(persona[k] ?? 0) / Number(totalPersona) * 100) : 0,
      population: totalPop ? (Number(pop[k] ?? 0) / Number(totalPop) * 100) : 0,
    }));
  };

  const PARTY_COLOR: Record<string, string> = {
    Liberal: "#1e6091",
    Labor: "#d62828",
    Greens: "#2a9d8f",
    "National Party": "#f9c74f",
    National: "#f9c74f",
    "Other party": "#8d99ae",
  };

  const GENDER_COLOR: Record<string, string> = {
    Male: "#1e6091",
    Female: "#f9844a",
  };

  const EDU_ORDER = [
    "No formal education",
    "Year 11 or below",
    "Year 12 or equivalent",
    "Certificate III/IV",
    "Advanced diploma or diploma",
    "Bachelor degree or higher",
    "Other",
  ];

  const EDU_COLOR: Record<string, string> = {
    "No formal education": "#8d99ae",
    "Year 11 or below": "#adb5bd",
    "Year 12 or equivalent": "#6c757d",
    "Certificate III/IV": "#4dabf7",
    "Advanced diploma or diploma": "#228be6",
    "Bachelor degree or higher": "#1864ab",
    Other: "#adb5bd",
  };

  const buildPieData = (demo: any, field: string) => {
    if (!demo || !demo[field]) return [];
    const obj = demo[field].persona || {};
    const entries = Object.entries(obj).map(([k, v]) => ({ name: k, value: v as number }));
    if (field === "education") {
      entries.sort((a, b) => EDU_ORDER.indexOf(a.name) - EDU_ORDER.indexOf(b.name));
    }
    return entries;
  };

  const colorForSlice = (field: string, name: string, idx: number) => {
    if (field === "political") return PARTY_COLOR[name] || PARTY_COLOR["Other party"];
    if (field === "gender") return GENDER_COLOR[name] || "#adb5bd";
    if (field === "education") return EDU_COLOR[name] || "#adb5bd";
    const defaultColors = ["#0077b6", "#90be6d", "#f9c74f", "#f9844a", "#f94144", "#577590"];
    return defaultColors[idx % defaultColors.length];
  };

  // Helper to turn locationFreq into chart data
  const locationData = (locObj?: Record<string, number> | null) => {
    if (!locObj) return [];
    const entries = Object.entries(locObj).filter(([k])=>k!="Total").sort((a,b)=>b[1]-a[1]);
    return entries.slice(0,10).map(([name,value])=>({ name, value }));
  };

  // Fetch last 5 unique questions on mount
  useEffect(() => {
    fetch("http://localhost:8000/runs")
      .then((r) => r.json())
      .then((data) => {
        const uniqueQs: string[] = [];
        for (const run of data) {
          if (run.question && !uniqueQs.includes(run.question)) {
            uniqueQs.push(run.question);
          }
          if (uniqueQs.length >= 5) break;
        }
        setRecentQuestions(uniqueQs);
      })
      .catch(() => {/* ignore */});
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>VoxPopAI (PoC)</h1>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("new")} disabled={activeTab === "new"}>New Simulation</button>
        <button onClick={() => setActiveTab("history")} disabled={activeTab === "history"} style={{ marginLeft: "0.5rem" }}>Past Runs</button>
      </div>

      {activeTab === "new" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
          <label>
            Area
            <input type="text" value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
          <label>
            Number of Personas
            <input type="number" value={numberOfPersonas} onChange={(e) => setNumberOfPersonas(Number(e.target.value))} min="1" />
          </label>
          <label style={{ display: "flex", flexDirection: "column" }}>
            Proposal / Question to personas
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column" }}>
            Recent Questions
            <select onChange={(e) => startTransition(() => setQuestion(e.target.value))} value={question}>
              <option value="">Select a recent question</option>
              {recentQuestions.map((q, idx) => (
                <option key={idx} value={q}>{q}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" onClick={() => setShowCritic(true)} disabled={!question.trim() || isPending}>
              Review Question
            </button>
            <button type="button" onClick={() => runSimulation(question)} disabled={loadingSim || !question.trim()}>
              Run Simulation
            </button>
            <button type="button" onClick={() => setShowPromptEdit(v=>!v)}>
              {showPromptEdit ? "Hide Prompt" : "Show Prompt"}
            </button>
          </div>
          {showPromptEdit && (
            <div style={{ marginTop: "0.5rem" }}>
              <textarea value={promptTemplate} onChange={e=>setPromptTemplate(e.target.value)} rows={8} style={{width:"100%"}} />
            </div>
          )}
        </form>
      )}

      {activeTab === "new" && loadingSim && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ 
            width: "100%", 
            height: "20px", 
            backgroundColor: "#f0f0f0", 
            borderRadius: "10px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#0077b6",
              transition: "width 0.3s ease-in-out"
            }} />
          </div>
          <p style={{ marginTop: "0.5rem", textAlign: "center" }}>
            Generating personas... {Math.round(progress)}%
          </p>
        </div>
      )}

      {activeTab === "new" && errorSim && (
        <p style={{ marginTop: "1rem", color: "red" }}>{errorSim}</p>
      )}

      {activeTab === "new" && runId && (
        <p style={{ fontStyle: "italic" }}>Run ID: {runId}</p>
      )}

      {activeTab === "new" && summary && (
        <div style={{ marginTop: "2rem", background: "#eef", padding: "1rem" }}>
          <h2>Key Themes</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{summary}</pre>
        </div>
      )}

      {activeTab === "new" && surveyGridLabels && (
        <div style={{ marginTop: "0.5rem" }}>
          <strong>Survey Grid:</strong>
          <div>Support: {surveyGridLabels.support_label}</div>
          <div>Impacts: {surveyGridLabels.impact_labels?.join(", ")}</div>
        </div>
      )}

      {activeTab === "new" && responses && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Support Level Distribution</h3>
          <ResponsiveContainer width="100%" height={270}>
            {(() => {
              const chartData = buildSupportDataWithSummaries(responses, driverSummary).sort((a, b) => Number(a.level) - Number(b.level)).reverse();
              console.log('BarChart data:', chartData);
              return (
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 30, right: 20, left: 40, bottom: 0 }}
                  barCategoryGap="20%"
                  barGap={2}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="level" label={{ value: "Support Level", angle: -90, position: "insideLeft" }} interval={0} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [
                        <div key="summary">
                          <strong>Level {data.level}</strong>
                          <br />
                          {data.summary}
                          <br />
                          {`Percent: ${data.percent.toFixed(1)}%`}
                        </div>
                      ];
                    }}
                  />
                  <Bar dataKey="percent" fill="#0077b6" isAnimationActive={false}>
                    <LabelList
                      dataKey="summary"
                      position="right"
                      content={(props) => {
                        const { x, y, width, height, value, payload } = props as any;
                        console.log('LabelList props:', { x, y, width, height, value, payload });
                        const minOffset = 40;
                        const barEnd = Math.max(Number(x) + Number(width), Number(x) + minOffset);
                        return (
                          <text
                            x={barEnd + 12}
                            y={Number(y) + Number(height) / 2}
                            textAnchor="start"
                            fontSize={13}
                            fill="#333"
                            style={{ pointerEvents: "none", fontWeight: 500 }}
                            alignmentBaseline="middle"
                          >
                            {value || "NO VALUE"}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              );
            })()}
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "new" && responses && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Age Distribution (Personas vs Population)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={buildAgeOverlay(runDemo)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickFormatter={(v)=>v.length>10?v.slice(0,9)+"…":v} />
              <YAxis tickFormatter={(v)=>`${Number(v).toFixed(0)}%`} />
              <Tooltip formatter={(v)=>`${Number(v).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="persona" fill="#0077b6" />
              <Bar dataKey="population" fill="#cccccc" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "new" && responses && (
        <div style={{ marginTop: "2rem", display: "flex", gap: "2rem", flexWrap:"wrap" }}>
          <div>
            <h3>Gender Distribution</h3>
            <ResponsiveContainer width={320} height={340}>
              <PieChart>
                <Pie data={buildPieData(runDemo, "gender")} dataKey="value" nameKey="name" outerRadius={100} label>
                  {buildPieData(runDemo, "gender").map((entry, index) => (
                    <Cell key={`c-${index}`} fill={colorForSlice("gender", entry.name, index)} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3>Political Leaning</h3>
            <ResponsiveContainer width={320} height={340}>
              <PieChart>
                <Pie data={buildPieData(runDemo, "political")} dataKey="value" nameKey="name" outerRadius={100} label>
                  {buildPieData(runDemo, "political").map((entry, index) => (
                    <Cell key={`c2-${index}`} fill={colorForSlice("political", entry.name, index)} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3>Education Level</h3>
            <ResponsiveContainer width={320} height={340}>
              <PieChart>
                <Pie data={buildPieData(runDemo, "education")} dataKey="value" nameKey="name" outerRadius={100} label>
                  {buildPieData(runDemo, "education").map((e,index)=>(<Cell key={`e-${index}`} fill={colorForSlice("education", e.name, index)} />))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "new" && locationFreq && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Top Locations (Personas)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationData(locationFreq)} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip />
              <Bar dataKey="value" fill="#90be6d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "new" && responses && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Responses</h2>
          {responses.map((p) => (
            <PersonaCard key={p.id} persona={p} />
          ))}
        </div>
      )}

      {activeTab === "new" && showCritic && (
        <QuestionCriticModal
          initialQuestion={question}
          initialPromptTemplate={promptTemplate}
          onAccept={(q, dims, tpl, gridLabels) => {
            setQuestion(q);
            setImpactDims(dims);
            setPromptTemplate(tpl);
            setSurveyGridLabels(gridLabels);
            setShowCritic(false);
          }}
          onClose={() => setShowCritic(false)}
        />
      )}

      {activeTab === "history" && (
        <div>
          {!runs && <p>Loading runs…</p>}
          {runs && (
            <div style={{ display: "flex" }}>
              <div style={{ width: "250px", borderRight: "1px solid #ccc", paddingRight: "1rem" }}>
                <h3>Runs</h3>
                <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                  {runs.map((r) => (
                    <li key={r.id} style={{ marginBottom: "0.75rem" }}>
                      <button
                        onClick={() => loadRun(r.id!)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{new Date(r.timestamp || r.id!).toLocaleString()}</div>
                        <div style={{ fontSize: "0.85rem", color: "#555" }}>
                          {r.question ? `${r.question.slice(0, 40)}${r.question.length > 40 ? "…" : ""}` : "(no question)"}
                        </div>
                        {r.persona_count !== undefined && (
                          <div style={{ fontSize: "0.75rem", color: "#777" }}>
                            {r.persona_count} personas
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flex: 1, paddingLeft: "1rem" }}>
                {selectedRun ? (
                  <div>
                    <h2>Run {selectedRun.run_id || selectedRun.id}</h2>
                    <p><strong>Question:</strong> {selectedRun.question}</p>
                    <p><strong>Area:</strong> {selectedRun.area || "All"}</p>
                    <pre style={{ background: "#eef", padding: "0.5rem" }}>{selectedRun.summary}</pre>
                    {selectedRun.responses && (
                      <>
                        <div style={{ marginTop: "1rem" }}>
                          <h3>Support Level Distribution</h3>
                          <ResponsiveContainer width="100%" height={270}>
                            {(() => {
                              const chartData = buildSupportDataWithSummaries(selectedRun.responses, selectedRun.driver_summary).sort((a, b) => Number(a.level) - Number(b.level)).reverse();
                              console.log('BarChart data (history):', chartData);
                              return (
                                <BarChart
                                  data={chartData}
                                  layout="vertical"
                                  margin={{ top: 30, right: 20, left: 40, bottom: 0 }}
                                  barCategoryGap="20%"
                                  barGap={2}
                                >
                                  <XAxis type="number" domain={[0, 100]} hide />
                                  <YAxis type="category" dataKey="level" label={{ value: "Support Level", angle: -90, position: "insideLeft" }} interval={0} />
                                  <Tooltip
                                    formatter={(value, name, props) => {
                                      const data = props.payload;
                                      return [
                                        <div key="summary">
                                          <strong>Level {data.level}</strong>
                                          <br />
                                          {data.summary}
                                          <br />
                                          {`Percent: ${data.percent.toFixed(1)}%`}
                                        </div>
                                      ];
                                    }}
                                  />
                                  <Bar dataKey="percent" fill="#0077b6" isAnimationActive={false}>
                                    <LabelList
                                      dataKey="summary"
                                      position="right"
                                      content={(props) => {
                                        const { x, y, width, height, value, payload } = props as any;
                                        console.log('LabelList props (history):', { x, y, width, height, value, payload });
                                        const minOffset = 60;
                                        const barEnd = Math.max(Number(x) + Number(width), Number(x) + minOffset);
                                        return (
                                          <text
                                            x={barEnd + 12}
                                            y={Number(y) + Number(height) / 2}
                                            textAnchor="start"
                                            fontSize={13}
                                            fill="#333"
                                            style={{ pointerEvents: "none", fontWeight: 500 }}
                                            alignmentBaseline="middle"
                                          >
                                            {value || "NO VALUE"}
                                          </text>
                                        );
                                      }}
                                    />
                                  </Bar>
                                </BarChart>
                              );
                            })()}
                          </ResponsiveContainer>
                        </div>
                        <div style={{ marginTop: "1rem" }}>
                          <h3>Age Distribution (Personas vs Population)</h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={buildAgeOverlay(selectedRun.demographics)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tickFormatter={(v)=>v.length>10?v.slice(0,9)+"…":v} />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="persona" fill="#0077b6" />
                              <Bar dataKey="population" fill="#cccccc" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: "flex", gap: "2rem", marginTop:"1rem", flexWrap:"wrap" }}>
                          <div>
                            <h3>Gender Distribution</h3>
                            <ResponsiveContainer width={320} height={340}>
                              <PieChart>
                                <Pie data={buildPieData(selectedRun.demographics, "gender")} dataKey="value" nameKey="name" outerRadius={100} label>
                                  {buildPieData(selectedRun.demographics, "gender").map((e: any, i:number)=>(
                                    <Cell key={`g-${i}`} fill={colorForSlice("gender", e.name, i)} />
                                  ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <h3>Political Leaning</h3>
                            <ResponsiveContainer width={320} height={340}>
                              <PieChart>
                                <Pie data={buildPieData(selectedRun.demographics, "political")} dataKey="value" nameKey="name" outerRadius={100} label>
                                  {buildPieData(selectedRun.demographics, "political").map((e:any,i:number)=>(
                                    <Cell key={`p-${i}`} fill={colorForSlice("political", e.name, i)} />
                                  ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <h3>Education Level</h3>
                            <ResponsiveContainer width={320} height={340}>
                              <PieChart>
                                <Pie data={buildPieData(selectedRun.demographics, "education")} dataKey="value" nameKey="name" outerRadius={100} label>
                                  {buildPieData(selectedRun.demographics, "education").map((e:any,i:number)=>(<Cell key={`ed-${i}`} fill={colorForSlice("education", e.name, i)} />))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        {selectedRun.location_freq && (
                          <div style={{ marginTop: "1rem" }}>
                            <h3>Top Locations (Personas)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={locationData(selectedRun.location_freq)} layout="vertical" margin={{ left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis type="category" dataKey="name" width={150} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#90be6d" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </>
                    )}
                    {selectedRun.responses && selectedRun.responses.map((p: Persona) => (
                      <PersonaCard key={p.id} persona={p} />
                    ))}
                  </div>
                ) : (
                  <p>Select a run to view details.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
} 