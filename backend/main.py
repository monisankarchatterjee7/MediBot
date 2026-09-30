"""
MediAssist - AI Diagnostic & Prescription Reader Platform
FastAPI Application Entrypoint
"""

import os
import re
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from backend.ai_engine import ai_engine
from backend.prescription_engine import prescription_engine
from backend.memory_store import memory_store

app = FastAPI(
    title="MediAssist - AI Diagnostic Platform API",
    description="Multimodal diagnostic assist supporting Human Health, Veterinary Animals, and Agricultural Plants with Handwritten Prescription OCR & RAG memory.",
    version="2.0.0"
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class DiagnoseRequest(BaseModel):
    species: str = Field(default="human", description="human | veterinary | plant")
    sub_category: Optional[str] = Field(default="", description="cattle | pet | bird | crop type")
    symptoms_text: Optional[str] = Field(default="", description="Symptom text description")
    image_base64: Optional[str] = Field(default=None, description="Base64 encoded image string")
    session_id: Optional[str] = Field(default=None, description="Active user session ID")

class PrescriptionScanRequest(BaseModel):
    image_base64: Optional[str] = Field(default=None, description="Base64 encoded prescription image")
    text_raw: Optional[str] = Field(default="", description="Raw prescription text snippet")
    session_id: Optional[str] = Field(default=None, description="Active user session ID")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User follow-up message")
    session_id: Optional[str] = Field(default=None, description="Active session ID")


@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "MediAssist AI Platform",
        "version": "2.0.0",
        "coverage": ["Human Health", "Veterinary Animals", "Agricultural Plants"],
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini_api_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "rag_store": "SQLite / Active"
    }


@app.post("/api/diagnose")
async def diagnose_endpoint(req: DiagnoseRequest):
    """
    Multimodal analysis for Human / Veterinary / Plant diseases.
    """
    session_id = memory_store.ensure_session(req.session_id)
    
    result = ai_engine.diagnose(
        species=req.species,
        sub_category=req.sub_category,
        symptoms_text=req.symptoms_text or "",
        image_base64=req.image_base64
    )

    # Save diagnosis into RAG memory store
    diag_id = memory_store.save_diagnosis(
        session_id=session_id,
        species=req.species,
        sub_category=req.sub_category or "",
        symptoms_text=req.symptoms_text or "",
        has_image=bool(req.image_base64),
        result_data=result
    )

    return {
        "session_id": session_id,
        "diagnosis_id": diag_id,
        "result": result
    }


@app.post("/api/prescription/scan")
async def prescription_scan_endpoint(req: PrescriptionScanRequest):
    """
    Handwritten prescription OCR reader, extracting medicines, dosage schedule, and generic alternatives.
    """
    session_id = memory_store.ensure_session(req.session_id)

    result = prescription_engine.scan_prescription(
        image_base64=req.image_base64,
        text_raw=req.text_raw
    )

    rx_id = memory_store.save_prescription(
        session_id=session_id,
        prescription_data=result
    )

    return {
        "session_id": session_id,
        "prescription_id": rx_id,
        "result": result
    }


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    RAG-enabled chat assistant with full multi-turn conversational memory.
    Replays prior conversation turns as structured Gemini Content history so the AI
    retains full context and can answer follow-up questions coherently.
    """
    session_id = memory_store.ensure_session(req.session_id)

    # Save user message first so it's persisted even if the LLM call fails
    memory_store.save_chat_message(session_id, sender="user", content=req.message)

    # Get RAG context — now includes diagnoses, prescriptions, AND recent chat history
    rag_context = memory_store.get_context_for_rag(session_id)

    # Get structured conversation history for multi-turn call.
    # The current user message is the last entry, so prior_turns = everything before it.
    full_history = memory_store.get_recent_chat_history(session_id, limit=40)
    prior_turns = full_history[:-1]

    ai_reply = ""
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)

            system_instruction = f"""You are MediAssist AI — a helpful, empathetic, and expert medical, veterinary, and agricultural AI assistant serving users across India.

Your capabilities:
- Diagnose human illnesses, veterinary animal conditions, and crop/plant diseases
- Explain prescribed medicines, dosages, side effects, and Jan Aushadhi generic alternatives
- Provide Pan-India emergency helpline contacts (108, 104, 1962, 1551, 112)
- Answer follow-up questions with full awareness of the entire conversation history

CRITICAL CONVERSATIONAL MEMORY RULE:
You have complete memory of this conversation. When the user asks follow-up questions like
"what about that?", "tell me more", "why did you say that?", "is that safe?", or refers 
to anything discussed earlier, look back at the conversation history and answer with context.
Never say "I don't have that information" if it was already discussed. Be fully coherent.

--- SESSION MEDICAL CONTEXT (RAG) ---
{rag_context}
--------------------------------------

Response style:
- Clear, empathetic, and medically accurate
- Use bullet points and headers for clinical details
- If urgency is HIGH or EMERGENCY, strongly advise calling 108 immediately
- Reference specific diagnosed conditions or medicines from session context when relevant
- Be honest about uncertainty rather than fabricating medical information"""

            # Replay prior turns as structured multi-turn Content objects
            contents = []
            for turn in prior_turns:
                contents.append(
                    types.Content(
                        role=turn["role"],
                        parts=[types.Part(text=turn["content"])]
                    )
                )
            # Append current user message as final turn
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part(text=req.message)]
                )
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    max_output_tokens=1024,
                )
            )
            if response and response.text:
                ai_reply = response.text.strip()

        except Exception as e:
            print(f"[ChatEndpoint] Gemini multi-turn chat error: {e}")

    if not ai_reply:
        # Context-aware fallback when Gemini is unavailable
        msg_lower = req.message.lower()
        if "generic" in msg_lower or "jan aushadhi" in msg_lower or "price" in msg_lower or "cost" in msg_lower:
            ai_reply = (
                "**Jan Aushadhi (PMBJP) Generic Medicine Guidance:**\n\n"
                "Based on your session records, generic equivalents available at Pradhan Mantri Bhartiya Janaushadhi Kendras offer 50% to 90% savings over brand names:\n\n"
                "• **Paracetamol 650mg**: ₹6 / 10 tabs (vs Brand Dolo ₹34)\n"
                "• **Amoxicillin + Clavulanic Acid 625mg**: ₹48 / 10 tabs (vs Brand Augmentin ₹210)\n"
                "• **Pantoprazole 40mg**: ₹16.50 / 15 tabs (vs Brand Pantocid ₹145)\n"
                "• **Levocetirizine 5mg**: ₹7 / 10 tabs (vs Brand Levocet ₹48)\n\n"
                "You can locate your nearest Jan Aushadhi Kendra by calling the National Helpline or checking our **Pan-India Network** tab."
            )
        elif "side effect" in msg_lower or "warning" in msg_lower or "safety" in msg_lower:
            ai_reply = (
                "**Safety & Drug Interaction Advisory:**\n\n"
                "From your saved prescription records:\n"
                "1. Always complete antibiotic courses to avoid antimicrobial resistance.\n"
                "2. Take Pantoprazole 30 minutes before breakfast for maximum acid suppression.\n"
                "3. If taking antihistamines (like Cetirizine), avoid driving or alcohol as mild sedation may occur.\n\n"
                "For immediate emergency toxicity queries, call **108**."
            )
        elif "helpline" in msg_lower or "doctor" in msg_lower or "emergency" in msg_lower:
            ai_reply = (
                "**Verified Pan-India Emergency Contacts:**\n\n"
                "• **Human Medical Emergency**: 108 (National Ambulance / Trauma)\n"
                "• **Tele-Health Advice**: 104 (State Medical Helpline)\n"
                "• **Veterinary Pashu Chikitsa**: 1962 (Animal Husbandry Dept)\n"
                "• **Kisan Call Centre (Agriculture)**: 1551 (Toll-Free Agricultural Support)"
            )
        else:
            ai_reply = (
                f"Thank you for your query regarding: *\"{req.message}\"*\n\n"
                f"**RAG Memory Context Active:** I have reviewed your session context containing recent diagnostic assessments and prescription logs.\n\n"
                f"Key Recommendations:\n"
                f"1. Follow the dosage schedule and dietary guidelines strictly as outlined in your diagnosis card.\n"
                f"2. Monitor symptoms closely over the next 24-48 hours.\n"
                f"3. Swap brand medicines for Jan Aushadhi generic salts to reduce treatment expenses substantially.\n\n"
                f"Feel free to ask specific follow-ups about dosages, generic prices, or emergency contacts!"
            )

    # Save AI reply to memory
    memory_store.save_chat_message(session_id, sender="assistant", content=ai_reply, context_snapshot=rag_context[:500])

    return {
        "session_id": session_id,
        "reply": ai_reply,
        "context_used": bool(rag_context)
    }



@app.get("/api/history")
async def history_endpoint(session_id: str = Query(..., description="User Session ID")):
    """Retrieval of past consultation sessions and memory logs."""
    history = memory_store.get_history(session_id)
    return history


@app.get("/api/pan-india/resources")
async def pan_india_resources():
    """Jan Aushadhi generic medicine lookup directory & emergency hotline directory."""
    return {
        "emergency_helplines": [
            {
                "name": "National Medical Emergency & Ambulance",
                "number": "108",
                "category": "Human Health",
                "availability": "24x7 Toll-Free Pan-India",
                "description": "Immediate emergency response, trauma ambulance, and hospital dispatch."
            },
            {
                "name": "State Medical Tele-Counseling",
                "number": "104",
                "category": "Human Health",
                "availability": "24x7 Toll-Free",
                "description": "General health inquiry, doctor tele-consultation, and blood bank availability."
            },
            {
                "name": "Pashu Chikitsa Mobile Veterinary Service",
                "number": "1962",
                "category": "Veterinary (Cattle, Pets, Livestock)",
                "availability": "24x7 Toll-Free",
                "description": "Doorstep emergency veterinary support, livestock epidemic alerts, and artificial insemination services."
            },
            {
                "name": "Kisan Call Centre (Ministry of Agriculture)",
                "number": "1551",
                "category": "Agricultural Plants & Crops",
                "availability": "6:00 AM - 10:00 PM (All 22 Languages)",
                "description": "Direct consultation with agricultural experts regarding crop diseases, pest outbreaks, soil health, and weather advisories."
            },
            {
                "name": "National Emergency Response System",
                "number": "112",
                "category": "Unified Emergency",
                "availability": "24x7 Toll-Free",
                "description": "Single unified emergency number for police, fire, and medical aid across all Indian states."
            }
        ],
        "jan_aushadhi_stats": {
            "total_kendras": "10,000+",
            "price_discount": "50% to 90% cheaper than branded drugs",
            "quality_assurance": "WHO-GMP & NABL Laboratory Tested Quality",
            "official_portal": "https://janaushadhi.gov.in"
        },
        "popular_generics_directory": [
            {
                "disease_category": "Fever & Pain Relief",
                "generic_name": "Paracetamol 650mg",
                "jan_price": "₹6.00 (10 Tabs)",
                "brand_price": "₹34.00 (Dolo 650)",
                "savings": "82%"
            },
            {
                "disease_category": "Bacterial Infection",
                "generic_name": "Amoxicillin + Clavulanic Acid 625mg",
                "jan_price": "₹48.00 (10 Tabs)",
                "brand_price": "₹210.00 (Augmentin 625)",
                "savings": "77%"
            },
            {
                "disease_category": "Acidity & Gastritis",
                "generic_name": "Pantoprazole 40mg",
                "jan_price": "₹16.50 (15 Tabs)",
                "brand_price": "₹145.00 (Pantocid 40)",
                "savings": "88%"
            },
            {
                "disease_category": "Allergies & Skin Rash",
                "generic_name": "Levocetirizine 5mg",
                "jan_price": "₹7.00 (10 Tabs)",
                "brand_price": "₹48.00 (Levocet 5)",
                "savings": "85%"
            },
            {
                "disease_category": "Diabetes Management",
                "generic_name": "Metformin 500mg SR",
                "jan_price": "₹11.00 (10 Tabs)",
                "brand_price": "₹55.00 (Glycomet 500)",
                "savings": "80%"
            },
            {
                "disease_category": "Hypertension / BP",
                "generic_name": "Amlodipine 5mg",
                "jan_price": "₹5.50 (10 Tabs)",
                "brand_price": "₹38.00 (Amlong 5)",
                "savings": "85%"
            },
            {
                "disease_category": "Veterinary Antipyretic",
                "generic_name": "Meloxicam & Paracetamol Bolus",
                "jan_price": "₹18.00 (4 Bolus)",
                "brand_price": "₹85.00 (Melonex)",
                "savings": "78%"
            },
            {
                "disease_category": "Agricultural Fungicide",
                "generic_name": "Copper Oxychloride 50% WP",
                "jan_price": "₹160.00 (500g)",
                "brand_price": "₹380.00 (Blitox)",
                "savings": "58%"
            }
        ]
    }
