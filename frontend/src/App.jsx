import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  FileText, 
  MessageSquare, 
  Globe, 
  Activity, 
  PhoneCall, 
  ShieldAlert, 
  Sparkles,
  Heart,
  ChevronRight,
  Database,
  Sprout
} from 'lucide-react';

import DiagnosticHub from './components/DiagnosticHub';
import PrescriptionScanner from './components/PrescriptionScanner';
import AIChatMemory from './components/AIChatMemory';
import PanIndiaNetwork from './components/PanIndiaNetwork';

// Supported Pan-India Languages
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'mr', label: 'मराठी (Marathi)' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('diagnose'); // diagnose, prescription, chat, network
  const [backendOnline, setBackendOnline] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(2, 9)}`);
  const [lastActivityTimestamp, setLastActivityTimestamp] = useState(Date.now());

  // Check FastAPI backend health on mount
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch (e) {
      setBackendOnline(false);
    }
  };

  const handleActivity = () => {
    setLastActivityTimestamp(Date.now());
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Emergency Alert Top Ticker */}
      <div style={{
        background: '#047857',
        color: '#ffffff',
        padding: '7px 20px',
        fontSize: '0.83rem',
        fontWeight: '600',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} className="pulse-glow" style={{ color: '#a7f3d0' }} />
          <span><strong>PAN-INDIA EMERGENCY ADVISORY:</strong> MediAssist is an AI Triage & Educational Tool.</span>
        </div>
        <div style={{ display: 'flex', gap: '18px', fontSize: '0.81rem' }}>
          <span>🚑 Medical: <strong>108</strong></span>
          <span>🐄 Pashu Chikitsa: <strong>1962</strong></span>
          <span>🌾 Kisan Call Centre: <strong>1551</strong></span>
        </div>
      </div>

      {/* 2. Main Top Navigation Header */}
      <header className="glass-panel" style={{
        margin: '16px 20px 0 20px',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#ffffff',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Logo Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            color: '#ffffff'
          }}>
            <Sprout size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: '#0f172a' }}>
              MediAssist <span className="gradient-text">AI</span>
            </h1>
            <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '500' }}>
              Pan-India Multimodal Diagnostic Platform
            </div>
          </div>
        </div>

        {/* Navigation Tabs with Plant Green Highlights */}
        <nav style={{ display: 'flex', background: '#f1f5f9', padding: '5px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {[
            { id: 'diagnose', label: 'Diagnostic Hub', icon: Stethoscope },
            { id: 'prescription', label: 'Prescription OCR', icon: FileText },
            { id: 'chat', label: 'AI Chat (RAG)', icon: MessageSquare },
            { id: 'network', label: 'Pan-India Network', icon: Globe }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#e6f4ea';
                    e.currentTarget.style.color = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Backend Status & Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          
          {/* Backend Status Indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem',
            padding: '6px 12px', borderRadius: '20px', background: backendOnline ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${backendOnline ? '#a7f3d0' : '#fecaca'}`
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: backendOnline ? '#10b981' : '#ef4444',
              boxShadow: backendOnline ? '0 0 6px #10b981' : 'none'
            }}></span>
            <span style={{ color: backendOnline ? '#047857' : '#b91c1c', fontWeight: '700' }}>
              {backendOnline ? 'Backend Online (8000)' : 'Connecting Backend...'}
            </span>
          </div>

          {/* Language Selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} style={{ color: '#10b981' }} />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </header>

      {/* 3. Main View Container */}
      <main style={{ flex: 1, padding: '20px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'diagnose' && (
          <DiagnosticHub sessionId={sessionId} onDiagnosisComplete={handleActivity} />
        )}
        {activeTab === 'prescription' && (
          <PrescriptionScanner sessionId={sessionId} onScanComplete={handleActivity} />
        )}
        {activeTab === 'chat' && (
          <AIChatMemory sessionId={sessionId} lastActivityTimestamp={lastActivityTimestamp} />
        )}
        {activeTab === 'network' && (
          <PanIndiaNetwork />
        )}
      </main>

      {/* 4. Footer */}
      <footer style={{
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: '#64748b',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff'
      }}>
        MediAssist AI Platform • Designed for Pan-India Application (Human, Veterinary & Agricultural Health) • Minimalist Plant-Green Edition
      </footer>

    </div>
  );
}
