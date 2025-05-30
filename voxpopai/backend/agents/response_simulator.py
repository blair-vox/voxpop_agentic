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
from voxpopai.backend.agents.relevance_critic import critique as relevance_critic
import logging
from copy import deepcopy
import time

load_dotenv()

# Rate limiting configuration
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))  # Concurrent requests
REQUESTS_PER_MINUTE = int(os.getenv("REQUESTS_PER_MINUTE", "50"))  # OpenAI rate limit
REQUEST_DELAY = 60.0 / REQUESTS_PER_MINUTE  # Delay between requests

# Global semaphore and rate limiter
_request_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
_last_request_time = 0
_request_lock = asyncio.Lock()

async def rate_limited_llm_call(func, *args, **kwargs):
    """Rate-limited wrapper for LLM calls."""
    global _last_request_time
    
    async with _request_semaphore:
        async with _request_lock:
            current_time = time.time()
            time_since_last = current_time - _last_request_time
            if time_since_last < REQUEST_DELAY:
                await asyncio.sleep(REQUEST_DELAY - time_since_last)
            _last_request_time = time.time()
        
        # Run the actual LLM call in executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)

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
        # Use the new client interface even for older versions
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        chat_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a survey respondent."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=150,
        )
        return chat_response.choices[0].message.content.strip()


async def simulate_responses(personas: List[Dict[str, Any]], survey: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
    """Stream simulated survey responses with progress updates and critic checks (JSON-based)."""

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

    # Add logger
    logger = logging.getLogger("voxpopai.response_simulator")

    # Helper: deep merge dicts
    def deep_merge(dct, merge_dct):
        """Recursively merge *merge_dct* into *dct*.

        Scalar values in *merge_dct* overwrite those in *dct*.  If the value for a
        given key is a nested dict in **both** inputs, the merge is performed
        recursively so that only the leaf keys are overwritten.  The function
        returns the *dct* object so the caller can chain or re-assign it.
        """
        for k, v in merge_dct.items():
            if (k in dct and isinstance(dct[k], dict) and isinstance(v, dict)):
                deep_merge(dct[k], v)
            else:
                dct[k] = v
        return dct

    # Helper: format JSON response for display
    def format_response(response_json):
        """Return a human-readable multi-line string from the answer JSON.

        The LLM produces a strict JSON object with keys ``narrative`` and
        ``survey``.  For logging, critic prompts and UI previews we need a
        compact text version.  This helper converts the JSON schema into the
        canonical *NARRATIVE / SURVEY* block expected by the critics.
        """
        survey_data = response_json.get("survey", {})
        
        # Get impact dimensions from the outer survey context
        impact_dims = survey.get("impact_dims", ["Housing", "Transport", "Community"])
        
        # Build impact lines dynamically
        impact_lines = []
        for dim in impact_dims:
            field_name = dim.lower().replace(" ", "_").replace("&", "and")
            value = survey_data.get(field_name, "")
            impact_lines.append(f"{dim} (1-5): {value}")
        
        return (
            f"NARRATIVE: {response_json.get('narrative', '')}\n"
            "SURVEY:\n"
            f"Support for the proposal (1-5): {survey_data.get('support_level', '')}\n"
            + '\n'.join(impact_lines) + '\n'
            f"Key Concerns: {', '.join(survey_data.get('key_concerns', []))}\n"
            f"Suggested Improvements: {', '.join(survey_data.get('suggested_improvements', []))}\n"
        )

    # Create tasks for parallel processing
    tasks = []
    for i, persona in enumerate(personas):
        task = asyncio.create_task(process_single_persona(persona, survey, i))
        tasks.append(task)
    
    # Process personas in parallel with progress updates
    completed_count = 0
    completed_responses = {}
    
    # Use asyncio.as_completed to get results as they finish
    for completed_task in asyncio.as_completed(tasks):
        try:
            result = await completed_task
            completed_count += 1
            
            # Store result by index to maintain order
            persona_index = result.get("index", 0)
            completed_responses[persona_index] = result
            
            # Yield progress update with small delay for visibility
            progress_percent = (completed_count / total_personas) * 100
            yield {"progress": progress_percent}
            
            # Small delay to make progress updates visible
            if completed_count < total_personas:
                await asyncio.sleep(0.1)
            
        except Exception as e:
            logger.error(f"Task failed: {e}")
            completed_count += 1
            progress_percent = (completed_count / total_personas) * 100
            yield {"progress": progress_percent}
            
            # Small delay to make progress updates visible
            if completed_count < total_personas:
                await asyncio.sleep(0.1)
    
    # Reconstruct responses in original order
    for i in range(total_personas):
        if i in completed_responses:
            result = completed_responses[i]
            # Remove the index field before adding to responses
            result.pop("index", None)
            responses.append(result)

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

PERSONA_TEMPLATE_BASE = (
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
    "1. Take a clear position (support/oppose) and justify in 5–10 sentences.\n"
    "2. Fill out the survey grid.\n\n"
    "SURVEY:\n"
    "Support Level (1-5): <#>\n"
    "{impact_lines}"
    "Key Concerns: item1, item2\n"
    "Suggested Improvements: item1, item2"
)

# helper to build impact lines
def _impact_lines(dims: list[str] | None) -> str:
    """Return newline-separated placeholders for each impact dimension.

    The returned string is inserted verbatim into ``PERSONA_TEMPLATE_BASE`` so
    that the model sees something like::

        Impact – Housing (1-5): <#>
        Impact – Transport (1-5): <#>
        ...
    """
    if not dims:
        dims = ["Housing", "Transport", "Community"]
    return "".join([f"Impact – {d} (1-5): <#>\\n" for d in dims])


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
    """Return an LLM-generated bullet-list summary of key themes.

    The OpenAI context limit allows ~100–200 focus-group answers in one pass, so
    for safety we batch inputs >50, summarise each batch, then summarise the
    summaries.  This keeps token usage predictable while still providing a
    single coherent overview back to the caller.
    """
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
    """Wrapper around the OpenAI chat API that injects *SYSTEM_PROMPT*.

    We keep this out-of-band from the async event-loop because the OpenAI
    python client is blocking.  The outer `simulate_responses` coroutine sends
    it to a thread pool via ``loop.run_in_executor`` so that the FastAPI
    request thread is not blocked.
    """
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

# Add a strict format warning and use grid labels from survey_grid_labels
STRICT_FORMAT_INSTRUCTIONS = (
    "You MUST use the following format exactly. If you do not, your answer will be rejected and you will be asked to try again.\n"
    "Format (copy exactly):\n"
    "NARRATIVE:\n<5-10 sentence first-person statement>\n\nSURVEY:\nSupport Level (1-5): <#>\n{impact_lines}Key Concerns: item1, item2\nSuggested Improvements: item1, item2"
) 

async def process_single_persona(persona: Dict[str, Any], survey: Dict[str, Any], persona_index: int) -> Dict[str, Any]:
    """Process a single persona through the full pipeline with rate limiting."""
    run_id = survey.get("run_id")
    question_text = survey.get("question") or (survey.get("questions") or [""])[0]
    domain = survey.get("domain", "civic-policy")
    
    logger = logging.getLogger("voxpopai.response_simulator")
    
    # Log initial survey configuration
    logger.info(f"Processing persona {persona['id']} with domain: {domain}")
    logger.info(f"Impact dimensions from survey: {json.dumps(survey.get('impact_dims', []), indent=2)}")
    
    # Helper functions (same as before)
    def deep_merge(dct, merge_dct):
        for k, v in merge_dct.items():
            if (k in dct and isinstance(dct[k], dict) and isinstance(v, dict)):
                deep_merge(dct[k], v)
            else:
                dct[k] = v
        return dct

    def format_response(response_json):
        survey_data = response_json.get("survey", {})
        
        # Get impact dimensions from the outer survey context
        impact_dims = survey.get("impact_dims", ["Housing", "Transport", "Community"])
        
        # Build impact lines dynamically
        impact_lines = []
        for dim in impact_dims:
            field_name = dim.lower().replace(" ", "_").replace("&", "and")
            value = survey_data.get(field_name, "")
            impact_lines.append(f"{dim} (1-5): {value}")
        
        return (
            f"NARRATIVE: {response_json.get('narrative', '')}\n"
            "SURVEY:\n"
            f"Support for the proposal (1-5): {survey_data.get('support_level', '')}\n"
            + '\n'.join(impact_lines) + '\n'
            f"Key Concerns: {', '.join(survey_data.get('key_concerns', []))}\n"
            f"Suggested Improvements: {', '.join(survey_data.get('suggested_improvements', []))}\n"
        )

    try:
        grid_labels = survey.get("survey_grid_labels") or {}
        support_label = grid_labels.get("support_label", "Support for the proposal")
        impact_labels = grid_labels.get("impact_labels", ["Housing", "Transport", "Community"])
        
        # Get impact dimensions from survey, fallback to default
        impact_dims = survey.get("impact_dims", ["Housing", "Transport", "Community"])
        logger.info(f"Using impact dimensions: {json.dumps(impact_dims, indent=2)}")
        
        # Create dynamic JSON format based on impact dimensions
        impact_json_fields = []
        for dim in impact_dims:
            field_name = dim.lower().replace(" ", "_").replace("&", "and")
            impact_json_fields.append(f'    "{field_name}": <1-5>,')
        
        # JSON format instructions with dynamic impact fields
        strict_block = (
            "You MUST respond in the following JSON format (no extra text):\n"
            "{{\n"
            '  "narrative": "<5-10 sentence first-person statement>",\n'
            '  "survey": {{\n'
            '    "support_level": <1-5>,\n'
            + '\n'.join(impact_json_fields) + '\n'
            '    "key_concerns": ["item1", "item2"],\n'
            '    "suggested_improvements": ["item1", "item2"]\n'
            "  }}\n"
            "}}\n"
        )
        
        # Build impact lines for the template
        impact_lines = _impact_lines(impact_dims)
        
        prompt = PERSONA_TEMPLATE_BASE.replace("{impact_lines}", impact_lines)
        prompt = (prompt + "\n" + strict_block)
        prompt = prompt.format(
            persona_name=f"Persona_{persona['id']}",
            question=question_text,
            support_label=support_label,
            **persona,
        )
        
        # Initial answer with rate limiting
        answer_text = await rate_limited_llm_call(_call_openai_with_system, prompt)
        
        # Log the raw call for timeline reconstruction
        from voxpopai.backend.utils.run_logger import write_log as _wlog
        full_prompt = f"SYSTEM: {SYSTEM_PROMPT}\n\nUSER: {prompt}"
        _wlog("openai_initial", {"run_id": run_id, "persona_id": persona["id"]}, full_prompt, answer_text)
        
        try:
            answer_json = json.loads(answer_text)
            logger.info(f"Parsed JSON response for persona {persona['id']}: {json.dumps(answer_json, indent=2)}")
        except Exception as e:
            logger.error(f"JSON parse error for persona {persona['id']}: {e}\nRaw answer: {answer_text}")
            return {"persona_id": persona["id"], "error": f"JSON parse error: {e}"}

        # ---- Consistency Critic ----
        report = await rate_limited_llm_call(consistency_critic, json.dumps(persona), format_response(answer_json), run_id)
        if report.get("status") == "FIX_NEEDED":
            fix = report.get("corrected_answer", {})
            if isinstance(fix, str):
                try:
                    fix = json.loads(fix)
                except Exception:
                    fix = {}
            answer_json = deep_merge(answer_json, fix)
            logger.info(f"Applied consistency fix for persona {persona['id']}: {json.dumps(fix, indent=2)}")

        # ---- Topic Coverage Critic (up to 2 follow-ups) ----
        attempts = 0
        missing = await rate_limited_llm_call(find_gaps, format_response(answer_json), domain, run_id)
        while missing and attempts < 2:
            logger.info(f"Topic coverage missing for persona {persona['id']}: {missing}")
            follow_up = (
                f"PERSONA PROFILE (JSON):\n{json.dumps(persona, indent=2)}\n\n"
                f"Your previous answer JSON:\n{json.dumps(answer_json)}\n\n"
                f"Please also discuss {', '.join(missing)} in 2 sentences. Respond with JSON containing only the new or updated fields."
            )
            follow_reply = await rate_limited_llm_call(persona_chat, persona, follow_up, run_id)
            try:
                follow_json = json.loads(follow_reply)
                answer_json = deep_merge(answer_json, follow_json)
                logger.info(f"Applied topic coverage fix for persona {persona['id']}: {json.dumps(follow_json, indent=2)}")
            except Exception:
                pass
            attempts += 1
            missing = await rate_limited_llm_call(find_gaps, format_response(answer_json), domain, run_id)

        # ---- Relevance Critic multi-turn loop ----
        rel_attempts = 0
        while rel_attempts < 5:
            rel = await rate_limited_llm_call(relevance_critic, question_text, format_response(answer_json), run_id, grid_labels)
            if rel.get("status") != "FIX_NEEDED":
                break
            issues = ", ".join(rel.get("issues", []))
            logger.info(f"Relevance issues for persona {persona['id']}: {issues}")
            follow_up = (
                f"The proposal was: '{question_text}'. Here is your previous answer as JSON:\n{json.dumps(answer_json)}\n\n"
                f"PERSONA PROFILE (JSON):\n{json.dumps(persona, indent=2)}\n\n"
                f"The relevance critic says it didn't fully address the proposal because: {issues}. "
                "Please REPLACE only the relevant fields in the JSON object to directly answer the proposal while staying fully consistent with the persona profile above. Respond with JSON only."
            )
            follow_reply = await rate_limited_llm_call(persona_chat, persona, follow_up, run_id)
            try:
                follow_json = json.loads(follow_reply)
                answer_json = deep_merge(answer_json, follow_json)
                logger.info(f"Applied relevance fix for persona {persona['id']}: {json.dumps(follow_json, indent=2)}")
            except Exception:
                pass
            rel_attempts += 1

        # Final consistency check after all revisions
        final_report = await rate_limited_llm_call(consistency_critic, json.dumps(persona), format_response(answer_json), run_id)
        if final_report.get("status") == "FIX_NEEDED":
            fix = final_report.get("corrected_answer", {})
            if isinstance(fix, str):
                try:
                    fix = json.loads(fix)
                except Exception:
                    fix = {}
            answer_json = deep_merge(answer_json, fix)
            logger.info(f"Applied final consistency fix for persona {persona['id']}: {json.dumps(fix, indent=2)}")

        # Create survey_numbers object with dynamic fields
        survey_data = answer_json.get("survey", {})
        survey_numbers = {
            "support": survey_data.get("support_level", 0)
        }
        
        # Add all impact dimensions to survey_numbers
        for dim in impact_dims:
            field_name = dim.lower().replace(" ", "_").replace("&", "and")
            # Try several possible keys
            possible_keys = [
                field_name,
                dim,
                f"{dim} (1-5)",
                field_name + " (1-5)"
            ]
            value = None
            used_key = None
            for key in possible_keys:
                if key in survey_data:
                    value = survey_data[key]
                    used_key = key
                    break
            if value is None:
                value = 0
            print(f"[DEBUG] Impact dim: '{dim}' | Field name: '{field_name}' | Tried keys: {possible_keys} | Used key: {used_key} | Value in survey_data: {value}")
            # Ensure the value is a number between 1 and 5
            if isinstance(value, (int, float)):
                value = max(1, min(5, int(value)))
            else:
                value = 0
            survey_numbers[field_name] = value
        print(f"[DEBUG] Final survey_numbers for persona {persona['id']}: {survey_numbers}")

        # Log the final survey numbers
        logger.info(f"Final survey numbers for persona {persona['id']}: {json.dumps(survey_numbers, indent=2)}")
        logger.info(f"Raw LLM output for persona {persona['id']} (JSON):\n{json.dumps(answer_json, indent=2)}")
        
        # Log the complete interaction for the summary
        interaction_summary = {
            "persona_id": persona["id"],
            "impact_dimensions": impact_dims,
            "survey_numbers": survey_numbers,
            "narrative": answer_json.get("narrative", ""),
            "key_concerns": answer_json.get("survey", {}).get("key_concerns", []),
            "suggested_improvements": answer_json.get("survey", {}).get("suggested_improvements", [])
        }
        write_log("interaction_summary", {"run_id": run_id, "persona_id": persona["id"]}, json.dumps(interaction_summary, indent=2))

        # Always return the full survey_numbers (with all impact dimensions) at the top level
        return {
            "persona_id": persona["id"],
            "response": format_response(answer_json),
            "response_json": answer_json,
            "survey_numbers": survey_numbers,  # <-- This is now always the full one
            "survey_grid_labels": grid_labels,
            "index": persona_index,
            "interaction_summary": interaction_summary
        }
        
    except Exception as e:
        logger.error(f"Error processing persona {persona['id']}: {e}")
        return {"persona_id": persona["id"], "error": str(e), "index": persona_index} 