"""
BhashaFlow AI Engine — Speech Service

Provides Speech-to-Text (Sarvam saaras:v3) and Text-to-Speech
(Sarvam bulbul:v3) capabilities for multilingual voice interaction.
"""

import base64
import logging
from typing import Optional
import mimetypes
import requests

from .config import (
    SARVAM_API_KEY,
    SARVAM_STT_URL,
    SARVAM_TTS_URL,
    DEFAULT_STT_MODEL,
    DEFAULT_STT_MODE,
    DEFAULT_TTS_MODEL,
    DEFAULT_TTS_SPEAKER,
    DEFAULT_TTS_PACE,
    REQUEST_TIMEOUT,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
#  SPEECH-TO-TEXT (STT)
# ═══════════════════════════════════════════════════════════════════

def speech_to_text(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    language_code: str = "unknown",
    mode: str = DEFAULT_STT_MODE,
    model: str = DEFAULT_STT_MODEL,
) -> dict:
    """
    Transcribe audio to text using Sarvam AI STT.
    """
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
    }

    # FIX: Explicitly guess the MIME type based on the filename.
    # If the filename has no extension (common with browser blobs), 
    # default to 'audio/webm' as used in your frontend recording logic.
    content_type, _ = mimetypes.guess_type(filename)
    if not content_type:
        content_type = "audio/webm" 

    # Build multipart form - adding the content_type as the third element in the tuple
    files = {
        "file": (filename, audio_bytes, content_type),
    }

    data = {
        "model": model,
        "language_code": language_code,
    }

    if model == "saaras:v3":
        data["mode"] = mode

    logger.info(
        "STT request: model=%s, mode=%s, lang=%s, file=%s, type=%s (%d bytes)",
        model, mode, language_code, filename, content_type, len(audio_bytes),
    )

    try:
        resp = requests.post(
            SARVAM_STT_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        result = resp.json()

        return {
            "transcript": result.get("transcript", ""),
            "language_code": result.get("language_code", language_code),
            "language_probability": result.get("language_probability"),
        }

    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Could not connect to the Sarvam STT service. Check your internet."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("STT request timed out.")
    except requests.exceptions.HTTPError:
        raise RuntimeError(
            f"Sarvam STT API error (HTTP {resp.status_code}): {resp.text}"
        )
    except Exception as e:
        raise RuntimeError(f"Speech-to-text failed: {e}") from e

# ═══════════════════════════════════════════════════════════════════
#  TEXT-TO-SPEECH (TTS)
# ═══════════════════════════════════════════════════════════════════

def text_to_speech(
    text: str,
    target_language_code: str = "hi-IN",
    speaker: str = DEFAULT_TTS_SPEAKER,
    pace: float = DEFAULT_TTS_PACE,
    model: str = DEFAULT_TTS_MODEL,
) -> dict:
    """
    Convert text to speech audio using Sarvam AI TTS.

    Args:
        text:                   Text to synthesize (max 2500 chars for bulbul:v3).
        target_language_code:   BCP-47 language code for the output audio.
        speaker:                Voice name (e.g. 'shubh', 'priya', 'ritu').
        pace:                   Speech speed (0.5 – 2.0 for bulbul:v3).
        model:                  TTS model name.

    Returns:
        {
            "audio_base64": "UklGRiQA...",    # base64-encoded WAV audio
            "content_type": "audio/wav"
        }

    Raises:
        RuntimeError: on any API / network error.
    """
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": [text],
        "target_language_code": target_language_code,
        "speaker": speaker,
        "pace": pace,
        "model": model,
    }

    logger.info(
        "TTS request: model=%s, lang=%s, speaker=%s, pace=%.1f, text=%d chars",
        model, target_language_code, speaker, pace, len(text),
    )

    try:
        resp = requests.post(
            SARVAM_TTS_URL,
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        result = resp.json()

        # Sarvam TTS returns {"audios": ["base64string", ...]}
        audios = result.get("audios", [])
        audio_b64 = audios[0] if audios else ""

        return {
            "audio_base64": audio_b64,
            "content_type": "audio/wav",
        }

    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Could not connect to the Sarvam TTS service. Check your internet."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("TTS request timed out.")
    except requests.exceptions.HTTPError:
        raise RuntimeError(
            f"Sarvam TTS API error (HTTP {resp.status_code}): {resp.text}"
        )
    except Exception as e:
        raise RuntimeError(f"Text-to-speech failed: {e}") from e


# ═══════════════════════════════════════════════════════════════════
#  SPEECH-TO-SPEECH (combined pipeline)
# ═══════════════════════════════════════════════════════════════════

def speech_to_speech(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    target_language_code: str = "hi-IN",
    speaker: str = DEFAULT_TTS_SPEAKER,
    pace: float = DEFAULT_TTS_PACE,
) -> dict:
    """
    Full speech-to-speech pipeline:
      1. STT  → transcribe user's audio in their language
      2. Translate → to English (for backend processing)
      3. Translate → English back to target language
      4. TTS  → synthesize audio in target language

    Args:
        audio_bytes:            Raw audio file bytes.
        filename:               Original filename.
        target_language_code:   BCP-47 code for the reply language.
        speaker:                TTS voice name.
        pace:                   TTS speech pace.

    Returns:
        {
            "original_transcript": "user's words in their language",
            "english_text": "translated to English",
            "reply_text": "translated back to target language",
            "detected_language": "hi-IN",
            "target_language": "hi-IN",
            "audio_base64": "base64 encoded WAV",
            "content_type": "audio/wav"
        }
    """
    from .translate_service import translate_text

    logger.info("Speech-to-speech pipeline started")

    # Step 1: Transcribe the user's audio
    stt_result = speech_to_text(
        audio_bytes=audio_bytes,
        filename=filename,
        language_code="unknown",
        mode="transcribe",
    )
    original_transcript = stt_result["transcript"]
    detected_lang = stt_result["language_code"]

    logger.info(
        "STT done: detected_lang=%s, transcript=%s",
        detected_lang, original_transcript[:80],
    )

    # Step 2: Translate to English (for processing / storage)
    eng_result = translate_text(
        text=original_transcript,
        source_language_code=detected_lang,
        target_language_code="en-IN",
    )
    english_text = eng_result["translated_text"]

    # Step 3: Translate English back to the user's target language
    # (skip if the user already spoke in the target language)
    if target_language_code == "en-IN":
        reply_text = english_text
    else:
        reply_result = translate_text(
            text=english_text,
            source_language_code="en-IN",
            target_language_code=target_language_code,
        )
        reply_text = reply_result["translated_text"]

    # Step 4: Synthesize reply audio
    tts_result = text_to_speech(
        text=reply_text,
        target_language_code=target_language_code,
        speaker=speaker,
        pace=pace,
    )

    logger.info("Speech-to-speech pipeline complete")

    return {
        "original_transcript": original_transcript,
        "english_text": english_text,
        "reply_text": reply_text,
        "detected_language": detected_lang,
        "target_language": target_language_code,
        "audio_base64": tts_result["audio_base64"],
        "content_type": tts_result["content_type"],
    }
