"""Response Simulator agent stub that supports both openai>=1.0 and <1.0 APIs."""

import os
from typing import List, Dict, Any, AsyncGenerator
from dotenv import load_dotenv
from openai import OpenAI
import asyncio
import json
import uuid
from voxpopai.backend.agents.consistency_critic import critique as consistency_critic
from voxpopai.backend.agents.topic_critic import find_gaps
from voxpopai.backend.utils.run_logger import write_log
from voxpopai.backend.agents.persona_chat import persona_chat

load_dotenv()

# We try to import the new style client first; fall back to the legacy if needed.
try:
    from openai import OpenAI  # type: ignore

    _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def _call_openai(prompt: str) -> str:
        """Invoke ChatCompletion using the new openai>=1.0 interface."""
        chat_response = _client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a survey respondent."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=150,
        )
        return chat_response.choices[0].message.content.strip()

except ModuleNotFoundError:
    # openai not installed yet – code will raise later
    _client = None  # type: ignore
    def _call_openai(prompt: str) -> str:  # type: ignore
        raise RuntimeError("openai library not installed")

except AttributeError:
    # The import succeeded but client pattern not available; assume pre-1.0 style.
    import openai  # type: ignore

    openai.api_key = os.getenv("OPENAI_API_KEY")

    def _call_openai(prompt: str) -> str:  # type: ignore
        completion = openai.ChatCompletion.create(  # type: ignore[attr-defined]  # noqa: E1101
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a survey respondent."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=150,
        )
        return completion.choices[0].message.content.strip()


async def simulate_responses(personas: List[Dict[str, Any]], survey: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
    """Stream simulated survey responses with progress updates and critic checks."""

    run_id = survey.get("run_id") or str(uuid.uuid4())
    question_text = survey.get("question") or (survey.get("questions") or [""])[0]
    domain = survey.get("domain", "civic-policy")

    responses: List[Dict[str, Any]] = []
    total_personas = len(personas)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Provide a deterministic stubbed response when API key is absent.
        for i, persona in enumerate(personas):
            responses.append(
                {
                    "persona_id": persona["id"],
                    "response": "[Stubbed response – set OPENAI_API_KEY to get real data]",
                }
            )
            yield {"progress": (i + 1) / total_personas * 100}
        for r in responses:
            yield r
        return

    import asyncio
    loop = asyncio.get_event_loop()

    for i, persona in enumerate(personas):
        prompt = PERSONA_TEMPLATE.format(
            persona_name=f"Persona_{persona['id']}",
            question=question_text,
            **persona,
        )
        try:
            # Initial answer
            answer = await loop.run_in_executor(None, _call_openai_with_system, prompt)

            # ---- Consistency Critic ----
            report = await loop.run_in_executor(None, consistency_critic, json.dumps(persona), answer, run_id)
            if report.get("status") == "FIX_NEEDED":
                answer = report.get("corrected_answer", answer)

            # ---- Topic Coverage Critic (up to 2 follow-ups) ----
            attempts = 0
            missing = await loop.run_in_executor(None, find_gaps, answer, domain, run_id)
            while missing and attempts < 2:
                follow_up = f"As the same persona, please also discuss {', '.join(missing)} in 2 sentences."
                follow_reply = await loop.run_in_executor(None, persona_chat, persona, follow_up)
                answer += "\n" + follow_reply
                attempts += 1
                missing = await loop.run_in_executor(None, find_gaps, answer, domain, run_id)

            write_log("final_answer", {"run_id": run_id, "persona_id": persona["id"]})

            responses.append({"persona_id": persona["id"], "response": answer})
        except Exception as e:
            responses.append({"persona_id": persona["id"], "error": str(e)})

        yield {"progress": (i + 1) / total_personas * 100}

    for r in responses:
        yield r


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an AI that role-plays realistic Australian personas for synthetic civic "
    "focus-groups. Each persona is defined by demographic attributes derived from the "
    "Census and electoral research. Your goal: give strong, internally-consistent "
    "opinions that flow naturally from the persona's background."
)

PERSONA_TEMPLATE = (
    "You are **{persona_name}** – a fictional but demographically grounded Australian.\n\n"
    "Key attributes\n"
    "• Age & gender: {age}, {gender}\n"
    "• Location: {location}\n"
    "• Weekly / annual income: {income_weekly} / {income_annual}\n"
    "• Housing: {housing_tenure}; household size {household_size}\n"
    "• Work: {occupation}; job tenure {job_tenure}\n"
    "• Education: {education}\n"
    "• Transport habits: {transport}\n"
    "• Political leaning: {political_leaning}; trust in government: {trust}\n"
    "• Engagement: {engagement}\n"
    "• Salient issues: {issues}\n\n"
    "Local proposal\n"
    "> {question}\n\n"
    "Instructions\n"
    "1. Adopt the tone, vocabulary and priorities of this persona.\n"
    "2. Take a clear position (strongly support/oppose) and justify it from the persona's viewpoint.\n"
    "3. Provide a concise but considered narrative of **5-10 sentences** include at least 2 topics, then fill the survey grid.\n"
    "4. Do NOT explicitly repeat your demographic attributes (age, gender, location, etc.). Let them shape your viewpoint implicitly.\n"
    "5. In the SURVEY grid, set **Support Level (1-5)** where **1 = strongly oppose the proposal** and **5 = strongly support the proposal**.\n\n"
    "Format exactly:\n\n"
    "NARRATIVE:\n"
    "<5-10 sentence first-person statement>\n\n"
    "SURVEY:\n"
    "Support Level (1-5): <#>\n"
    "Impact – Housing (1-5): <#>\n"
    "Impact – Transport (1-5): <#>\n"
    "Impact – Community (1-5): <#>\n"
    "Key Concerns: item1, item2, …\n"
    "Suggested Improvements: item1, item2, …"
)


# ---------------------------------------------------------------------------
# Summary helper
# ---------------------------------------------------------------------------

SUMMARY_USER_TEMPLATE = (
    "Below are individual focus-group responses.\n"
    "---\n{responses}\n---\n"
    "Identify the 3–5 most salient themes, conflicts, or surprises you observe.\n"
    "Return them as a bullet list, one sentence each, no preamble."
)


def summarize_responses(res_texts: List[str]) -> str:
    """Return a bullet-list summary of key themes across persona responses. Batches if >50."""
    if not res_texts:
        return "No responses to summarise."

    # Use only new OpenAI client interface
    from openai import OpenAI
    import os
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def summarize_batch(batch: List[str]) -> str:
        user_prompt = SUMMARY_USER_TEMPLATE.format(responses="\n\n".join(batch))
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        try:
            res = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=450,
            )
            return res.choices[0].message.content.strip()
        except Exception as e:
            return f"Summary generation failed: {e}"

    if len(res_texts) <= 50:
        return summarize_batch(res_texts)
    # Batch: summarize in chunks, then summarize the summaries
    batch_size = 50
    summaries = []
    for i in range(0, len(res_texts), batch_size):
        summaries.append(summarize_batch(res_texts[i:i+batch_size]))
    # Final summary of summaries
    return summarize_batch(summaries)


# wrapper that injects the system prompt ----------------------------------------------------


def _call_openai_with_system(prompt: str) -> str:
    """Call OpenAI API with system prompt (synchronous)."""
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content 