"""
RAG (Retrieval-Augmented Generation) Engine for MediBot.

Handles document ingestion, text chunking, embedding generation,
vector storage (ChromaDB), and context retrieval for queries.
"""

import os
# pyrefly: ignore [missing-import]
import fitz  # PyMuPDF
# pyrefly: ignore [missing-import]
import chromadb
from pathlib import Path
from typing import Optional

from src.gemini_client import get_gemini_client


# ── Configuration ───────────────────────────────────────────────

CHROMA_DIR = Path("data/chromadb")
COLLECTION_NAME = "medibot_knowledge"
CHUNK_SIZE = 500       # ~500 words per chunk
CHUNK_OVERLAP = 50     # 50-word overlap between chunks
TOP_K_RESULTS = 3      # Number of chunks to retrieve per query


class RAGEngine:
    """
    Manages the medical knowledge base using RAG.
    
    Documents are chunked, embedded, and stored in ChromaDB.
    Relevant context is retrieved for each user query to enhance
    the AI's responses with verified medical information.
    """
    
    def __init__(self):
        """Initialize ChromaDB client and collection."""
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        
        self.chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self.collection = self.chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "MediBot medical knowledge base"}
        )
    
    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text content from a PDF file."""
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
        return text.strip()
    
    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from a file based on its type."""
        ext = Path(file_path).suffix.lower()
        
        if ext == ".pdf":
            return self._extract_text_from_pdf(file_path)
        elif ext in (".txt", ".md"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    def _chunk_text(self, text: str) -> list[str]:
        """
        Split text into overlapping chunks.
        
        Uses word-level chunking for cleaner splits.
        """
        words = text.split()
        chunks = []
        
        if len(words) <= CHUNK_SIZE:
            return [text] if text.strip() else []
        
        for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
            chunk_words = words[i:i + CHUNK_SIZE]
            chunk = " ".join(chunk_words)
            if chunk.strip():
                chunks.append(chunk)
        
        return chunks
    
    async def ingest_document(self, file_path: str, filename: str) -> int:
        """
        Ingest a document into the knowledge base.
        
        Args:
            file_path: Path to the document file.
            filename: Original filename for metadata.
        
        Returns:
            Number of chunks created.
        """
        # Extract text
        text = self._extract_text_from_file(file_path)
        
        if not text:
            raise ValueError("No text could be extracted from the document.")
        
        # Chunk the text
        chunks = self._chunk_text(text)
        
        if not chunks:
            raise ValueError("Document produced no usable text chunks.")
        
        # Generate embeddings
        gemini = get_gemini_client()
        embeddings = await gemini.generate_embeddings(chunks)
        
        # Generate unique IDs for each chunk
        base_id = Path(filename).stem.replace(" ", "_").lower()
        ids = [f"{base_id}_chunk_{i}" for i in range(len(chunks))]
        
        # Store in ChromaDB
        self.collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=[
                {"source": filename, "chunk_index": i}
                for i in range(len(chunks))
            ]
        )
        
        return len(chunks)
    
    async def retrieve_context(self, query: str) -> Optional[str]:
        """
        Retrieve relevant context from the knowledge base for a query.
        
        Args:
            query: User's query text.
        
        Returns:
            Concatenated relevant context, or None if no documents exist.
        """
        # Check if collection has any documents
        if self.collection.count() == 0:
            return None
        
        # Generate embedding for the query
        gemini = get_gemini_client()
        query_embedding = await gemini.generate_embeddings([query])
        
        # Search ChromaDB
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=min(TOP_K_RESULTS, self.collection.count()),
        )
        
        if not results or not results["documents"] or not results["documents"][0]:
            return None
        
        # Combine retrieved chunks with source attribution
        context_parts = []
        for i, (doc, metadata) in enumerate(
            zip(results["documents"][0], results["metadatas"][0])
        ):
            source = metadata.get("source", "Unknown")
            context_parts.append(f"[Source: {source}]\n{doc}")
        
        return "\n\n---\n\n".join(context_parts)
    
    def get_document_count(self) -> int:
        """Get the total number of chunks in the knowledge base."""
        return self.collection.count()
    
    def clear_knowledge_base(self) -> None:
        """Clear all documents from the knowledge base."""
        self.chroma_client.delete_collection(COLLECTION_NAME)
        self.collection = self.chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "MediBot medical knowledge base"}
        )


# ── Singleton Instance ──────────────────────────────────────────

_rag_engine: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    """Get or create the singleton RAGEngine instance."""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine
