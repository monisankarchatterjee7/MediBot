"""
Session Manager for MediBot.

SQLite-backed chat session persistence. Stores conversation history
so users can resume chats and the AI maintains context across sessions.
"""

import aiosqlite
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.helper import generate_session_title


# ── Database Configuration ──────────────────────────────────────

DB_PATH = Path("data/medibot.db")


async def init_database():
    """Initialize the SQLite database and create tables if needed."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                image_path TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_session 
            ON messages(session_id)
        """)
        
        await db.commit()


class SessionManager:
    """Manages chat sessions and message persistence in SQLite."""
    
    async def create_session(self, title: Optional[str] = None) -> dict:
        """
        Create a new chat session.
        
        Args:
            title: Optional session title. Defaults to "New Chat".
        
        Returns:
            Dict with session info.
        """
        session_id = uuid.uuid4().hex[:12]
        now = datetime.now().isoformat()
        session_title = title or "New Chat"
        
        async with aiosqlite.connect(str(DB_PATH)) as db:
            await db.execute(
                "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (session_id, session_title, now, now)
            )
            await db.commit()
        
        return {
            "id": session_id,
            "title": session_title,
            "created_at": now,
            "updated_at": now,
            "message_count": 0,
        }
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get a session by ID."""
        async with aiosqlite.connect(str(DB_PATH)) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM sessions WHERE id = ?", (session_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            # Get message count
            count_cursor = await db.execute(
                "SELECT COUNT(*) FROM messages WHERE session_id = ?", (session_id,)
            )
            count_row = await count_cursor.fetchone()
            
            return {
                "id": row["id"],
                "title": row["title"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "message_count": count_row[0] if count_row else 0,
            }
    
    async def list_sessions(self) -> list[dict]:
        """List all sessions, most recent first."""
        async with aiosqlite.connect(str(DB_PATH)) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT s.*, COUNT(m.id) as message_count
                FROM sessions s
                LEFT JOIN messages m ON s.id = m.session_id
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                """
            )
            rows = await cursor.fetchall()
            
            return [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "message_count": row["message_count"],
                }
                for row in rows
            ]
    
    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a session and all its messages.
        
        Returns:
            True if the session was deleted, False if not found.
        """
        async with aiosqlite.connect(str(DB_PATH)) as db:
            # Delete messages first (cascade might not work with all SQLite versions)
            await db.execute(
                "DELETE FROM messages WHERE session_id = ?", (session_id,)
            )
            cursor = await db.execute(
                "DELETE FROM sessions WHERE id = ?", (session_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
    
    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        image_path: Optional[str] = None,
    ) -> dict:
        """
        Add a message to a session.
        
        Args:
            session_id: Session to add message to.
            role: 'user' or 'assistant'.
            content: Message text content.
            image_path: Optional path to an uploaded image.
        
        Returns:
            Dict with message info.
        """
        now = datetime.now().isoformat()
        
        async with aiosqlite.connect(str(DB_PATH)) as db:
            cursor = await db.execute(
                """
                INSERT INTO messages (session_id, role, content, image_path, timestamp)
                VALUES (?, ?, ?, ?, ?)
                """,
                (session_id, role, content, image_path, now)
            )
            message_id = cursor.lastrowid
            
            # Update session's updated_at timestamp
            await db.execute(
                "UPDATE sessions SET updated_at = ? WHERE id = ?",
                (now, session_id)
            )
            
            # Auto-update session title from first user message
            count_cursor = await db.execute(
                "SELECT COUNT(*) FROM messages WHERE session_id = ? AND role = 'user'",
                (session_id,)
            )
            count_row = await count_cursor.fetchone()
            if count_row and count_row[0] == 1 and role == "user":
                new_title = generate_session_title(content)
                await db.execute(
                    "UPDATE sessions SET title = ? WHERE id = ?",
                    (new_title, session_id)
                )
            
            await db.commit()
        
        return {
            "id": message_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "image_path": image_path,
            "timestamp": now,
        }
    
    async def get_messages(self, session_id: str) -> list[dict]:
        """Get all messages for a session, ordered by time."""
        async with aiosqlite.connect(str(DB_PATH)) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC",
                (session_id,)
            )
            rows = await cursor.fetchall()
            
            return [
                {
                    "id": row["id"],
                    "session_id": row["session_id"],
                    "role": row["role"],
                    "content": row["content"],
                    "image_path": row["image_path"],
                    "timestamp": row["timestamp"],
                }
                for row in rows
            ]
    
    async def get_history_for_gemini(self, session_id: str) -> list[dict]:
        """
        Get message history in Gemini-compatible format.
        
        Returns:
            List of dicts with 'role' and 'content' keys.
            Role is 'user' or 'model' (Gemini format).
        """
        messages = await self.get_messages(session_id)
        return [
            {
                "role": msg["role"] if msg["role"] == "user" else "model",
                "content": msg["content"],
            }
            for msg in messages
        ]


# ── Singleton Instance ──────────────────────────────────────────

_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get or create the singleton SessionManager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
