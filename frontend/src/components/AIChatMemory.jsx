import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Database, 
  Brain, 
  Sparkles, 
  RefreshCw, 
  History, 
  CheckCircle2, 
  Pill, 
  User, 
  Bot,
  ChevronRight
} from 'lucide-react';

export default function AIChatMemory({ sessionId, lastActivityTimestamp }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      content: 'Hello! I am your **MediAssist AI Assistant**. I have access to your session\'s RAG memory containing your diagnostic reports and scanned prescriptions. How can I help you today?'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [ragHistory, setRagHistory] = useState({ diagnoses: [], prescriptions: [] });
  const [showDrawer, setShowDrawer] = useState(true);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load prior conversation history from backend on mount / session change
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const res = await fetch(`/api/history?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          const chatMsgs = (data.chat_messages || []).map((m) => ({
            id: m.id,
            sender: m.sender === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }));
          if (chatMsgs.length > 0) {
            setMessages([
              {
                id: 'welcome',
                sender: 'assistant',
                content: 'Hello! I am your **MediAssist AI Assistant**. I have access to your session\'s RAG memory containing your diagnostic reports and scanned prescriptions. How can I help you today?'
              },
              ...chatMsgs
            ]);
          }
          setRagHistory({
            diagnoses: data.diagnoses || [],
            prescriptions: data.prescriptions || []
          });
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadChatHistory();
  }, [sessionId]);

  // Refresh RAG context drawer whenever activity changes
  useEffect(() => {
    fetchHistory();
  }, [lastActivityTimestamp]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/history?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setRagHistory({
          diagnoses: data.diagnoses || [],
          prescriptions: data.prescriptions || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  // Simple markdown renderer: bold (**text**) and bullet points (• or - )
  const renderMarkdown = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Bold: **text**
        const boldLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        const isBullet = /^[•\-\*]\s/.test(line.trim());
        return (
          <div
            key={i}
            style={{ marginBottom: isBullet ? '4px' : '2px', paddingLeft: isBullet ? '8px' : '0' }}
            dangerouslySetInnerHTML={{ __html: boldLine }}
          />
        );
      });
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputMsg;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            content: data.reply
          }
        ]);
        // Refresh context drawer
        fetchHistory();
      } else {
        throw new Error('Chat API error');
      }
    } catch (err) {
      console.error('Chat request error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: '⚠️ Unable to connect to AI server. Please verify backend FastAPI is running.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showDrawer ? '1fr 340px' : '1fr', gap: '20px', minHeight: '650px' }}>
      
      {/* Main Chat Interface */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '650px', padding: '20px', background: '#ffffff' }}>
        
        {/* Chat Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Bot size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Conversational AI Memory Assistant</h3>
              <div style={{ fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                RAG Session Memory Active
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <Database size={14} /> {showDrawer ? 'Hide Context' : 'Show RAG Memory Drawer'}
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0', overflowX: 'auto' }}>
          {[
            'What Jan Aushadhi generic savings apply to me?',
            'What safety warnings should I watch for?',
            'What dietary advice matches my diagnosis?',
            'List emergency helpline numbers'
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="btn-sample"
              style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', padding: '5px 12px' }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Log */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              {msg.sender === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
              )}

                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '14px 18px',
                      borderRadius: '16px',
                      background: msg.sender === 'user'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : '#f8fafc',
                      border: msg.sender === 'user'
                        ? 'none'
                        : '1px solid #e2e8f0',
                      color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                      fontSize: '0.92rem',
                      lineHeight: '1.6',
                      boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'
                    }}
                  >
                    {msg.sender === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>

              {msg.sender === 'user' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0f2fe', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                  <User size={18} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', fontSize: '0.88rem', paddingLeft: '42px', fontWeight: '600' }}>
              <RefreshCw className="pulse-glow" size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Consulting session memory store & reasoning engine...
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-glass"
            placeholder="Ask follow-up questions about your diagnosis or prescription..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ borderRadius: '24px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputMsg.trim()}
            className="btn-primary"
            style={{ borderRadius: '50%', width: '46px', height: '46px', padding: 0, justifyContent: 'center', flexShrink: 0 }}
          >
            <Send size={18} />
          </button>
        </div>

      </div>

      {/* RAG Memory Active Context Drawer */}
      {showDrawer && (
        <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '650px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <Brain size={20} className="gradient-text" />
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Active RAG Memory Context</h3>
          </div>

          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
            The AI automatically indexes these past records from your active session to tailor its answers:
          </p>

          {/* Diagnoses Memory */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#059669', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} /> Saved Diagnostic Reports ({ragHistory.diagnoses.length})
            </div>

            {ragHistory.diagnoses.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                No diagnoses recorded yet in this session.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ragHistory.diagnoses.map((d, i) => (
                  <div key={i} className="glass-card" style={{ padding: '10px 12px', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.diagnosis_json?.condition_name || 'Condition'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Species: {d.species} | Urgency: {d.diagnosis_json?.urgency_level}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prescriptions Memory */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#15803d', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Pill size={14} /> Scanned Prescriptions ({ragHistory.prescriptions.length})
            </div>

            {ragHistory.prescriptions.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                No prescriptions scanned yet in this session.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ragHistory.prescriptions.map((p, i) => (
                  <div key={i} className="glass-card" style={{ padding: '10px 12px', fontSize: '0.82rem', borderColor: '#a7f3d0' }}>
                    <div style={{ fontWeight: '700', color: '#059669' }}>Prescription Record #{i+1}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {p.prescription_json?.medicines?.length || 0} Medicines Detected
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
