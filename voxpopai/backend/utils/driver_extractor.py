from __future__ import annotations
import openai
from functools import lru_cache
from typing import List
import os
import json
import re

SYSTEM_PROMPT = (
    "You are an expert at capturing the emotional drivers behind civic opinions. "
    "Given a narrative, return 1-3 short, colloquial phrases that sum up the *real feeling* or *core concern*—as if you were explaining it to a friend. "
    "If the sentiment is negative use the negative version of the word. Authentic might be come inauthentic, etc. "
    "If positive, use postive versions of the word. "
    "Be pithy, real, and avoid jargon. "
    "Return ONLY a JSON array of strings, with no extra text. "
    "Example: [\"inauthentic\", \"out of touch\", \"too corporate\"]"
)

@lru_cache(1)
def _get_client():
    return openai.OpenAI()

def extract_drivers(text: str, model: str = "gpt-3.5-turbo") -> List[str]:
    if not text:
        print("No text provided to extract_drivers")
        return []
    
    if not os.getenv("OPENAI_API_KEY"):
        print("No OPENAI_API_KEY found in environment")
        return []
        
    try:
        print(f"\nExtracting drivers from text: {text[:200]}...")  # Print first 200 chars
        resp = _get_client().chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ],
            temperature=0.2,
        )
        
        # Get the response content and clean it
        content = resp.choices[0].message.content.strip()
        print(f"Raw GPT response: {content}")
        
        # Try to parse as JSON first
        try:
            result = json.loads(content)
            if isinstance(result, list):
                print(f"Successfully parsed JSON response: {result}")
                return result
        except json.JSONDecodeError:
            pass
            
        # If JSON parsing fails, try to extract list using regex
        list_match = re.search(r'\[(.*?)\]', content)
        if list_match:
            items = [item.strip().strip('"\'') for item in list_match.group(1).split(',')]
            print(f"Extracted list using regex: {items}")
            return items
            
        print("Could not parse response as list")
        return []
        
    except Exception as e:
        print(f"Error extracting drivers: {str(e)}")
        return [] 