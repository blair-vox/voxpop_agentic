# ✨ VoxPopAI Critics Integration – Full Implementation Guide

This document adds three QA agents, run logging, a backend router, and a React modal.

Implement these new agents, check for places where the code might break, ask questions if you need clarification, ensure the frontend and backend work well together and generate a good user experience.

voxpopai/
backend/
agents/
question_critic.py
consistency_critic.py
topic_critic.py
response_simulator.py   # replaced
routers/
question.py
utils/
run_logger.py
frontend/
src/components/
QuestionCriticModal.tsx

---

## 0️⃣ Overview

| Component | Purpose |
|-----------|---------|
| **Question-Critic** | Rewrite ambiguous user question, classify domain, suggest impact dimensions. |
| **Consistency-Critic** | Ensure persona narrative matches persona bio **and** survey grid numbers. |
| **Topic-Coverage-Critic** | Check narrative covers required policy dimensions; triggers up to **2** follow-ups. |
| **Run Logger** | Append JSONL logs for every critic step under `.logs/`. |
| **React Modal** | Lets user accept or reject Question-Critic rewrite before simulation. |

---

## 1️⃣ Question-Critic – `voxpopai/backend/agents/question_critic.py`

```file voxpopai/backend/agents/question_critic.py
"""Rewrite survey question; classify domain; propose impact dimensions."""
from __future__ import annotations
import os, json
from functools import lru_cache
from typing import Dict
from openai import OpenAI

SYSTEM_PROMPT = """
You are a Question-Critic.

TASK A — Clarity
• Detect ambiguity, jargon, double-barrel, or bias.  
• If issues exist, propose a clearer single-sentence rewrite.

TASK B — Domain & Dimensions  
• Classify domain into: civic-policy, product-design, employee-engagement, marketing-copy (else: unknown).  
• Suggest up to three impact dimensions:  
    civic-policy:      Housing, Transport, Community, Environment, Economy  
    product-design:    Usability, Accessibility, Trust, Cost  
    employee-engagement: Workload, Growth, Culture  
    marketing-copy:    Clarity, Emotional Appeal, Brand Fit  

Return EXACT JSON:
{
  "ok": bool,                 # true if original is clear
  "rewritten": "<sentence>",  # original if ok
  "domain": "<label|unknown>",
  "impact_dims": ["dim1","dim2"]
}
"""

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def critic(question: str) -> Dict[str, object]:
    try:
        res = _client().chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
        )
        return json.loads(res.choices[0].message.content)
    except Exception:
        return {
            "ok": True,
            "rewritten": question,
            "domain": "unknown",
            "impact_dims": [],
        }

2️⃣ Consistency-Critic – voxpopai/backend/agents/consistency_critic.py

"""Check narrative vs persona bio AND survey grid for coherence."""
from __future__ import annotations
import os, json
from functools import lru_cache
from typing import Dict
from openai import OpenAI
from voxpopai.backend.utils.run_logger import write_log

SYSTEM_PROMPT = """
Given PROFILE (JSON) and ANSWER (narrative + SURVEY grid):

1. Flag contradictions with profile facts (age, location, tenure, etc.).  
2. Ensure narrative stance matches Support Level:  
     • Supportive narrative ⇒ Support Level 4–5  
     • Opposing narrative  ⇒ Support Level 1–2  
3. If narrative complains about transport, Impact-Transport must be 1–2…  
Return JSON:
{
  "status": "OK" | "FIX_NEEDED",
  "issues": ["..."],
  "corrected_answer": "<answer if you fixed it>"
}
"""

@lru_cache(1)
def _client() -> OpenAI:  # type: ignore
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def critique(profile_json: str, answer: str, run_id: str) -> Dict[str, object]:
    prompt = f"PROFILE\\n{profile_json}\\n\\nANSWER\\n{answer}"
    try:
        res = _client().chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        out = json.loads(res.choices[0].message.content)
    except Exception as e:
        out = {"status": "ERROR", "issues": [str(e)], "corrected_answer": answer}

    write_log("consistency_critic", {"run_id": run_id, **out})
    return out

Topic-Coverage-Critic – voxpopai/backend/agents/topic_critic.py
"""Return list of required dimensions missing from narrative."""
from typing import List
from voxpopai.backend.utils.run_logger import write_log

REQUIRED = {
    "civic-policy":      ["housing", "transport", "community"],
    "product-design":    ["usability", "trust", "cost"],
    "employee-engagement": ["workload", "growth", "culture"],
    "marketing-copy":    ["clarity", "brand", "emotion"],
}

def find_gaps(text: str, domain: str, run_id: str) -> List[str]:
    req = REQUIRED.get(domain, [])
    missing = [w for w in req if w not in text.lower()]
    write_log("topic_critic", {"run_id": run_id, "missing": missing})
    return missing

 Run Logger – voxpopai/backend/utils/run_logger.py
import os, json, pathlib, datetime, uuid

LOG_DIR = pathlib.Path(os.getenv("RUN_LOG_DIR", ".logs"))
LOG_DIR.mkdir(exist_ok=True)

def write_log(step: str, payload: dict):
    run_id = payload.get("run_id") or uuid.uuid4().hex
    f = LOG_DIR / f"{run_id}_{step}.jsonl"
    with f.open("a") as fp:
        fp.write(json.dumps({"ts": datetime.datetime.utcnow().isoformat(), **payload}) + "\\n")

Question-Critic Router – voxpopai/backend/routers/question.py
from fastapi import APIRouter, HTTPException
from voxpopai.backend.agents.question_critic import critic

router = APIRouter()

@router.post("/critic")
def run(payload: dict):
    q = payload.get("question", "")
    if not q:
        raise HTTPException(400, "question required")
    return critic(q)

Add to app.py:
from voxpopai.backend.routers import question
app.include_router(question.router)

6️⃣ Replace or update response_simulator.py
"""Simulate persona answers with three critics and logging."""
import os, json
from typing import List, Dict, Any
from dotenv import load_dotenv
from openai import OpenAI

from voxpopai.backend.agents.consistency_critic import critique as consistency_critic
from voxpopai.backend.agents.topic_critic import find_gaps
from voxpopai.backend.utils.run_logger import write_log
from voxpopai.backend.agents.persona_chat import persona_chat  # must already exist

load_dotenv()
_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
SYSTEM_PROMPT = "You are a survey respondent persona."

PERSONA_TEMPLATE = \"\"\"You are **{persona_name}** – a fictional but demographically grounded Australian.

Key attributes
• Age & gender: {age}, {gender}
• Location: {location}
• Weekly / annual income: {income_weekly} / {income_annual}
• Housing: {housing_tenure}; household size {household_size}
• Work: {occupation}; job tenure {job_tenure}
• Education: {education}
• Transport habits: {transport}
• Political leaning: {political_leaning}; trust in government: {trust}
• Engagement: {engagement}
• Salient issues: {issues}

Local proposal
> {question}

Instructions
1. Take a clear position (support/oppose) and justify in 5–10 sentences.
2. Fill out the survey grid.

Format exactly:

NARRATIVE:
<paragraph>

SURVEY:
Support Level (1-5): <#>
Impact – Housing (1-5): <#>
Impact – Transport (1-5): <#>
Impact – Community (1-5): <#>
Key Concerns: item1, item2
Suggested Improvements: item1, item2
\"\"\"


def _llm(prompt: str) -> str:
    res = _client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=450,
    )
    return res.choices[0].message.content.strip()

def simulate_responses(personas: List[Dict[str, Any]], survey: Dict[str, Any]) -> List[Dict[str, Any]]:
    run_id = survey.get("run_id") or "run"
    question = survey["question"]
    domain = survey.get("domain", "civic-policy")

    results = []
    for p in personas:
        prompt = PERSONA_TEMPLATE.format(persona_name=f"Persona_{p['id']}", question=question, **p)
        answer = _llm(prompt)

        # ---- Consistency check
        report = consistency_critic(json.dumps(p), answer, run_id)
        if report.get("status") == "FIX_NEEDED":
            answer = report.get("corrected_answer", answer)

        # ---- Topic coverage up to 2 retries
        attempts = 0
        missing = find_gaps(answer, domain, run_id)
        while missing and attempts < 2:
            follow = (
                f"As the same persona, please also discuss {', '.join(missing)} in 2 sentences."
            )
            answer += "\\n" + persona_chat(p, follow)
            attempts += 1
            missing = find_gaps(answer, domain, run_id)

        write_log("final_answer", {"run_id": run_id, "persona_id": p["id"]})
        results.append({"persona_id": p["id"], "response": answer})

    return results

React Modal – QuestionCriticModal.tsx
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

export default function QuestionCriticModal({ onAccept }:{
  onAccept:(q:string, dims:string[])=>void;
}){
  const [open,setOpen]=useState(false);
  const [raw,setRaw]=useState("");
  const [crit,setCrit]=useState<any>(null);

  const runCritic=async()=>{
    const r = await api.post("/critic",{question:raw});
    setCrit(r.data);
    setOpen(true);
  };

  if(!open){
    return (<div className="space-y-2">
      <textarea rows={4} value={raw} onChange={e=>setRaw(e.target.value)} className="w-full border p-2"/>
      <Button onClick={runCritic}>Review Question</Button>
    </div>);
  }

  return (
    <Dialog open={open}>
      <DialogContent className="space-y-4">
        <DialogHeader>Question Review</DialogHeader>
        <p><strong>Original:</strong> {raw}</p>
        {!crit.ok && <p><strong>Suggested:</strong> {crit.rewritten}</p>}
        <Button onClick={()=>{
          onAccept(crit.ok ? raw : crit.rewritten,
                   crit.impact_dims.length ? crit.impact_dims
                                           : ["Housing","Transport","Community"]);
          setOpen(false);
        }}>
          {crit.ok ? "Use question" : "Use suggestion"}
        </Button>
        {!crit.ok && (
          <Button variant="secondary" onClick={()=>{
            onAccept(raw,crit.impact_dims); setOpen(false);
          }}>
            Keep Original
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

Integration snippet (pages/index.tsx)
<QuestionCriticModal
  onAccept={(q, dims)=>{
    setQuestion(q);
    setImpactDims(dims);
    runSimulation(q, dims);
  }}
/>
