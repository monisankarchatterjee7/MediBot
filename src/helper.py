"""
Helper utilities for MediBot.

Handles image encoding/decoding, file validation, MIME type detection,
and general-purpose utility functions.
"""

import base64
import os
import uuid
from pathlib import Path
from typing import Optional

# Supported image MIME types
SUPPORTED_IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}

# Supported document types for RAG
SUPPORTED_DOC_TYPES = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
}

# Max image size: 10MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Max document size: 50MB
MAX_DOC_SIZE = 50 * 1024 * 1024

# Upload directories
UPLOAD_DIR = Path("uploads")
IMAGE_UPLOAD_DIR = UPLOAD_DIR / "images"
DOC_UPLOAD_DIR = UPLOAD_DIR / "documents"


def ensure_upload_dirs():
    """Create upload directories if they don't exist."""
    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    DOC_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_mime_type(filename: str) -> Optional[str]:
    """Get MIME type from filename extension."""
    ext = Path(filename).suffix.lower()
    return SUPPORTED_IMAGE_TYPES.get(ext) or SUPPORTED_DOC_TYPES.get(ext)


def is_valid_image(filename: str) -> bool:
    """Check if the file is a supported image type."""
    ext = Path(filename).suffix.lower()
    return ext in SUPPORTED_IMAGE_TYPES


def is_valid_document(filename: str) -> bool:
    """Check if the file is a supported document type."""
    ext = Path(filename).suffix.lower()
    return ext in SUPPORTED_DOC_TYPES


def encode_image_to_base64(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")


def decode_base64_image(base64_string: str) -> bytes:
    """Decode a base64 string back to image bytes."""
    return base64.b64decode(base64_string)


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving the original extension."""
    ext = Path(original_filename).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name


async def save_uploaded_image(file_content: bytes, original_filename: str) -> str:
    """
    Save an uploaded image to disk and return the file path.
    
    Returns:
        str: Path to the saved image file.
    
    Raises:
        ValueError: If image type is not supported or size exceeds limit.
    """
    if not is_valid_image(original_filename):
        raise ValueError(
            f"Unsupported image type. Supported: {', '.join(SUPPORTED_IMAGE_TYPES.keys())}"
        )
    
    if len(file_content) > MAX_IMAGE_SIZE:
        raise ValueError(f"Image too large. Maximum size: {MAX_IMAGE_SIZE // (1024*1024)}MB")
    
    ensure_upload_dirs()
    unique_name = generate_unique_filename(original_filename)
    file_path = IMAGE_UPLOAD_DIR / unique_name
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    return str(file_path)


async def save_uploaded_document(file_content: bytes, original_filename: str) -> str:
    """
    Save an uploaded document to disk and return the file path.
    
    Returns:
        str: Path to the saved document file.
    
    Raises:
        ValueError: If document type is not supported or size exceeds limit.
    """
    if not is_valid_document(original_filename):
        raise ValueError(
            f"Unsupported document type. Supported: {', '.join(SUPPORTED_DOC_TYPES.keys())}"
        )
    
    if len(file_content) > MAX_DOC_SIZE:
        raise ValueError(f"Document too large. Maximum size: {MAX_DOC_SIZE // (1024*1024)}MB")
    
    ensure_upload_dirs()
    unique_name = generate_unique_filename(original_filename)
    file_path = DOC_UPLOAD_DIR / unique_name
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    return str(file_path)


def truncate_text(text: str, max_length: int = 100) -> str:
    """Truncate text for display purposes (e.g., session titles)."""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


def generate_session_title(first_message: str) -> str:
    """Generate a session title from the first user message."""
    # Remove excessive whitespace
    cleaned = " ".join(first_message.split())
    return truncate_text(cleaned, 60)
