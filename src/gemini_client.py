"""
Gemini API Client for MediBot.

Wraps the google-genai SDK to provide chat session management,
multimodal message construction, and streaming responses.
"""

import os
from typing import Optional
from google import genai
from google.genai import types

from src.prompt import MEDIBOT_SYSTEM_PROMPT, IMAGE_ANALYSIS_PROMPT, RAG_CONTEXT_PROMPT
from src.helper import encode_image_to_base64, get_mime_type


# ── Configuration ───────────────────────────────────────────────

MODEL_NAME = "gemini-2.0-flash"
EMBEDDING_MODEL = "text-embedding-004"

# Generation config for medical responses
GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.4,         # Lower temp for more factual medical responses
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,  # Allow long detailed responses
    system_instruction=MEDIBOT_SYSTEM_PROMPT,
)


class GeminiClient:
    """
    Manages interactions with the Google Gemini API.
    
    Handles client initialization, chat sessions, multimodal messages,
    and embedding generation for RAG.
    """
    
    def __init__(self):
        """Initialize the Gemini client with API key from environment."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            raise ValueError(
                "GEMINI_API_KEY not set. Get a free key from https://aistudio.google.com "
                "and add it to your .env file."
            )
        
        self.client = genai.Client(api_key=api_key)
        self._chat_sessions: dict[str, genai.chats.Chat] = {}
    
    def _build_history(self, messages: list[dict]) -> list[types.Content]:
        """
        Convert stored message history into Gemini Content objects.
        
        Args:
            messages: List of dicts with 'role' and 'content' keys.
                      Role should be 'user' or 'model'.
        
        Returns:
            List of Content objects for Gemini chat initialization.
        """
        history = []
        for msg in messages:
            role = msg["role"] if msg["role"] != "assistant" else "model"
            history.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                )
            )
        return history
    
    def create_chat_session(
        self,
        session_id: str,
        history: Optional[list[dict]] = None
    ) -> None:
        """
        Create or restore a Gemini chat session.
        
        Args:
            session_id: Unique session identifier.
            history: Optional list of previous messages to restore context.
        """
        gemini_history = self._build_history(history) if history else None
        
        chat = self.client.chats.create(
            model=MODEL_NAME,
            config=GENERATION_CONFIG,
            history=gemini_history,
        )
        self._chat_sessions[session_id] = chat
    
    def get_or_create_session(
        self,
        session_id: str,
        history: Optional[list[dict]] = None
    ) -> None:
        """Get existing session or create a new one."""
        if session_id not in self._chat_sessions:
            self.create_chat_session(session_id, history)
    
    async def send_message(
        self,
        session_id: str,
        message: str,
        rag_context: Optional[str] = None,
        history: Optional[list[dict]] = None,
    ) -> str:
        """
        Send a text message and get a response.
        
        Args:
            session_id: Chat session identifier.
            message: User's text message.
            rag_context: Optional RAG context to inject.
            history: Optional history for session restoration.
        
        Returns:
            The AI-generated response text.
        """
        self.get_or_create_session(session_id, history)
        chat = self._chat_sessions[session_id]
        
        # Build the message with optional RAG context
        full_message = message
        if rag_context:
            context_section = RAG_CONTEXT_PROMPT.format(context=rag_context)
            full_message = f"{context_section}\n\n---\n\n**User Query:** {message}"
        
        response = chat.send_message(full_message)
        return response.text
    
    async def send_message_with_image(
        self,
        session_id: str,
        message: str,
        image_bytes: bytes,
        mime_type: str,
        rag_context: Optional[str] = None,
        history: Optional[list[dict]] = None,
    ) -> str:
        """
        Send a message with an image and get a response.
        
        Args:
            session_id: Chat session identifier.
            message: User's text message (can be empty for image-only).
            image_bytes: Raw bytes of the image.
            mime_type: MIME type of the image (e.g., 'image/jpeg').
            rag_context: Optional RAG context to inject.
            history: Optional history for session restoration.
        
        Returns:
            The AI-generated response text.
        """
        self.get_or_create_session(session_id, history)
        chat = self._chat_sessions[session_id]
        
        # Build the text prompt
        user_message = message if message else "Please analyze this image."
        text_prompt = IMAGE_ANALYSIS_PROMPT.format(message=user_message)
        
        if rag_context:
            context_section = RAG_CONTEXT_PROMPT.format(context=rag_context)
            text_prompt = f"{context_section}\n\n{text_prompt}"
        
        # Build multimodal message parts
        parts = [
            types.Part.from_text(text=text_prompt),
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ]
        
        response = chat.send_message(parts)
        return response.text
    
    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for a list of texts using Gemini's embedding model.
        
        Args:
            texts: List of text strings to embed.
        
        Returns:
            List of embedding vectors.
        """
        embeddings = []
        # Process in batches of 100 (API limit)
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            result = self.client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch,
            )
            embeddings.extend([e.values for e in result.embeddings])
        
        return embeddings
    
    def remove_session(self, session_id: str) -> None:
        """Remove a chat session from memory."""
        self._chat_sessions.pop(session_id, None)
    
    def clear_all_sessions(self) -> None:
        """Clear all chat sessions from memory."""
        self._chat_sessions.clear()


# ── Singleton Instance ──────────────────────────────────────────

_client_instance: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create the singleton GeminiClient instance."""
    global _client_instance
    if _client_instance is None:
        _client_instance = GeminiClient()
    return _client_instance
