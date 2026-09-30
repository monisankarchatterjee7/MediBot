"""
MediAssist - Memory & RAG Store
SQLite and In-Memory vector/context store tracking user sessions, species, diagnoses, prescriptions, and conversation history.
"""

import json
import sqlite3
import uuid
import time
from typing import Dict, List, Any, Optional
from pathlib import Path

DB_PATH = Path("data/mediassist.db")

class MemoryStore:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    created_at REAL,
                    updated_at REAL
                )
            """)
            # Diagnoses table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS diagnoses (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    species TEXT,
                    sub_category TEXT,
                    symptoms_text TEXT,
                    has_image INTEGER,
                    diagnosis_json TEXT,
                    created_at REAL,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                )
            """)
            # Prescriptions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS prescriptions (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    prescription_json TEXT,
                    created_at REAL,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                )
            """)
            # Chat messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    sender TEXT,
                    content TEXT,
                    context_snapshot TEXT,
                    created_at REAL,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                )
            """)
            conn.commit()

    def ensure_session(self, session_id: Optional[str] = None) -> str:
        if not session_id:
            session_id = f"session_{uuid.uuid4().hex[:8]}"
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT session_id FROM sessions WHERE session_id = ?", (session_id,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO sessions (session_id, created_at, updated_at) VALUES (?, ?, ?)",
                               (session_id, now, now))
            else:
                cursor.execute("UPDATE sessions SET updated_at = ? WHERE session_id = ?", (now, session_id))
            conn.commit()
        return session_id

    def save_diagnosis(self, session_id: str, species: str, sub_category: str, symptoms_text: str, has_image: bool, result_data: Dict[str, Any]):
        session_id = self.ensure_session(session_id)
        diag_id = f"diag_{uuid.uuid4().hex[:8]}"
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO diagnoses (id, session_id, species, sub_category, symptoms_text, has_image, diagnosis_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (diag_id, session_id, species, sub_category, symptoms_text, 1 if has_image else 0, json.dumps(result_data), now))
            conn.commit()
        return diag_id

    def save_prescription(self, session_id: str, prescription_data: Dict[str, Any]):
        session_id = self.ensure_session(session_id)
        rx_id = f"rx_{uuid.uuid4().hex[:8]}"
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO prescriptions (id, session_id, prescription_json, created_at)
                VALUES (?, ?, ?, ?)
            """, (rx_id, session_id, json.dumps(prescription_data), now))
            conn.commit()
        return rx_id

    def save_chat_message(self, session_id: str, sender: str, content: str, context_snapshot: Optional[str] = None):
        session_id = self.ensure_session(session_id)
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_messages (id, session_id, sender, content, context_snapshot, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (msg_id, session_id, sender, content, context_snapshot or "", now))
            conn.commit()
        return msg_id

    def get_context_for_rag(self, session_id: str) -> str:
        """Constructs RAG memory prompt containing recent diagnoses, prescriptions, and chat history."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Fetch past diagnoses
            cursor.execute("SELECT species, sub_category, symptoms_text, diagnosis_json FROM diagnoses WHERE session_id = ? ORDER BY created_at DESC LIMIT 3", (session_id,))
            diag_rows = cursor.fetchall()

            # Fetch past prescriptions
            cursor.execute("SELECT prescription_json FROM prescriptions WHERE session_id = ? ORDER BY created_at DESC LIMIT 2", (session_id,))
            rx_rows = cursor.fetchall()

            # Fetch recent chat history (last 10 messages, oldest first for readability)
            cursor.execute(
                "SELECT sender, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10",
                (session_id,)
            )
            chat_rows = list(reversed(cursor.fetchall()))

        context_parts = []
        if diag_rows:
            context_parts.append("=== PAST DIAGNOSTIC RECORDS ===")
            for row in diag_rows:
                diag = json.loads(row["diagnosis_json"])
                context_parts.append(
                    f"- Species/Category: {row['species'].capitalize()} ({row['sub_category'] or 'General'})\n"
                    f"  Symptoms: {row['symptoms_text']}\n"
                    f"  Condition Identified: {diag.get('condition_name', 'Unknown')}\n"
                    f"  Urgency: {diag.get('urgency_level', 'MODERATE')}\n"
                    f"  Treatment: {', '.join(diag.get('treatment_plan', [])[:3])}"
                )

        if rx_rows:
            context_parts.append("\n=== SCANNED PRESCRIPTIONS ===")
            for row in rx_rows:
                rx = json.loads(row["prescription_json"])
                meds = [f"{m.get('name')} {m.get('strength')} ({m.get('dosage_schedule')})" for m in rx.get("medicines", [])]
                context_parts.append(
                    f"- Detected Medicines: {', '.join(meds)}\n"
                    f"  Dietary Advice: {', '.join(rx.get('dietary_instructions', []))}"
                )

        if chat_rows:
            context_parts.append("\n=== RECENT CONVERSATION HISTORY ===")
            for row in chat_rows:
                label = "User" if row["sender"] == "user" else "Assistant"
                context_parts.append(f"{label}: {row['content']}")

        if not context_parts:
            return "No previous diagnostic, prescription, or conversation history recorded in this session yet."

        return "\n".join(context_parts)

    def get_recent_chat_history(self, session_id: str, limit: int = 20) -> List[Dict[str, str]]:
        """Returns recent chat messages as a list of {role, content} dicts for multi-turn LLM calls.
        Gemini roles: 'user' or 'model'.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT sender, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
                (session_id, limit)
            )
            rows = list(reversed(cursor.fetchall()))

        history = []
        for row in rows:
            role = "user" if row["sender"] == "user" else "model"
            history.append({"role": role, "content": row["content"]})
        return history

    def get_history(self, session_id: str) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM diagnoses WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
            diagnoses = [dict(row) for row in cursor.fetchall()]
            for d in diagnoses:
                d["diagnosis_json"] = json.loads(d["diagnosis_json"])

            cursor.execute("SELECT * FROM prescriptions WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
            prescriptions = [dict(row) for row in cursor.fetchall()]
            for p in prescriptions:
                p["prescription_json"] = json.loads(p["prescription_json"])

            cursor.execute("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
            chats = [dict(row) for row in cursor.fetchall()]

        return {
            "session_id": session_id,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
            "chat_messages": chats
        }

memory_store = MemoryStore()
