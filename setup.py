"""
MediBot — Intelligent Medical AI Chatbot
Setup configuration for the Python backend package.
"""

from setuptools import setup, find_packages

setup(
    name="medibot",
    version="1.0.0",
    description="Intelligent Medical AI Chatbot powered by Google Gemini",
    author="MediBot Team",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "fastapi>=0.115.0",
        "uvicorn[standard]>=0.34.0",
        "google-genai>=1.14.0",
        "python-dotenv>=1.1.0",
        "python-multipart>=0.0.20",
        "chromadb>=1.0.0",
        "pymupdf>=1.25.0",
        "pydantic>=2.11.0",
        "aiosqlite>=0.21.0",
    ],
)
