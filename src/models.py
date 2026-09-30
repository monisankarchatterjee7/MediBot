"""
Pydantic models for MediBot API request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Request Models ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Request body for sending a text message."""
    session_id: str = Field(..., description="Chat session identifier")
    message: str = Field(..., min_length=1, description="User message text")


class SessionCreateRequest(BaseModel):
    """Request body for creating a new chat session."""
    title: Optional[str] = Field(None, description="Optional session title")


# ── Response Models ─────────────────────────────────────────────

class ChatResponse(BaseModel):
    """Response body for a chat message."""
    session_id: str
    response: str = Field(..., description="AI-generated response text")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class MessageInfo(BaseModel):
    """A single message in a conversation."""
    id: int
    session_id: str
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    image_path: Optional[str] = None
    timestamp: str


class SessionInfo(BaseModel):
    """Information about a chat session."""
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class SessionListResponse(BaseModel):
    """Response containing a list of sessions."""
    sessions: list[SessionInfo]


class MessageListResponse(BaseModel):
    """Response containing a list of messages."""
    messages: list[MessageInfo]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "1.0.0"
    service: str = "MediBot API"


class RAGUploadResponse(BaseModel):
    """Response after uploading a document for RAG."""
    filename: str
    chunks_created: int
    message: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
