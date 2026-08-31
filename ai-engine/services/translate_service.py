"""
BhashaFlow AI Engine — Translation Service

Uses the Sarvam AI Translate API (mayura:v1) to translate text
between Indian languages (22+ supported) and English.
"""

import logging
import re
from typing import Optional

import requests

from .config import (
    SARVAM_API_KEY,
    SARVAM_HEADERS,
    SARVAM_TRANSLATE_URL,
    LANG_CODES,
    LANG_NAMES,
    BCP47_TO_SHORT,
    REQUEST_TIMEOUT,
)

logger = logging.getLogger(__name__)

MAX_TRANSLATE_CHARS = 900


def _resolve_lang_code(code: str) -> str:
    """
    Accept either a short code ('hi') or BCP-47 code ('hi-IN')
    and always return the BCP-47 form.
    """
    if code in LANG_CODES:
        return LANG_CODES[code]
    return code  # already BCP-47 or 'auto'


def _guess_source_language_code(text: str) -> Optional[str]:
    """Guess a reasonable Sarvam source language code from text script.

    Uses character-count majority voting so a mixed snippet (e.g. Bengali text
    that also contains some ASCII punctuation) is classified correctly instead
    of defaulting to the first matching block.
    """
    script_counts = {
        "hi-IN": len(re.findall(r"[\u0900-\u097F]", text)),   # Devanagari (Hindi/Marathi/Nepali)
        "bn-IN": len(re.findall(r"[\u0980-\u09FF]", text)),   # Bengali
        "pa-IN": len(re.findall(r"[\u0A00-\u0A7F]", text)),   # Gurmukhi (Punjabi)
        "gu-IN": len(re.findall(r"[\u0A80-\u0AFF]", text)),   # Gujarati
        "od-IN": len(re.findall(r"[\u0B00-\u0B7F]", text)),   # Odia
        "ta-IN": len(re.findall(r"[\u0B80-\u0BFF]", text)),   # Tamil
        "te-IN": len(re.findall(r"[\u0C00-\u0C7F]", text)),   # Telugu
        "kn-IN": len(re.findall(r"[\u0C80-\u0CFF]", text)),   # Kannada
        "ml-IN": len(re.findall(r"[\u0D00-\u0D7F]", text)),   # Malayalam
        "ur-IN": len(re.findall(r"[\u0600-\u06FF]", text)),   # Arabic/Urdu
    }

    # Pick the script with the most matching characters
    best_lang, best_count = max(script_counts.items(), key=lambda x: x[1])
    if best_count > 0:
        return best_lang

    # Fallback: pure Latin/ASCII → English
    if re.search(r"[A-Za-z0-9]", text):
        return "en-IN"
    return None


def translate_text(
    text: str,
    source_language_code: str = "auto",
    target_language_code: str = "en-IN",
) -> dict:
    """
    Translate text using Sarvam AI.

    Args:
        text:                  The text to translate (max 1000 chars for mayura:v1).
        source_language_code:  Source language ('auto', 'hi', 'hi-IN', etc.).
        target_language_code:  Target language ('en', 'en-IN', etc.).

    Returns:
        {
            "translated_text": "...",
            "source_language_code": "hi-IN",   # detected or echoed
        }

    Raises:
        RuntimeError: on any API / network error.
    """
    target_bcp47 = _resolve_lang_code(target_language_code)
    source_bcp47 = _resolve_lang_code(source_language_code)

    if source_bcp47 == "auto":
        guessed = _guess_source_language_code(text)
        if guessed:
            logger.info(
                "Guessed source language from text script: %s; using explicit source_language_code.",
                guessed,
            )
            source_bcp47 = guessed

    # Skip API call if source and target are the same language
    if source_bcp47 != "auto" and source_bcp47 == target_bcp47:
        logger.info("Source and target are both %s — skipping translation.", source_bcp47)
        return {"translated_text": text, "source_language_code": source_bcp47}

    payload = {
        "input": text,
        "source_language_code": source_bcp47,
        "target_language_code": target_bcp47,
        "speaker_gender": "Male",
        "mode": "formal",
        "model": "mayura:v1",
        "enable_preprocessing": True,
    }

    logger.info(
        "Translating %d chars  %s → %s",
        len(text), source_bcp47, target_bcp47,
    )

    try:
        resp = requests.post(
            SARVAM_TRANSLATE_URL,
            headers=SARVAM_HEADERS,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        return {
            "translated_text": data.get("translated_text", ""),
            "source_language_code": data.get("source_language_code", source_bcp47),
        }

    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Could not connect to the Sarvam translation service. Check your internet."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("Translation request timed out.")
    except requests.exceptions.HTTPError:
        if resp.status_code == 422 and source_bcp47 == "auto":
            guessed = _guess_source_language_code(text)
            if guessed:
                logger.warning(
                    "Sarvam could not auto-detect the source language; retrying with %s.",
                    guessed,
                )
                payload["source_language_code"] = guessed
                resp = requests.post(
                    SARVAM_TRANSLATE_URL,
                    headers=SARVAM_HEADERS,
                    json=payload,
                    timeout=REQUEST_TIMEOUT,
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "translated_text": data.get("translated_text", ""),
                    "source_language_code": data.get("source_language_code", guessed),
                }
        raise RuntimeError(
            f"Sarvam Translate API error (HTTP {resp.status_code}): {resp.text}"
        )
    except Exception as e:
        raise RuntimeError(f"Translation failed: {e}") from e


def _split_for_translation(text: str, max_chars: int = MAX_TRANSLATE_CHARS) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n{2,}", text) if part.strip()]
    chunks: list[str] = []

    for paragraph in paragraphs:
        if len(paragraph) <= max_chars:
            chunks.append(paragraph)
            continue

        sentences = re.split(r"(?<=[.!?।])\s+", paragraph)
        current = ""
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            if len(sentence) > max_chars:
                if current:
                    chunks.append(current)
                    current = ""
                chunks.extend(sentence[i:i + max_chars] for i in range(0, len(sentence), max_chars))
                continue

            candidate = f"{current} {sentence}".strip()
            if len(candidate) > max_chars and current:
                chunks.append(current)
                current = sentence
            else:
                current = candidate

        if current:
            chunks.append(current)

    return chunks or [text[:max_chars]]


def translate_long_text(
    text: str,
    source_language_code: str = "auto",
    target_language_code: str = "en-IN",
) -> dict:
    """
    Translate longer OCR/STT text by sending Sarvam-safe chunks.
    """
    chunks = _split_for_translation(text)
    translated_chunks: list[str] = []
    detected_source = source_language_code

    for chunk in chunks:
        result = translate_text(
            text=chunk,
            source_language_code=source_language_code,
            target_language_code=target_language_code,
        )
        translated_chunks.append(result["translated_text"])
        if detected_source in {"auto", "unknown"}:
            detected_source = result.get("source_language_code", detected_source)

    return {
        "translated_text": "\n\n".join(translated_chunks),
        "source_language_code": detected_source,
    }


def get_language_name(code: str) -> str:
    """Return a human-readable name for a language code."""
    short = BCP47_TO_SHORT.get(code, code)
    return LANG_NAMES.get(short, code)
