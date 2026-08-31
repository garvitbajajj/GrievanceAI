"""
BhashaFlow AI Engine — Centralized Configuration

All API keys, URLs, language maps, and shared constants live here.
API key is loaded from the SARVAM_API_KEY environment variable.
"""

import os

# ═══════════════════════════════════════════════════════════════════
#  SARVAM AI CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# ═══════════════════════════════════════════════════════════════════
#  GEMINI CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-3-flash-preview,gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash",
    ).split(",")
    if model.strip()
]
if GEMINI_MODEL not in GEMINI_FALLBACK_MODELS:
    GEMINI_FALLBACK_MODELS.insert(0, GEMINI_MODEL)

# Keep Gemini usage predictable on small/free quotas. The full grievance flow
# should normally spend one Gemini call on final classification only.
GEMINI_ENABLE_OCR_SCRIPT_DETECTION = os.getenv("GEMINI_ENABLE_OCR_SCRIPT_DETECTION", "false").lower() == "true"
GEMINI_ENABLE_OCR_CLEANUP = os.getenv("GEMINI_ENABLE_OCR_CLEANUP", "false").lower() == "true"

SARVAM_HEADERS = {
    "api-subscription-key": SARVAM_API_KEY,
    "Content-Type": "application/json",
}

# Base URLs for Sarvam AI endpoints
SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate"
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# Request timeout (seconds). Keep each external API call below the backend's
# total AI-engine timeout so the user gets a controlled response.
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "20"))

# ═══════════════════════════════════════════════════════════════════
#  LANGUAGE MAPS
# ═══════════════════════════════════════════════════════════════════

# Short code → BCP-47 code (used by Sarvam API)
LANG_CODES = {
    "hi": "hi-IN",   "en": "en-IN",   "mr": "mr-IN",
    "ta": "ta-IN",   "te": "te-IN",   "kn": "kn-IN",
    "ml": "ml-IN",   "bn": "bn-IN",   "gu": "gu-IN",
    "pa": "pa-IN",   "or": "od-IN",   "as": "as-IN",
    "ur": "ur-IN",   "sd": "sd-IN",   "ne": "ne-IN",
    "si": "si-LK",   "sa": "sa-IN",   "kok": "kok-IN",
    "mni": "mni-IN", "brx": "brx-IN", "doi": "doi-IN",
    "ks": "ks-IN",
}

# Short code → Human-readable name
LANG_NAMES = {
    "hi": "Hindi",       "en": "English",    "mr": "Marathi",
    "ta": "Tamil",       "te": "Telugu",     "kn": "Kannada",
    "ml": "Malayalam",   "bn": "Bengali",    "gu": "Gujarati",
    "pa": "Punjabi",     "or": "Odia",       "as": "Assamese",
    "ur": "Urdu",        "sd": "Sindhi",     "ne": "Nepali",
    "si": "Sinhala",     "sa": "Sanskrit",   "kok": "Konkani",
    "mni": "Manipuri",   "brx": "Bodo",      "doi": "Dogri",
    "ks": "Kashmiri",
}

# BCP-47 code → Short code (reverse lookup)
BCP47_TO_SHORT = {v: k for k, v in LANG_CODES.items()}

# ═══════════════════════════════════════════════════════════════════
#  OCR CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

# Default subset of languages for EasyOCR
# (more languages = more memory; keep this tight)
DEFAULT_OCR_LANGUAGES = ["en", "hi"]
ENABLE_EASYOCR = os.getenv("ENABLE_EASYOCR", "false").lower() == "true"
MAX_OCR_FILE_BYTES = int(os.getenv("MAX_OCR_FILE_BYTES", str(4 * 1024 * 1024)))
MAX_AUDIO_FILE_BYTES = int(os.getenv("MAX_AUDIO_FILE_BYTES", str(4 * 1024 * 1024)))
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "4000"))
MAX_OCR_TEXT_CHARS = int(os.getenv("MAX_OCR_TEXT_CHARS", "2500"))
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "2"))
PDF_RENDER_SCALE = float(os.getenv("PDF_RENDER_SCALE", "1.35"))

# ═══════════════════════════════════════════════════════════════════
#  TTS CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

DEFAULT_TTS_SPEAKER = "shubh"       # Male voice (bulbul:v3 default)
DEFAULT_TTS_PACE = 1.0
DEFAULT_TTS_MODEL = "bulbul:v3"

# Languages supported by TTS (bulbul:v3)
TTS_SUPPORTED_LANGS = [
    "hi-IN", "bn-IN", "kn-IN", "ml-IN", "mr-IN",
    "od-IN", "pa-IN", "ta-IN", "te-IN", "en-IN", "gu-IN",
]

# ═══════════════════════════════════════════════════════════════════
#  STT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

DEFAULT_STT_MODEL = "saaras:v3"
DEFAULT_STT_MODE = "transcribe"     # transcribe | translate | verbatim
