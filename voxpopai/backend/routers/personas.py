import pandas as pd
import random
from fastapi import APIRouter, HTTPException, Request
from voxpopai.backend.agents.response_simulator import simulate_responses, summarize_responses
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, List, Dict, Any, AsyncGenerator
from voxpopai.backend.utils import mappings as mp
from voxpopai.backend.utils.theme_categoriser import classify_multi, derive_theme_simple
from voxpopai.backend.utils.stats import demo_stats, parse_survey_numbers, location_freq
from collections import Counter, defaultdict
from voxpopai.backend.utils.driver_extractor import extract_drivers
import re
from fastapi.responses import StreamingResponse
import json
import asyncio
import uuid

router = APIRouter(prefix="/personas", tags=["Personas"])


@router.get("/")
async def list_personas() -> list[dict]:
    """Return the list of personas (stub)."""
    return []


@router.post("/")
async def create_persona(payload: dict) -> dict:
    """Create a new persona (stub)."""
    # TODO: call Persona-Builder agent
    return payload 


class SimulationRequest(BaseModel):
    area: Optional[str] = None
    number_of_personas: int
    questions: list[str]
    domain: Optional[str] = "civic-policy"


@router.post("/run")
async def run_personas(payload: SimulationRequest) -> StreamingResponse:
    """Run a simulation for the given area and number of personas."""
    try:
        # Load personas from CSV relative to package root
        csv_path = Path(__file__).resolve().parents[2] / "data" / "personas_merged.csv"
        df = pd.read_csv(csv_path)
        # If an area is provided (matched against SA2 (UR) column), filter, else use all
        if payload.area:
            df_area = df[df["SA2 (UR)"].astype(str).str.contains(payload.area, case=False, na=False)]
            if len(df_area) >= payload.number_of_personas:
                df_to_sample = df_area
            else:
                df_to_sample = df
        else:
            df_to_sample = df

        sampled_df = df_to_sample.sample(n=payload.number_of_personas, weights="weight_final", replace=True).reset_index(drop=True)
        # If the dataset has an 'ID' or 'id' column already, preserve it under a different name
        for possible in ["id", "ID"]:
            if possible in sampled_df.columns:
                sampled_df.rename(columns={possible: f"source_{possible}"}, inplace=True)
        # Add a simple sequential identifier we control
        sampled_df.insert(0, "id", sampled_df.index)

        # Prepare limited personas with mapping to human-readable values
        def map_value(mapping: dict, code):
            import pandas as _pd  # local import to avoid circular issues
            if _pd.isna(code):
                return None
            try:
                code_int = int(float(str(code).strip()))
            except (ValueError, TypeError):
                return code
            return mapping.get(code_int, "Other")

        limited_personas: List[Dict[str, Any]] = []
        for _, row in sampled_df.iterrows():
            lp = {
                "id": row["id"],
                "age": row.get("ABS_AGE_CATEGORY"),
                "gender": row.get("ABS_SEX"),
                "location": row.get("SA2 (UR)"),
                "income": row.get("ABS_INCOME"),
                # Split income into weekly and annual components if format contains parentheses
                **(lambda inc: {
                    "income_weekly": inc.split("(")[0].strip() if isinstance(inc, str) and "(" in inc else inc,
                    "income_annual": inc.split("(")[1].strip(") ") if isinstance(inc, str) and "(" in inc else None,
                })(row.get("ABS_INCOME")),
                "housing_tenure": map_value(mp.tenure, row.get("J1")),
                "job_tenure": map_value(mp.job_tenure, row.get("G5_E")),
                "occupation": map_value(mp.job_type, row.get("G5_D")),
                "education": map_value(mp.edu_level, row.get("G3")),
                "transport": row.get("transport"),
                "marital_status": map_value(mp.marital_status, row.get("H8")),
                "partner_activity": map_value(mp.partner_activity, row.get("I1")),
                "household_size": map_value(mp.household_size, row.get("W1")),
                "family_payments": map_value(mp.family_payments, 2 if row.get("J8_1") == 0 else row.get("J8_1")),
                "child_care_benefit": map_value(mp.child_care_benefit, 2 if row.get("J8_2") == 0 else row.get("J8_2")),
                "investment_properties": map_value(mp.investment_properties, row.get("J2")),
                "transport_infrastructure": map_value(mp.transport_infrastructure, row.get("D8_9")),
                "political_leaning": map_value(mp.political_leaning, row.get("B9_1")),
                "trust": map_value(mp.trust_gov, row.get("C6")),
                "issues": construct_issues_string(row),
                "engagement": construct_engagement_string(row),
            }
            limited_personas.append(lp)

        async def generate() -> AsyncGenerator[str, None]:
            run_id_local = uuid.uuid4().hex
            # Simulate responses using limited data (to reduce token usage)
            responses = []
            async for progress in simulate_responses(limited_personas, {"questions": payload.questions, "domain": payload.domain or "civic-policy", "question": payload.questions[0] if payload.questions else "", "run_id": run_id_local}):
                if "progress" in progress:
                    yield f"data: {json.dumps({'type': 'progress', 'progress': progress['progress']})}\n\n"
                else:
                    responses.append(progress)

            # Merge response text back into persona dicts
            persona_by_id = {p["persona_id"]: p for p in responses}
            combined = []
            for p in limited_personas:
                resp_info = persona_by_id.get(p["id"], {})
                combined.append({**p, **resp_info})

            # Build summary of key themes
            narrative_texts = [p.get("response", "") for p in combined if p.get("response")]
            summary = summarize_responses(narrative_texts)

            # --- Theme classification per persona -------------------------------
            try:
                def extract_narrative(text: str) -> str:
                    if not text:
                        return ""
                    return text.split("SURVEY:")[0].replace("NARRATIVE:", "").strip()

                df_tmp = pd.DataFrame([
                    {"id": p["id"], "narrative_response": extract_narrative(p.get("response", ""))}
                    for p in combined
                ])
                themes_list = classify_multi(df_tmp["narrative_response"].tolist())
                theme_map = {row_id: labs for row_id, labs in zip(df_tmp["id"], themes_list)}
                for p in combined:
                    labs = theme_map.get(p["id"], [])
                    if not labs:
                        labs = [derive_theme_simple(p.get("response", ""))] or []
                    p["themes"] = labs
            except Exception as e:
                for p in combined:
                    p["themes"] = [derive_theme_simple(p.get("response", ""))]

            # survey numbers and demographics stats
            for p in combined:
                p["survey_numbers"] = parse_survey_numbers(p.get("response", ""))

            demo = demo_stats(sampled_df, df)
            loc_freq = location_freq(combined)

            # After building combined responses, extract drivers
            print("Starting driver extraction...")
            for p in combined:
                # Extract narrative from response
                narrative = ""
                if p.get("response"):
                    print(f"\nProcessing response for persona {p.get('id')}:")
                    print(f"Raw response: {p['response'][:200]}...")  # Print first 200 chars
                    match = re.search(r"NARRATIVE:\s*([\s\S]*?)\n+SURVEY:", p["response"])
                    if match:
                        narrative = match.group(1).strip()
                        print(f"Extracted narrative: {narrative[:200]}...")  # Print first 200 chars
                    else:
                        print("No narrative section found in response")
                else:
                    print(f"No response found for persona {p.get('id')}")
                
                drivers = extract_drivers(narrative)
                print(f"Extracted drivers: {drivers}")
                p["drivers"] = drivers

            # Aggregate drivers by support level
            print("\nAggregating drivers by support level...")
            buckets = defaultdict(Counter)
            for p in combined:
                lvl = p.get("survey_numbers", {}).get("support")
                if lvl:
                    print(f"\nProcessing support level {lvl}:")
                    for d in p.get("drivers", []):
                        buckets[lvl][d] += 1
                        print(f"Added driver '{d}' to level {lvl}")

            # Convert to list of driver summaries per level
            driver_summary = [
                {"level": lvl,
                 "drivers": buckets[lvl].most_common(6)}
                for lvl in sorted(buckets)
            ]
            print("\nFinal driver summary:", driver_summary)

            run_payload = {
                "run_id": run_id_local,
                "timestamp": pd.Timestamp.utcnow().isoformat(),
                "question": payload.questions[0] if payload.questions else None,
                "area": payload.area,
                "domain": payload.domain or "civic-policy",
                "summary": summary,
                "responses": combined,
                "driver_summary": driver_summary,
                "demographics": demo,
                "location_freq": loc_freq,
            }
            from voxpopai.backend.utils.run_storage import save_run
            save_run(run_payload)

            final_response = run_payload
            yield f"data: {json.dumps({'type': 'complete', 'data': final_response})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions to build engagement and issues strings ----------------------------------


def construct_engagement_string(row) -> str:
    """Build natural-language description of political engagement for a persona."""
    parts = []
    for key, description in mp.engagement_dict.items():
        answer_value = row.get(key, 999)
        answer_text = mp.get_mapping_dict(key).get(answer_value, "Unknown")
        if answer_text not in ["Item skipped", "Unknown"]:
            parts.append(f"{description}, {answer_text}")
    if parts:
        return "I engage in politics in the following way: " + "; ".join(parts)
    return "No significant engagement reported."


def construct_issues_string(row) -> str:
    """Build natural-language description of issue importance for a persona."""
    parts = []
    for key, description in mp.issues_dict.items():
        answer_value = row.get(key, 999)
        answer_text = mp.get_mapping_dict(key).get(answer_value, "Unknown")
        if answer_text not in ["Item skipped", "Unknown"]:
            parts.append(f"{description}, {answer_text}")
    if parts:
        return "How I feel about the following Issues include: " + "; ".join(parts)
    return "No significant issues reported." 