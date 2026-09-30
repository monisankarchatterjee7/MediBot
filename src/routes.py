"""
FastAPI Routes for MediBot.

Defines all API endpoints for chat, sessions, image upload, and RAG.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from src.models import (
    ChatRequest, ChatResponse, SessionCreateRequest,
    SessionInfo, SessionListResponse, MessageListResponse,
    HealthResponse, RAGUploadResponse, ErrorResponse,
)
from src.gemini_client import get_gemini_client
from src.session_manager import get_session_manager
from src.rag_engine import get_rag_engine
from src.helper import (
    save_uploaded_image, save_uploaded_document,
    get_mime_type, is_valid_image, is_valid_document,
)


router = APIRouter(prefix="/api", tags=["MediBot API"])


# ── Health Check ────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse()


# ── Session Management ──────────────────────────────────────────

@router.post("/sessions", response_model=SessionInfo)
async def create_session(request: Optional[SessionCreateRequest] = None):
    """Create a new chat session."""
    sm = get_session_manager()
    title = request.title if request else None
    session = await sm.create_session(title)
    return SessionInfo(**session)


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions():
    """List all chat sessions, most recent first."""
    sm = get_session_manager()
    sessions = await sm.list_sessions()
    return SessionListResponse(
        sessions=[SessionInfo(**s) for s in sessions]
    )


@router.get("/sessions/{session_id}/messages", response_model=MessageListResponse)
async def get_session_messages(session_id: str):
    """Get all messages for a specific session."""
    sm = get_session_manager()
    session = await sm.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await sm.get_messages(session_id)
    return MessageListResponse(messages=messages)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its messages."""
    sm = get_session_manager()
    gemini = get_gemini_client()
    
    deleted = await sm.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Also remove from Gemini's in-memory sessions
    gemini.remove_session(session_id)
    
    return {"message": "Session deleted successfully"}


# ── Chat (Text Only) ───────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def send_chat_message(request: ChatRequest):
    """
    Send a text message and receive an AI response.
    
    Maintains conversation context within the session.
    """
    sm = get_session_manager()
    gemini = get_gemini_client()
    rag = get_rag_engine()
    
    # Ensure session exists
    session = await sm.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save user message
    await sm.add_message(request.session_id, "user", request.message)
    
    # Get history for Gemini context
    history = await sm.get_history_for_gemini(request.session_id)
    # Remove the last message (the one we just added) since we'll send it as the current message
    history = history[:-1] if history else []
    
    # Retrieve RAG context if available
    rag_context = await rag.retrieve_context(request.message)
    
    try:
        # Send to Gemini
        response_text = await gemini.send_message(
            session_id=request.session_id,
            message=request.message,
            rag_context=rag_context,
            history=history,
        )
        
        # Save assistant response
        await sm.add_message(request.session_id, "assistant", response_text)
        
        return ChatResponse(
            session_id=request.session_id,
            response=response_text,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


# ── Chat with Image ────────────────────────────────────────────

@router.post("/chat/image", response_model=ChatResponse)
async def send_chat_with_image(
    session_id: str = Form(...),
    message: str = Form(default=""),
    image: UploadFile = File(...),
):
    """
    Send a message with an image attachment.
    
    Supports skin/wound photos, X-rays, prescriptions, plant diseases,
    and animal condition photos.
    """
    sm = get_session_manager()
    gemini = get_gemini_client()
    rag = get_rag_engine()
    
    # Validate session
    session = await sm.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate image
    if not image.filename or not is_valid_image(image.filename):
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Supported: JPG, PNG, GIF, WebP, BMP"
        )
    
    # Read and save image
    image_bytes = await image.read()
    
    try:
        image_path = await save_uploaded_image(image_bytes, image.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Get MIME type
    mime_type = get_mime_type(image.filename) or "image/jpeg"
    
    # Build display message
    display_message = message if message else "📷 [Image uploaded for analysis]"
    
    # Save user message with image reference
    await sm.add_message(session_id, "user", display_message, image_path)
    
    # Get history
    history = await sm.get_history_for_gemini(session_id)
    history = history[:-1] if history else []
    
    # Retrieve RAG context
    rag_context = await rag.retrieve_context(display_message)
    
    try:
        # Send to Gemini with image
        response_text = await gemini.send_message_with_image(
            session_id=session_id,
            message=message,
            image_bytes=image_bytes,
            mime_type=mime_type,
            rag_context=rag_context,
            history=history,
        )
        
        # Save assistant response
        await sm.add_message(session_id, "assistant", response_text)
        
        return ChatResponse(
            session_id=session_id,
            response=response_text,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


# ── RAG Document Upload ────────────────────────────────────────

@router.post("/rag/upload", response_model=RAGUploadResponse)
async def upload_rag_document(
    document: UploadFile = File(...),
):
    """
    Upload a medical document to enhance MediBot's knowledge base.
    
    Supports PDF, TXT, and MD files. Documents are chunked, embedded,
    and stored for retrieval during conversations.
    """
    rag = get_rag_engine()
    
    if not document.filename or not is_valid_document(document.filename):
        raise HTTPException(
            status_code=400,
            detail="Invalid document format. Supported: PDF, TXT, MD"
        )
    
    # Read and save document
    doc_bytes = await document.read()
    
    try:
        doc_path = await save_uploaded_document(doc_bytes, document.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    try:
        # Ingest into RAG
        chunks_created = await rag.ingest_document(doc_path, document.filename)
        
        return RAGUploadResponse(
            filename=document.filename,
            chunks_created=chunks_created,
            message=f"Successfully processed '{document.filename}' into {chunks_created} knowledge chunks.",
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing error: {str(e)}")


@router.get("/rag/status")
async def rag_status():
    """Get the status of the RAG knowledge base."""
    rag = get_rag_engine()
    return {
        "total_chunks": rag.get_document_count(),
        "status": "active" if rag.get_document_count() > 0 else "empty",
    }
