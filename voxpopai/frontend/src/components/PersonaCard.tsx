import React from "react";
import { Persona } from "../types";
import { PersonaTimeline } from "./PersonaTimeline";

interface PersonaCardProps {
  persona: Persona;
  runId?: string | null;
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, runId }) => {
  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
      <h3>Persona {persona.id}</h3>
      <details>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Persona Details</summary>
        <ul style={{ marginTop: "0.5rem" }}>
          <li><strong>Age:</strong> {persona.age}</li>
          <li><strong>Gender:</strong> {persona.gender}</li>
          <li><strong>Location:</strong> {persona.location}</li>
          {persona.income_weekly && <li><strong>Weekly Income:</strong> {persona.income_weekly}</li>}
          {persona.income_annual && <li><strong>Annual Income:</strong> {persona.income_annual}</li>}
          <li><strong>Housing Tenure:</strong> {persona.housing_tenure}</li>
          <li><strong>Job Tenure:</strong> {persona.job_tenure}</li>
          <li><strong>Occupation:</strong> {persona.occupation}</li>
          <li><strong>Education:</strong> {persona.education}</li>
          <li><strong>Transport:</strong> {persona.transport}</li>
          <li><strong>Marital Status:</strong> {persona.marital_status}</li>
          <li><strong>Partner Activity:</strong> {persona.partner_activity}</li>
          <li><strong>Household Size:</strong> {persona.household_size}</li>
          <li><strong>Family Payments:</strong> {persona.family_payments}</li>
          <li><strong>Child Care Benefit:</strong> {persona.child_care_benefit}</li>
          <li><strong>Investment Properties:</strong> {persona.investment_properties}</li>
          <li><strong>Transport Infrastructure:</strong> {persona.transport_infrastructure}</li>
          <li><strong>Political Leaning:</strong> {persona.political_leaning}</li>
          <li><strong>Trust in Politicians:</strong> {persona.trust}</li>
          {persona.themes && persona.themes.length > 0 && (
            <li><strong>Primary Themes:</strong> {persona.themes.join(", ")}</li>
          )}
          {persona.issues && <li><strong>Issues:</strong> {Array.isArray(persona.issues) ? persona.issues.join(", ") : persona.issues}</li>}
          <li><strong>Engagement:</strong> {persona.engagement}</li>
        </ul>
      </details>
      {persona.response && (
        <div>
          <strong>Simulated Response:</strong>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: "0.5rem" }}>{persona.response}</pre>
        </div>
      )}
      {persona.error && (
        <p style={{ color: "red" }}><strong>Error:</strong> {persona.error}</p>
      )}
      {runId && <PersonaTimeline runId={runId} personaId={persona.id} />}
    </div>
  );
}; 