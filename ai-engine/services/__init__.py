# BhashaFlow AI Engine — Services Package

from .config import (
    SARVAM_API_KEY,
    GEMINI_API_KEY,
    LANG_CODES,
    LANG_NAMES,
    BCP47_TO_SHORT,
)

from .translate_service import translate_text, get_language_name
from .speech_service import speech_to_text, text_to_speech, speech_to_speech
from .ocr_service import extract_text_from_image
from .gemini_service import analyze_with_gemini
from .grievance_service import process_grievance_full

__all__ = [
    # Config
    "SARVAM_API_KEY",
    "GEMINI_API_KEY",
    "LANG_CODES",
    "LANG_NAMES",
    "BCP47_TO_SHORT",
    # Translation
    "translate_text",
    "get_language_name",
    # Speech
    "speech_to_text",
    "text_to_speech",
    "speech_to_speech",
    # OCR
    "extract_text_from_image",
    # Gemini
    "analyze_with_gemini",
    # Grievance pipeline
    "process_grievance_full",
]