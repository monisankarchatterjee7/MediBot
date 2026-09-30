"""
MediAssist — AI Diagnostic & Prescription Reader Platform
Root application bridge to backend/main.py
"""

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
