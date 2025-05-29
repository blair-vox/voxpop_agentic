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
import { useAuth } from "react-oidc-context";
import { useApi } from "../lib/api";

// Modern muted and color-blind friendly color scheme
const colors = {
  primary: "#4f46e5",      // Indigo (darker)
  secondary: "#7c3aed",    // Purple (darker)
  accent: "#0891b2",       // Cyan (darker)
  success: "#059669",      // Emerald (darker)
  warning: "#d97706",      // Amber (darker)
  error: "#dc2626",        // Red (darker)
  background: "#fefefe",   // Almost white
  surface: "#f8fafc",      // Light gray
  muted: "#64748b",        // Slate
  text: "#1e293b",         // Dark slate
  border: "#e2e8f0",       // Light border
  pastel: {
    blue: "#e0e7ff",       // More muted blue
    purple: "#ede9fe",     // More muted purple
    green: "#d1fae5",      // Keep green as is
    yellow: "#fef3c7",     // Keep yellow as is
    pink: "#fce7f3",       // Keep pink as is
    orange: "#fed7aa"      // Keep orange as is
  },
  // Color-blind friendly palette for charts
  chart: {
    red: "#d73027",        // Strong red
    orange: "#fc8d59",     // Orange
    yellow: "#fee08b",     // Yellow
    lightBlue: "#91bfdb",  // Light blue
    darkBlue: "#4575b4"    // Dark blue
  }
};

type Step = "welcome" | "question-review" | "persona-setup" | "simulation" | "results";

// Step components defined outside to prevent re-rendering
const StepIndicator = ({ currentStep, completedSteps, colors }: {
  currentStep: Step;
  completedSteps: Set<Step>;
  colors: any;
}) => (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    marginBottom: "3rem",
    padding: "0 2rem"
  }}>
    {[
      { key: "welcome", label: "Welcome" },
      { key: "question-review", label: "Question Review" },
      { key: "persona-setup", label: "Setup" },
      { key: "simulation", label: "Simulation" },
      { key: "results", label: "Results" }
    ].map((step, index) => (
      <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: currentStep === step.key ? colors.primary : 
                         completedSteps.has(step.key as Step) ? colors.success : colors.border,
          color: currentStep === step.key || completedSteps.has(step.key as Step) ? "white" : colors.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "600",
          fontSize: "14px",
          transition: "all 0.3s ease"
        }}>
          {completedSteps.has(step.key as Step) ? "✓" : index + 1}
        </div>
        <span style={{
          marginLeft: "8px",
          marginRight: "24px",
          fontSize: "14px",
          color: currentStep === step.key ? colors.primary : colors.muted,
          fontWeight: currentStep === step.key ? "600" : "400"
        }}>
          {step.label}
        </span>
        {index < 4 && (
          <div style={{
            width: "40px",
            height: "2px",
            backgroundColor: colors.border,
            marginRight: "24px"
          }} />
        )}
      </div>
    ))}
  </div>
);

const WelcomeStep = ({ 
  question, 
  setQuestion, 
  context, 
  setContext, 
  onContinue,
  pastRuns,
  loadingPastRuns,
  onLoadPastRun,
  colors 
}: {
  question: string;
  setQuestion: (q: string) => void;
  context: string;
  setContext: (c: string) => void;
  onContinue: () => void;
  pastRuns: any[];
  loadingPastRuns: boolean;
  onLoadPastRun: (runId: string) => void;
  colors: any;
}) => (
  <div style={{
    maxWidth: "800px",
    margin: "0 auto",
    textAlign: "center",
    padding: "4rem 2rem"
  }}>
    <h1 style={{
      fontSize: "3.5rem",
      fontWeight: "700",
      color: colors.text,
      marginBottom: "1rem",
      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent"
    }}>
      Welcome to VoxPop AI
    </h1>
    <h2 style={{
      fontSize: "1.5rem",
      color: colors.muted,
      marginBottom: "3rem",
      fontWeight: "400"
    }}>
      Your AI-powered sounding board for community insights
    </h2>
    
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: "16px",
      padding: "3rem",
      border: `1px solid ${colors.border}`,
      textAlign: "left"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <h3 style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          color: colors.text,
          margin: 0
        }}>
          What question do you need answered?
        </h3>
        
        {pastRuns.length > 0 && (
          <div style={{ position: "relative" }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const selectedRun = pastRuns.find(run => run.id === e.target.value);
                  if (selectedRun) {
                    setQuestion(selectedRun.question || "");
                  }
                  e.target.value = ""; // Reset dropdown
                }
              }}
              style={{
                padding: "0.5rem",
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: colors.surface,
                color: colors.text,
                cursor: "pointer"
              }}
            >
              <option value="">Recent questions...</option>
              {pastRuns.slice(0, 5).map((run) => (
                <option key={run.id} value={run.id}>
                  {run.question?.length > 50 ? `${run.question.substring(0, 50)}...` : run.question}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g., Should we remove minimum parking requirements for new apartments in our area?"
        style={{
          width: "100%",
          minHeight: "120px",
          padding: "1rem",
          border: `2px solid ${colors.border}`,
          borderRadius: "12px",
          fontSize: "16px",
          fontFamily: "inherit",
          resize: "vertical",
          transition: "border-color 0.2s ease",
          marginBottom: "1.5rem"
        }}
        onFocus={(e) => e.target.style.borderColor = colors.primary}
        onBlur={(e) => e.target.style.borderColor = colors.border}
      />
      
      <h4 style={{
        fontSize: "1rem",
        fontWeight: "600",
        color: colors.text,
        marginBottom: "0.5rem"
      }}>
        Additional context (optional)
      </h4>
      <p style={{
        fontSize: "14px",
        color: colors.muted,
        marginBottom: "1rem"
      }}>
        Help us understand the background, stakeholders, or specific concerns
      </p>
      
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="e.g., This is for a dense urban area with limited public transport..."
        style={{
          width: "100%",
          minHeight: "80px",
          padding: "1rem",
          border: `2px solid ${colors.border}`,
          borderRadius: "12px",
          fontSize: "16px",
          fontFamily: "inherit",
          resize: "vertical",
          transition: "border-color 0.2s ease",
          marginBottom: "2rem"
        }}
        onFocus={(e) => e.target.style.borderColor = colors.primary}
        onBlur={(e) => e.target.style.borderColor = colors.border}
      />
      
      <button
        onClick={onContinue}
        disabled={!question.trim()}
        style={{
          backgroundColor: question.trim() ? colors.primary : colors.border,
          color: "white",
          border: "none",
          borderRadius: "12px",
          padding: "1rem 2rem",
          fontSize: "16px",
          fontWeight: "600",
          cursor: question.trim() ? "pointer" : "not-allowed",
          transition: "all 0.2s ease",
          width: "100%"
        }}
      >
        Continue to Question Review
      </button>
    </div>
    
    {/* Past Questions Section */}
    {pastRuns.length > 0 && (
      <div style={{
        maxWidth: "800px",
        margin: "3rem auto 0 auto",
        padding: "0 2rem"
      }}>
        <h3 style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "1.5rem",
          textAlign: "center"
        }}>
          Or load a previous question
        </h3>
        
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: "16px",
          padding: "2rem",
          border: `1px solid ${colors.border}`
        }}>
          {loadingPastRuns ? (
            <div style={{ textAlign: "center", color: colors.muted }}>
              Loading past questions...
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {pastRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => onLoadPastRun(run.id)}
                  style={{
                    padding: "1rem",
                    backgroundColor: colors.background,
                    borderRadius: "8px",
                    border: `1px solid ${colors.border}`,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.pastel.blue;
                    e.currentTarget.style.borderColor = colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <div style={{
                    fontSize: "14px",
                    color: colors.muted,
                    marginBottom: "0.5rem"
                  }}>
                    {new Date(run.timestamp).toLocaleDateString()} • {run.persona_count} personas
                  </div>
                  <div style={{
                    fontSize: "16px",
                    color: colors.text,
                    fontWeight: "500",
                    lineHeight: "1.4"
                  }}>
                    {run.question?.length > 120 ? `${run.question.substring(0, 120)}...` : run.question}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

const QuestionReviewStep = ({ 
  question, 
  questionCritic, 
  selectedDomain,
  setSelectedDomain,
  onAccept, 
  onReject, 
  colors 
}: { 
  question: string; 
  questionCritic: any;
  selectedDomain: string;
  setSelectedDomain: (domain: string) => void;
  onAccept: () => void;
  onReject: () => void;
  colors: any; 
}) => {
  
  // Domain definitions with their impact dimensions
  const domainDefinitions = {
    "civic-policy": {
      name: "Civic Policy",
      dimensions: ["Housing", "Transport", "Community", "Environment", "Economy"]
    },
    "product-design": {
      name: "Product Design", 
      dimensions: ["Usability", "Accessibility", "Trust", "Cost"]
    },
    "employee-engagement": {
      name: "Employee Engagement",
      dimensions: ["Workload", "Growth", "Culture"]
    },
    "marketing-copy": {
      name: "Marketing Copy",
      dimensions: ["Clarity", "Emotional Appeal", "Brand Fit"]
    },
    "technology-adoption": {
      name: "Technology Adoption",
      dimensions: ["Ease of Use", "Privacy & Security", "Reliability", "Learning Curve"]
    },
    "ai-adoption": {
      name: "AI Adoption",
      dimensions: ["Innovation Readiness", "Ethical Concerns", "Job Impact", "Pace of Change"]
    }
  };

  return (
    <div style={{
      maxWidth: "900px",
      margin: "0 auto",
      padding: "2rem"
    }}>
      <h2 style={{
        fontSize: "2rem",
        fontWeight: "600",
        color: colors.text,
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        Question Review
      </h2>
      
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: "16px",
        padding: "2rem",
        border: `1px solid ${colors.border}`,
        marginBottom: "2rem"
      }}>
        <div style={{
          backgroundColor: colors.pastel.blue,
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <strong style={{ color: colors.text }}>Your Original Question:</strong>
          <p style={{ margin: "0.5rem 0 0 0", color: colors.text }}>{question}</p>
        </div>
        
        {questionCritic?.rewritten && questionCritic.rewritten !== question && (
          <div style={{
            backgroundColor: colors.pastel.green,
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "2rem"
          }}>
            <strong style={{ color: colors.text }}>Suggested Improvement:</strong>
            <p style={{ margin: "0.5rem 0 0 0", color: colors.text }}>{questionCritic.rewritten}</p>
          </div>
        )}

        {/* Domain Selection */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: colors.text,
            marginBottom: "1rem"
          }}>
            Select Question Domain
          </h3>
          <p style={{
            fontSize: "14px",
            color: colors.muted,
            marginBottom: "1.5rem"
          }}>
            {questionCritic?.domain ? 
              `AI suggests: ${domainDefinitions[questionCritic.domain as keyof typeof domainDefinitions]?.name || questionCritic.domain}` :
              "Choose the domain that best fits your question"
            }
          </p>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem"
          }}>
            {Object.entries(domainDefinitions).map(([key, domain]) => (
              <div
                key={key}
                onClick={() => setSelectedDomain(key)}
                style={{
                  padding: "1rem",
                  backgroundColor: selectedDomain === key ? colors.pastel.purple : colors.background,
                  border: `2px solid ${selectedDomain === key ? colors.primary : colors.border}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (selectedDomain !== key) {
                    e.currentTarget.style.backgroundColor = colors.pastel.blue;
                    e.currentTarget.style.borderColor = colors.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDomain !== key) {
                    e.currentTarget.style.backgroundColor = colors.background;
                    e.currentTarget.style.borderColor = colors.border;
                  }
                }}
              >
                <div style={{
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  {domain.name}
                  {questionCritic?.domain === key && (
                    <span style={{
                      fontSize: "12px",
                      backgroundColor: colors.success,
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}>
                      AI Suggested
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: colors.muted,
                  lineHeight: "1.4"
                }}>
                  {domain.dimensions.map((dim, index) => (
                    <div key={dim} style={{ marginBottom: "2px" }}>
                      {dim}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center"
        }}>
          <button
            onClick={onAccept}
            style={{
              backgroundColor: colors.success,
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {questionCritic?.rewritten && questionCritic.rewritten !== question ? "Use Suggested Question" : "Continue with Original"}
          </button>
          
          {questionCritic?.rewritten && questionCritic.rewritten !== question && (
            <button
              onClick={onReject}
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                padding: "0.75rem 1.5rem",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Keep Original Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PersonaSetupStep = ({ 
  numberOfPersonas, 
  setNumberOfPersonas, 
  area, 
  setArea, 
  onStartSimulation, 
  colors 
}: {
  numberOfPersonas: number;
  setNumberOfPersonas: (n: number) => void;
  area: string;
  setArea: (a: string) => void;
  onStartSimulation: () => void;
  colors: any;
}) => (
  <div style={{
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem"
  }}>
    <h2 style={{
      fontSize: "2rem",
      fontWeight: "600",
      color: colors.text,
      marginBottom: "2rem",
      textAlign: "center"
    }}>
      Persona Generation Setup
    </h2>
    
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: "16px",
      padding: "3rem",
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ marginBottom: "2rem" }}>
        <label style={{
          display: "block",
          fontSize: "1.1rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "0.5rem"
        }}>
          How many personas should consider this question?
        </label>
        <p style={{
          fontSize: "14px",
          color: colors.muted,
          marginBottom: "1rem"
        }}>
          More personas provide broader perspectives but take longer to generate
        </p>
        <input
          type="number"
          value={numberOfPersonas}
          onChange={(e) => setNumberOfPersonas(Number(e.target.value))}
          min="1"
          max="50"
          style={{
            width: "120px",
            padding: "0.75rem",
            border: `2px solid ${colors.border}`,
            borderRadius: "8px",
            fontSize: "16px",
            textAlign: "center"
          }}
        />
      </div>
      
      <div style={{ marginBottom: "2rem" }}>
        <label style={{
          display: "block",
          fontSize: "1.1rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "0.5rem"
        }}>
          Geographic Area (optional)
        </label>
        <p style={{
          fontSize: "14px",
          color: colors.muted,
          marginBottom: "1rem"
        }}>
          Focus on a specific area or leave blank for general population
        </p>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="e.g., Bondi, Sydney, Melbourne CBD"
          style={{
            width: "100%",
            padding: "0.75rem",
            border: `2px solid ${colors.border}`,
            borderRadius: "8px",
            fontSize: "16px"
          }}
        />
      </div>
      
      <button
        onClick={onStartSimulation}
        style={{
          backgroundColor: colors.primary,
          color: "white",
          border: "none",
          borderRadius: "12px",
          padding: "1rem 2rem",
          fontSize: "16px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s ease",
          width: "100%"
        }}
      >
        Start Simulation
      </button>
    </div>
  </div>
);

const SimulationStep = ({ numberOfPersonas, progress, colors }: {
  numberOfPersonas: number;
  progress: number;
  colors: any;
}) => (
  <div style={{
    maxWidth: "600px",
    margin: "0 auto",
    padding: "4rem 2rem",
    textAlign: "center"
  }}>
    <h2 style={{
      fontSize: "2rem",
      fontWeight: "600",
      color: colors.text,
      marginBottom: "2rem"
    }}>
      Generating Insights
    </h2>
    
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: "16px",
      padding: "3rem",
      border: `1px solid ${colors.border}`
    }}>
      <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        border: `4px solid ${colors.pastel.blue}`,
        borderTop: `4px solid ${colors.primary}`,
        margin: "0 auto 2rem auto",
        animation: "spin 1s linear infinite"
      }} />
      
      <h3 style={{
        fontSize: "1.25rem",
        fontWeight: "600",
        color: colors.text,
        marginBottom: "1rem"
      }}>
        Creating {numberOfPersonas} AI personas...
      </h3>
      
      <div style={{
        backgroundColor: colors.pastel.green,
        borderRadius: "12px",
        padding: "1rem",
        marginBottom: "2rem"
      }}>
        <div style={{
          width: "100%",
          height: "8px",
          backgroundColor: "white",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: colors.success,
            transition: "width 0.3s ease"
          }} />
        </div>
        <p style={{
          margin: "0.5rem 0 0 0",
          fontSize: "14px",
          color: colors.text
        }}>
          {Math.round(progress)}% complete
        </p>
      </div>
      
      <p style={{
        color: colors.muted,
        fontSize: "14px"
      }}>
        Each persona is considering your question from their unique perspective...
      </p>
    </div>
  </div>
);

const ResultsStep = ({ 
  responses, 
  summary, 
  runId, 
  question,
  buildSupportData,
  buildImpactData,
  buildDemographicData,
  driverSummary,
  onNewQuestion,
  colors 
}: {
  responses: Persona[] | null;
  summary: string | null;
  runId: string | null;
  question: string;
  buildSupportData: (respArray: any[]) => any[];
  buildImpactData: (respArray: any[]) => any[];
  buildDemographicData: (respArray: any[]) => any;
  driverSummary: any[] | null;
  onNewQuestion: () => void;
  colors: any;
}) => (
  <div>
    {/* Question Banner */}
    <div style={{
      backgroundColor: colors.primary,
      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
      color: "white",
      padding: "3rem 2rem",
      marginBottom: "3rem"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "600",
            margin: 0,
            marginBottom: "1rem",
            color: "white"
          }}>
            Community Insights
          </h1>
          <div style={{
            fontSize: "1.5rem",
            fontWeight: "400",
            lineHeight: "1.4",
            color: "rgba(255, 255, 255, 0.9)"
          }}>
            {question}
          </div>
        </div>
        <button
          onClick={onNewQuestion}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "12px",
            padding: "1rem 2rem",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginLeft: "2rem",
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
          }}
        >
          New Question
        </button>
      </div>
    </div>
    
    <div style={{ padding: "0 2rem 2rem 2rem" }}>
    
    {/* Three main insight panels */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "2rem",
      marginBottom: "4rem"
    }}>
      {/* Support Distribution */}
      <div style={{
        backgroundColor: colors.pastel.blue,
        borderRadius: "16px",
        padding: "2rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "180px"
      }}>
        <h3 style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "1rem"
        }}>
          Overall Support
        </h3>
        {responses && (
          <div style={{ fontSize: "3rem", fontWeight: "700", color: colors.primary }}>
            {Math.round(buildSupportData(responses).reduce((acc, item) => 
              acc + (item.level >= "3" ? item.percent : 0), 0))}%
          </div>
        )}
        <p style={{ color: colors.muted, marginTop: "0.5rem" }}>
          Support or neutral
        </p>
      </div>
      
      {/* Key Themes */}
      <div style={{
        backgroundColor: colors.pastel.green,
        borderRadius: "16px",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "180px"
      }}>
        <h3 style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "1rem",
          textAlign: "center"
        }}>
          Key Themes
        </h3>
        {summary && (
          <div style={{
            fontSize: "14px",
            color: colors.text,
            lineHeight: "1.5",
            textAlign: "left"
          }}>
            {summary.split('\n').slice(0, 3).map((line, i) => (
              <p key={i} style={{ margin: "0.5rem 0" }}>{line}</p>
            ))}
          </div>
        )}
      </div>
      
      {/* Demographics */}
      <div style={{
        backgroundColor: colors.pastel.purple,
        borderRadius: "16px",
        padding: "2rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "180px"
      }}>
        <h3 style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "1rem"
        }}>
          Perspectives
        </h3>
        <div style={{ fontSize: "3rem", fontWeight: "700", color: colors.secondary }}>
          {responses?.length || 0}
        </div>
        <p style={{ color: colors.muted, marginTop: "0.5rem" }}>
          Unique personas considered
        </p>
      </div>
    </div>
    
    {/* Charts */}
    {responses && (
      <>
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: "16px",
          padding: "2rem",
          border: `1px solid ${colors.border}`,
          marginBottom: "2rem"
        }}>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: colors.text,
            marginBottom: "2rem"
          }}>
            Support Level Distribution
          </h3>
          
          {/* Custom horizontal bar chart with insights */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {buildSupportData(responses).map((item, index) => {
              const levelDrivers = driverSummary?.find(d => d.level === parseInt(item.level))?.drivers || [];
              const topDrivers = levelDrivers.slice(0, 3).map(([driver, count]: [string, number]) => driver);
              
              return (
                <div key={item.level} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {/* Level label */}
                  <div style={{
                    minWidth: "60px",
                    textAlign: "center",
                    fontWeight: "600",
                    color: colors.text
                  }}>
                    Level {item.level}
                  </div>
                  
                  {/* Bar container */}
                  <div style={{
                    flex: "1",
                    height: "40px",
                    backgroundColor: colors.border,
                    borderRadius: "20px",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* Bar fill */}
                    <div style={{
                      width: `${item.percent}%`,
                      height: "100%",
                      backgroundColor: [colors.chart.red, colors.chart.orange, colors.chart.yellow, colors.chart.lightBlue, colors.chart.darkBlue][index],
                      borderRadius: "20px",
                      transition: "width 0.5s ease"
                    }} />
                    
                    {/* Percentage label */}
                    <div style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "14px",
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.2)"
                    }}>
                      {item.percent.toFixed(1)}% ({item.count})
                    </div>
                  </div>
                  
                  {/* Key insights */}
                  <div style={{
                    minWidth: "300px",
                    fontSize: "12px",
                    color: colors.muted,
                    lineHeight: "1.3"
                  }}>
                    {topDrivers.length > 0 ? (
                      <div>
                        <strong>Key themes:</strong> {topDrivers.join(", ")}
                      </div>
                    ) : (
                      <div style={{ fontStyle: "italic" }}>No responses at this level</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact Areas Chart */}
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: "16px",
          padding: "2rem",
          border: `1px solid ${colors.border}`,
          marginBottom: "2rem"
        }}>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: colors.text,
            marginBottom: "2rem"
          }}>
            Impact Assessment by Area
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={buildImpactData(responses)}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="impact" />
              <YAxis domain={[1, 5]} />
              <Tooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "8px" }} />
              <Bar dataKey="average" fill={colors.chart.darkBlue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Demographics Charts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          marginBottom: "2rem"
        }}>
          {/* Age Distribution */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: "16px",
            padding: "2rem",
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: colors.text,
              marginBottom: "1rem"
            }}>
              Age Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={buildDemographicData(responses).age}
                  dataKey="count"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill={colors.accent}
                  label={CustomPieLabel}
                  labelLine={false}
                >
                  {buildDemographicData(responses).age.map((entry: any, index: number) => (
                    <Cell key={`age-${index}`} fill={[colors.chart.darkBlue, colors.chart.lightBlue, colors.chart.orange, colors.chart.red][index % 4]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gender Distribution */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: "16px",
            padding: "2rem",
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: colors.text,
              marginBottom: "1rem"
            }}>
              Gender Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={buildDemographicData(responses).gender}
                  dataKey="count"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill={colors.secondary}
                  label={CustomPieLabel}
                  labelLine={false}
                >
                  {buildDemographicData(responses).gender.map((entry: any, index: number) => (
                    <Cell key={`gender-${index}`} fill={[colors.chart.darkBlue, colors.chart.orange, colors.chart.red][index % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Income Distribution */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: "16px",
            padding: "2rem",
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: colors.text,
              marginBottom: "1rem"
            }}>
              Income Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={buildDemographicData(responses).income}
                  dataKey="count"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill={colors.success}
                  label={CustomPieLabel}
                  labelLine={false}
                >
                  {buildDemographicData(responses).income.map((entry: any, index: number) => (
                    <Cell key={`income-${index}`} fill={[colors.chart.lightBlue, colors.chart.yellow, colors.chart.orange][index % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    )}
    
    {/* Individual Responses */}
    {responses && (
      <div>
        <h3 style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: colors.text,
          marginBottom: "2rem"
        }}>
          Individual Responses
        </h3>
        <div style={{
          display: "grid",
          gap: "1rem"
        }}>
          {responses.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} runId={runId} />
          ))}
        </div>
      </div>
    )}
    </div>
  </div>
);

// Custom label component for pie charts
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, group }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#1e293b" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="13"
      fontWeight="600"
      style={{
        textShadow: "1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8)"
      }}
    >
      {`${group} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function Home() {
  // Journey state
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  
  // Form data
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [numberOfPersonas, setNumberOfPersonas] = useState(10);
  const [area, setArea] = useState("");
  
  // Question critic state
  const [questionCritic, setQuestionCritic] = useState<any>(null);
  const [showCriticModal, setShowCriticModal] = useState(false);
  
  // Simulation state
  const [loadingSim, setLoadingSim] = useState(false);
  const [progress, setProgress] = useState(0);
  const [responses, setResponses] = useState<Persona[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runDemo, setRunDemo] = useState<any | null>(null);
  const [driverSummary, setDriverSummary] = useState<DriverSummaryRow[] | null>(null);
  const [locationFreq, setLocationFreq] = useState<Record<string, number> | null>(null);

  // Past runs state
  const [pastRuns, setPastRuns] = useState<any[]>([]);
  const [loadingPastRuns, setLoadingPastRuns] = useState(false);
  
  // Other state
  const [domain, setDomain] = useState<string>("civic-policy");
  const [impactDims, setImpactDims] = useState<string[]>([]);
  const [promptTemplate, setPromptTemplate] = useState("");
  const [surveyGridLabels, setSurveyGridLabels] = useState<any>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("civic-policy");
  const [isPending, startTransition] = useTransition();

  const auth = useAuth();
  const { request } = useApi();

  const markStepComplete = (step: Step) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const restartProcess = () => {
    setCurrentStep("welcome");
    setCompletedSteps(new Set());
    setQuestion("");
    setContext("");
    setNumberOfPersonas(10);
    setArea("");
    setQuestionCritic(null);
    setShowCriticModal(false);
    setLoadingSim(false);
    setProgress(0);
    setResponses(null);
    setSummary(null);
    setRunId(null);
    setRunDemo(null);
    setDriverSummary(null);
    setLocationFreq(null);
    setDomain("civic-policy");
    setImpactDims([]);
    setPromptTemplate("");
    setSurveyGridLabels(null);
    setSelectedDomain("civic-policy");
  };

  const loadPastRuns = async () => {
    setLoadingPastRuns(true);
    try {
      const data = await request<any[]>("/runs/");
      setPastRuns(data.slice(0, 5)); // Show only the 5 most recent
    } catch (e) {
      console.error("Failed to load past runs:", e);
    } finally {
      setLoadingPastRuns(false);
    }
  };

  const loadPastRun = async (runId: string) => {
    try {
      const data = await request<any>(`/runs/${runId}`);
      
      // Load the run data into current state
      setQuestion(data.question || "");
      setArea(data.area || "");
      setDomain(data.domain || "civic-policy");
      setSelectedDomain(data.domain || "civic-policy");
      setResponses(data.responses || []);
      setSummary(data.summary || "");
      setRunId(data.run_id);
      setRunDemo(data.demographics);
      setDriverSummary(data.driver_summary);
      setLocationFreq(data.location_freq);
      setImpactDims(data.impact_dims || []);
      setPromptTemplate(data.prompt_template || "");
      setSurveyGridLabels(data.survey_grid_labels);
      setNumberOfPersonas(data.responses?.length || 10);
      
      // Mark all steps as complete and go to results
      setCompletedSteps(new Set(["welcome", "question-review", "persona-setup", "simulation"]));
      setCurrentStep("results");

      // refresh past runs list so the new run appears in dropdown
      loadPastRuns();
    } catch (e) {
      console.error("Failed to load past run:", e);
      alert("Failed to load past run");
    }
  };

  // Load past runs once user is authenticated
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadPastRuns();
    }
  }, [auth.isAuthenticated]);

  const runQuestionCritic = async () => {
    try {
      const data = await request<any>("/question/critic", {
        method: "POST",
        body: JSON.stringify({ question, context }),
      });
      setQuestionCritic(data);
      
      // Set default domain based on AI suggestion
      if (data.domain && data.domain !== "unknown") {
        setSelectedDomain(data.domain);
      }
      
      // Always show the question review step, regardless of critic result
      // The step will handle showing the original vs suggested question
    } catch (e) {
      console.error("Question critic failed:", e);
      // Set a default critic response to continue
      setQuestionCritic({ ok: true, rewritten: null });
    }
  };

  const runSimulation = async () => {
    setLoadingSim(true);
    setProgress(0);
    goToStep("simulation");
    
    // Get impact dimensions for the selected domain
    const domainDefinitions = {
      "civic-policy": ["Housing", "Transport", "Community", "Environment", "Economy"],
      "product-design": ["Usability", "Accessibility", "Trust", "Cost"],
      "employee-engagement": ["Workload", "Growth", "Culture"],
      "marketing-copy": ["Clarity", "Emotional Appeal", "Brand Fit"],
      "technology-adoption": ["Ease of Use", "Privacy & Security", "Reliability", "Learning Curve"],
      "ai-adoption": ["Innovation Readiness", "Ethical Concerns", "Job Impact", "Pace of Change"]
    };
    
    const selectedImpactDims = domainDefinitions[selectedDomain as keyof typeof domainDefinitions] || ["Housing", "Transport", "Community"];
    
    try {
      const res = await fetch("http://localhost:8000/personas/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth.user?.access_token ? { Authorization: `Bearer ${auth.user.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...(area.trim() ? { area } : {}),
          number_of_personas: numberOfPersonas,
          questions: [question],
          domain: selectedDomain,
          impact_dims: selectedImpactDims,
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
              setLocationFreq(responseData.location_freq);
              
              markStepComplete("simulation");
              goToStep("results");
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Simulation failed:", err);
    } finally {
      setLoadingSim(false);
    }
  };

  // Helper functions for charts
  const buildSupportData = (respArray: any[]) => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    respArray.forEach((p) => {
      const v = p.survey_numbers?.support;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    
    return [1, 2, 3, 4, 5].map((k) => ({
        level: String(k),
        count: counts[k],
      percent: (counts[k] / total) * 100,
    }));
  };

  const buildImpactData = (respArray: any[]) => {
    // Get impact dimensions for the selected domain
    const domainDefinitions = {
      "civic-policy": ["Housing", "Transport", "Community", "Environment", "Economy"],
      "product-design": ["Usability", "Accessibility", "Trust", "Cost"],
      "employee-engagement": ["Workload", "Growth", "Culture"],
      "marketing-copy": ["Clarity", "Emotional Appeal", "Brand Fit"],
      "technology-adoption": ["Ease of Use", "Privacy & Security", "Reliability", "Learning Curve"],
      "ai-adoption": ["Innovation Readiness", "Ethical Concerns", "Job Impact", "Pace of Change"]
    };
    
    const impacts = domainDefinitions[selectedDomain as keyof typeof domainDefinitions] || ["Housing", "Transport", "Community"];
    
    return impacts.map(impact => {
      const fieldName = impact.toLowerCase().replace(" ", "_").replace("&", "and");
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      respArray.forEach((p, idx) => {
        const v = p.survey_numbers?.[fieldName];
        // Debug log for each persona and impact
        console.log(`[DEBUG] Persona index: ${idx}, Impact: '${impact}', Field: '${fieldName}', Value:`, v, 'survey_numbers:', p.survey_numbers);
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
      
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      const average = Object.entries(counts).reduce((acc, [level, count]) => 
        acc + (parseInt(level) * count), 0) / total;
      
      return {
        impact: impact,
        average: average.toFixed(1),
        distribution: Object.entries(counts).map(([level, count]) => ({
          level,
          count,
          percent: (count / total) * 100
        }))
      };
    });
  };

  const buildDemographicData = (respArray: any[]) => {
    // Age groups
    const ageGroups: Record<string, number> = {};
    const genderCounts: Record<string, number> = {};
    const incomeCounts: Record<string, number> = {};
    
    respArray.forEach((p) => {
      // Age grouping
      const age = parseInt(p.age);
      let ageGroup = "Unknown";
      if (age < 30) ageGroup = "18-29";
      else if (age < 45) ageGroup = "30-44";
      else if (age < 60) ageGroup = "45-59";
      else ageGroup = "60+";
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
      
      // Gender
      const gender = p.gender || "Unknown";
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
      
      // Income brackets - parse from income_annual field
      const incomeAnnual = p.income_annual || "";
      let incomeGroup = "Unknown";
      
      if (incomeAnnual.includes("$")) {
        // Extract the lower bound of the range for categorization
        const match = incomeAnnual.match(/\$([0-9,]+)/);
        if (match) {
          const amount = parseInt(match[1].replace(/,/g, ''));
          if (amount < 50000) incomeGroup = "Under $50k";
          else if (amount < 100000) incomeGroup = "$50k-$100k";
          else incomeGroup = "Over $100k";
        }
      }
      
      incomeCounts[incomeGroup] = (incomeCounts[incomeGroup] || 0) + 1;
    });
    
    return {
      age: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
      gender: Object.entries(genderCounts).map(([group, count]) => ({ group, count })),
      income: Object.entries(incomeCounts).map(([group, count]) => ({ group, count }))
    };
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: colors.background,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .btn {
          background: ${colors.primary};
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn:hover {
          background: ${colors.secondary};
        }
        
        .btn-secondary {
          background: ${colors.surface};
          color: ${colors.text};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-secondary:hover {
          background: ${colors.border};
        }
      `}</style>
      
      <div style={{ padding: "2rem 0" }}>
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} colors={colors} />
        
        {currentStep === "welcome" && <WelcomeStep
          question={question}
          setQuestion={setQuestion}
          context={context}
          setContext={setContext}
          onContinue={() => {
            if (question.trim()) {
              markStepComplete("welcome");
              goToStep("question-review");
              runQuestionCritic();
            }
          }}
          pastRuns={pastRuns}
          loadingPastRuns={loadingPastRuns}
          onLoadPastRun={loadPastRun}
          colors={colors}
        />}
        {currentStep === "question-review" && <QuestionReviewStep 
          question={question} 
          questionCritic={questionCritic}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          onAccept={() => {
            if (questionCritic?.rewritten && questionCritic.rewritten !== question) {
              setQuestion(questionCritic.rewritten);
            }
            markStepComplete("question-review");
            goToStep("persona-setup");
          }}
          onReject={() => {
            markStepComplete("question-review");
            goToStep("persona-setup");
          }}
          colors={colors} 
        />}
        {currentStep === "persona-setup" && <PersonaSetupStep
          numberOfPersonas={numberOfPersonas}
          setNumberOfPersonas={setNumberOfPersonas}
          area={area}
          setArea={setArea}
          onStartSimulation={() => {
            markStepComplete("persona-setup");
            runSimulation();
          }}
          colors={colors}
        />}
        {currentStep === "simulation" && <SimulationStep
          numberOfPersonas={numberOfPersonas}
          progress={progress}
          colors={colors}
        />}
        {currentStep === "results" && <ResultsStep
          responses={responses}
          summary={summary}
          runId={runId}
          question={question}
          buildSupportData={buildSupportData}
          buildImpactData={buildImpactData}
          buildDemographicData={buildDemographicData}
          driverSummary={driverSummary}
          onNewQuestion={restartProcess}
          colors={colors}
        />}
        </div>
      
      {showCriticModal && (
        <QuestionCriticModal
          initialQuestion={question}
          initialPromptTemplate={promptTemplate}
          onAccept={(q, dims, tpl, gridLabels) => {
            setQuestion(q);
            setImpactDims(dims);
            setPromptTemplate(tpl);
            setSurveyGridLabels(gridLabels);
            setShowCriticModal(false);
            markStepComplete("question-review");
            goToStep("persona-setup");
          }}
          onClose={() => {
            setShowCriticModal(false);
            markStepComplete("question-review");
            goToStep("persona-setup");
          }}
        />
      )}
                  </div>
  );
} 