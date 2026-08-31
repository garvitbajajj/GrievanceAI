"""
BhashaFlow AI Engine - OCR Service

Uses fast PDF text extraction by default. EasyOCR is optional because loading
PyTorch/EasyOCR can exceed small Render instance memory limits.
"""

import io
import logging
from typing import Any, Optional

from PIL import Image

from .config import DEFAULT_OCR_LANGUAGES, ENABLE_EASYOCR, MAX_PDF_PAGES, MAX_OCR_TEXT_CHARS, PDF_RENDER_SCALE

logger = logging.getLogger(__name__)

_reader: Optional[Any] = None
_loaded_languages: list[str] = []


def _get_reader(languages: list[str]) -> Any:
    """
    Return a cached EasyOCR reader, reinitializing only if the
    requested language set has changed.
    """
    global _reader, _loaded_languages

    if _reader is None or set(languages) != set(_loaded_languages):
        logger.info("Initializing EasyOCR reader with languages: %s", languages)
        import easyocr

        _reader = easyocr.Reader(languages, gpu=False, verbose=False)
        _loaded_languages = list(languages)
        logger.info("EasyOCR reader ready.")

    return _reader


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PDF text extraction requires PyMuPDF. Install pymupdf in requirements.txt.") from exc

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise RuntimeError(f"Could not open PDF file: {exc}") from exc

    text_parts: list[str] = []
    try:
        page_count = min(len(doc), MAX_PDF_PAGES)
        for page_index in range(page_count):
            page_text = doc.load_page(page_index).get_text("text").strip()
            if page_text:
                prefix = f"[Page {page_index + 1}] " if page_count > 1 else ""
                text_parts.append(f"{prefix}{page_text}")
            if sum(len(part) for part in text_parts) >= MAX_OCR_TEXT_CHARS:
                break
    finally:
        doc.close()

    return "\n\n".join(text_parts).strip()[:MAX_OCR_TEXT_CHARS]


def _looks_like_pdf(file_bytes: bytes, filename: Optional[str], content_type: Optional[str]) -> bool:
    lower_name = (filename or "").lower()
    lower_type = (content_type or "").lower()
    return (
        file_bytes.startswith(b"%PDF")
        or lower_name.endswith(".pdf")
        or lower_type == "application/pdf"
    )


def _image_to_png_bytes(image: Image.Image) -> bytes:
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def _render_pdf_pages(pdf_bytes: bytes) -> list[Image.Image]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PDF OCR requires PyMuPDF. Install pymupdf in requirements.txt.") from exc

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise RuntimeError(f"Could not open PDF file: {exc}") from exc

    images: list[Image.Image] = []
    try:
        page_count = min(len(doc), MAX_PDF_PAGES)
        matrix = fitz.Matrix(PDF_RENDER_SCALE, PDF_RENDER_SCALE)

        for page_index in range(page_count):
            page = doc.load_page(page_index)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGB")
            images.append(image)
    finally:
        doc.close()

    if not images:
        raise RuntimeError("PDF has no readable pages.")

    return images


def _load_pages_from_upload(
    file_bytes: bytes,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> list[Image.Image]:
    if _looks_like_pdf(file_bytes, filename, content_type):
        return _render_pdf_pages(file_bytes)

    try:
        return [Image.open(io.BytesIO(file_bytes)).convert("RGB")]
    except Exception as exc:
        raise RuntimeError(f"Unsupported or unreadable image/PDF file: {exc}") from exc


def get_preview_image_bytes(
    file_bytes: bytes,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> bytes:
    """
    Return a PNG preview of the first image/page for Gemini Vision script detection.
    """
    pages = _load_pages_from_upload(file_bytes, filename, content_type)
    return _image_to_png_bytes(pages[0])


def extract_text_from_image(
    image_bytes: bytes,
    languages: Optional[list[str]] = None,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> dict:
    if languages is None:
        languages = DEFAULT_OCR_LANGUAGES
    else:
        # Render free/small instances cannot safely load many recognition
        # packs. Keep OCR bounded and fall back to the preloaded pair.
        safe_languages = [lang for lang in languages if lang in DEFAULT_OCR_LANGUAGES]
        languages = safe_languages or DEFAULT_OCR_LANGUAGES

    try:
        if _looks_like_pdf(image_bytes, filename, content_type):
            pdf_text = _extract_pdf_text(image_bytes)
            if pdf_text:
                logger.info("PDF text extracted without EasyOCR: chars=%d", len(pdf_text))
                return {
                    "extracted_text": pdf_text,
                    "details": [],
                    "page_count": min(pdf_text.count("[Page "), MAX_PDF_PAGES) or 1,
                    "method": "pdf_text",
                }

            if not ENABLE_EASYOCR:
                raise RuntimeError(
                    "This PDF appears to be scanned/image-only. OCR is disabled on this Render plan to prevent service crashes."
                )

        if not ENABLE_EASYOCR:
            raise RuntimeError(
                "Image OCR is disabled on this Render plan to prevent service crashes. Upload a text-based PDF or type the complaint text."
            )

        pages = _load_pages_from_upload(image_bytes, filename, content_type)

        try:
            reader = _get_reader(languages)
        except ValueError:
            logger.warning("Compatibility error with %s. Falling back to ['en', 'hi'].", languages)
            reader = _get_reader(["en", "hi"])

        details = []
        text_parts = []

        import numpy as np

        for page_number, image in enumerate(pages, start=1):
            image_np = np.array(image)
            results = reader.readtext(image_np)

            page_text_parts = []
            for bbox, text, confidence in results:
                details.append({
                    "page": page_number,
                    "text": text,
                    "confidence": round(float(confidence), 4),
                    "bbox": [[int(coord) for coord in point] for point in bbox],
                })
                page_text_parts.append(text)

            page_text = " ".join(page_text_parts).strip()
            if page_text:
                text_parts.append(f"[Page {page_number}] {page_text}" if len(pages) > 1 else page_text)

            if sum(len(part) for part in text_parts) >= MAX_OCR_TEXT_CHARS:
                logger.info("OCR text limit reached at %d chars.", MAX_OCR_TEXT_CHARS)
                break

        return {
            "extracted_text": "\n\n".join(text_parts).strip()[:MAX_OCR_TEXT_CHARS],
            "details": details,
            "page_count": len(pages),
        }
    except Exception as e:
        logger.exception("OCR extraction failed")
        raise RuntimeError(f"OCR extraction failed: {e}") from e
