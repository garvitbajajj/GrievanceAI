"""
BhashaFlow AI Engine — Grievance Service

Orchestrates the full processing pipeline for /process-grievance-full:
  1. Extract text from input (text / image / audio)
  2. Translate to English via Sarvam
  3. Analyse with Gemini 2.0 Flash
  4. Return structured JSON to the Node.js backend
"""

import logging
import time
from typing import Optional

from fastapi import File, Form, HTTPException, UploadFile

from .config import GEMINI_ENABLE_OCR_SCRIPT_DETECTION, MAX_AUDIO_FILE_BYTES, MAX_OCR_FILE_BYTES, MAX_TEXT_CHARS
from .gemini_service import analyze_with_gemini, analyze_with_gemini_fix_ocr, identify_scripts_with_gemini
from .ocr_service import extract_text_from_image, get_preview_image_bytes
from .speech_service import speech_to_text
from .translate_service import get_language_name, translate_long_text, _guess_source_language_code

logger = logging.getLogger(__name__)


async def process_grievance_full(
    text: Optional[str],
    image: Optional[UploadFile],
    audio: Optional[UploadFile],
    source_language_code: str = "auto",
) -> dict:
    """
    Full grievance processing pipeline.

    Combines all provided inputs: audio, attachment OCR, and typed text.

    Returns the contract JSON the Node.js backend expects:
    {
        success, original_text, english_text, detected_language,
        input_type, title, english_summary, verification_sentence,
        category, keywords, confidence_score,
        ocr_raw_text, stt_transcript, processing_ms
    }
    """
    t_start = time.monotonic()

    extracted_text = ""
    detected_language = source_language_code
    input_type = ""
    ocr_raw_text = None
    stt_transcript = None
    text_segments: list[str] = []
    input_types: list[str] = []

    # ── STEP 1: Extract text from whichever input was provided ────────
    if audio is not None:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file.")
        if len(audio_bytes) > MAX_AUDIO_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio file is too large. Maximum supported size is {MAX_AUDIO_FILE_BYTES // (1024 * 1024)} MB.",
            )

        logger.info("STT: transcribing audio file '%s' (%d bytes)", audio.filename, len(audio_bytes))
        stt_result = speech_to_text(
            audio_bytes=audio_bytes,
            filename=audio.filename or "audio.wav",
            language_code="unknown",
            mode="transcribe",
        )
        extracted_text = stt_result["transcript"]
        detected_language = stt_result.get("language_code", "unknown")
        stt_transcript = extracted_text
        text_segments.append(f"Voice complaint:\n{extracted_text}")
        input_types.append("audio")
        logger.info("STT done: lang=%s, chars=%d", detected_language, len(extracted_text))

    if image is not None:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty attachment file.")
        if len(image_bytes) > MAX_OCR_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Attachment is too large for OCR. Maximum supported size is {MAX_OCR_FILE_BYTES // (1024 * 1024)} MB.",
            )

        logger.info(
            "OCR: Processing attachment '%s' (%s, %d bytes)",
            image.filename,
            image.content_type,
            len(image_bytes),
        )
        
        # Step A: Identify scripts via Gemini Vision only when explicitly enabled.
        # Default stays en+hi to preserve the daily Gemini budget and avoid extra
        # PDF rendering/model-loading work on Render.
        if GEMINI_ENABLE_OCR_SCRIPT_DETECTION:
            preview_bytes = get_preview_image_bytes(
                image_bytes,
                filename=image.filename,
                content_type=image.content_type,
            )
            identified_langs = identify_scripts_with_gemini(preview_bytes)
            logger.info("Gemini identified scripts: %s", identified_langs)
        else:
            identified_langs = ["en", "hi"]
            logger.info("OCR scripts defaulted: %s", identified_langs)

        # Step B: Run OCR with dynamic scripts
        try:
            ocr_result = extract_text_from_image(
                image_bytes,
                identified_langs,
                filename=image.filename,
                content_type=image.content_type,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        raw_ocr_text = ocr_result["extracted_text"]

        # Step C: Dual Validation (Gemini fixes the raw text)
        extracted_text = analyze_with_gemini_fix_ocr(raw_ocr_text, identified_langs)
        
        ocr_raw_text = raw_ocr_text  # Keep raw text for audit
        if detected_language in {"auto", "unknown"}:
            detected_language = identified_langs[0] if identified_langs else "auto"
        text_segments.append(f"Attachment OCR text:\n{extracted_text}")
        input_types.append("attachment")
        logger.info("OCR & Dual Validation done: chars=%d", len(extracted_text))

    if text and text.strip():
        typed_text = text.strip()[:MAX_TEXT_CHARS]
        text_segments.append(f"Typed complaint:\n{typed_text}")
        input_types.append("text")
        # Use Unicode script detection to identify the language from the text itself
        if detected_language in {"auto", "unknown"}:
            guessed = _guess_source_language_code(typed_text)
            if guessed:
                detected_language = guessed
                logger.info("Script detection guessed language: %s", detected_language)
            else:
                detected_language = source_language_code
        logger.info("Text input: chars=%d, detected_lang=%s", len(typed_text), detected_language)

    if not text_segments:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one of: text, image, or audio.",
        )

    extracted_text = "\n\n".join(text_segments).strip()
    input_type = "+".join(input_types)
    if len(input_types) > 1:
        detected_language = "auto"

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract any text from the provided {input_type} input.",
        )

    # ── STEP 2: Translate to English via Sarvam ───────────────────────
    logger.info("Translating %d chars from '%s' to en-IN", len(extracted_text), detected_language)
    try:
        translation = translate_long_text(
            text=extracted_text,
            source_language_code=detected_language if detected_language != "auto" else "auto",
            target_language_code="en-IN",
        )
        english_text = translation["translated_text"]
        # Sarvam auto-detects and echoes the real source language
        detected_language = translation.get("source_language_code", detected_language)
    except RuntimeError as exc:
        logger.warning("Translation failed: %s — falling back to original text.", exc)
        english_text = extracted_text  # graceful degradation

    logger.info("Translation done: detected_lang=%s, english chars=%d", detected_language, len(english_text))

    # ── STEP 3: Gemini analysis ───────────────────────────────────────
    logger.info("Running Gemini analysis...")
    gemini_result = analyze_with_gemini(english_text, detected_language)
    logger.info(
        "Gemini done: category=%s, confidence=%.2f",
        gemini_result["category"], gemini_result["confidence_score"]
    )

    # ── STEP 4: Assemble and return ───────────────────────────────────
    processing_ms = int((time.monotonic() - t_start) * 1000)

    return {
        "success": True,
        "original_text": extracted_text,
        "english_text": english_text,
        "detected_language": detected_language,
        "input_type": input_type,
        # From Gemini
        "title": gemini_result["title"],
        "english_summary": gemini_result["english_summary"],
        "verification_sentence": gemini_result["verification_sentence"],
        "category": gemini_result["category"],
        "keywords": gemini_result["keywords"],
        "confidence_score": gemini_result["confidence_score"],
        # Raw intermediates (null if not applicable)
        "ocr_raw_text": ocr_raw_text,
        "stt_transcript": stt_transcript,
        "processing_ms": processing_ms,
    }
