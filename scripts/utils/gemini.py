import json

from google import genai
from google.genai import types


async def fetch_gemini_json(
    client: genai.Client,
    model: str,
    system: str,
    prompt: str,
) -> dict:
    """Appelle Gemini et retourne le JSON parsé. Lève une exception si la réponse est invalide."""
    resp = await client.aio.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
        ),
    )
    return json.loads(resp.text)
