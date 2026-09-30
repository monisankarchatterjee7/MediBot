import React, { useState } from 'react';
import { 
  Stethoscope, 
  Dog, 
  Sprout, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Pill, 
  PhoneCall, 
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';

// Pre-built base64 sample thumbnails for instant visual testing
const SAMPLE_IMAGES = {
  human: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f1f5f9'/><circle cx='200' cy='150' r='80' fill='%23ef4444' opacity='0.25'/><circle cx='200' cy='150' r='50' fill='%23f87171' opacity='0.45'/><text x='200' y='150' font-family='sans-serif' font-size='16' fill='%230f172a' font-weight='bold' text-anchor='middle'>[Sample: Erythematous Skin Rash]</text></svg>",
  veterinary: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f1f5f9'/><rect x='100' y='80' width='200' height='140' rx='20' fill='%23f59e0b' opacity='0.25'/><circle cx='150' cy='120' r='20' fill='%23d97706'/><circle cx='220' cy='160' r='25' fill='%23d97706'/><text x='200' y='260' font-family='sans-serif' font-size='15' fill='%230f172a' font-weight='bold' text-anchor='middle'>[Sample: Cattle Cutaneous Nodules (LSD)]</text></svg>",
  plant: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f1f5f9'/><path d='M200 50 Q300 150 200 250 Q100 150 200 50 Z' fill='%2310b981' opacity='0.35'/><circle cx='200' cy='130' r='30' fill='%23854d0e'/><circle cx='180' cy='170' r='20' fill='%23854d0e'/><text x='200' y='270' font-family='sans-serif' font-size='15' fill='%230f172a' font-weight='bold' text-anchor='middle'>[Sample: Tomato Early Blight Rings]</text></svg>"
};

export default function DiagnosticHub({ sessionId, onDiagnosisComplete }) {
  const [species, setSpecies] = useState('human'); // human, veterinary, plant
  const [subCategory, setSubCategory] = useState('cattle');
  const [symptomsText, setSymptomsText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSample = (sampleType) => {
    setImagePreview(SAMPLE_IMAGES[sampleType]);
    if (sampleType === 'human') {
      setSpecies('human');
      setSymptomsText('Red itchy skin rash with burning sensation and small bumps over arms for 2 days.');
    } else if (sampleType === 'veterinary') {
      setSpecies('veterinary');
      setSubCategory('cattle');
      setSymptomsText('Cattle cow exhibiting high fever 104°F, firm skin nodules, reduced milk yield and leg edema.');
    } else if (sampleType === 'plant') {
      setSpecies('plant');
      setSubCategory('tomato');
      setSymptomsText('Tomato leaves showing dark brown concentric target-like ring spots with yellow chlorotic border.');
    }
  };

  const runDiagnosis = async () => {
    if (!symptomsText && !imagePreview) {
      setErrorMsg('Please enter symptom details or upload an image.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species,
          sub_category: species !== 'human' ? subCategory : '',
          symptoms_text: symptomsText,
          image_base64: imagePreview,
          session_id: sessionId
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setDiagnosisResult(data.result);
      if (onDiagnosisComplete) {
        onDiagnosisComplete(data);
      }
    } catch (err) {
      console.error('Diagnosis request error:', err);
      setErrorMsg('Failed to connect to backend server. Make sure FastAPI server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Input Panel */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
              <Sparkles className="gradient-text" style={{ width: '24px', height: '24px' }} />
              Multimodal AI Diagnostic Hub
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', fontWeight: '500' }}>
              Select target domain, upload image or enter text symptoms for instant clinical AI analysis.
            </p>
          </div>

          {/* Domain Species Selector Tabs with Plant Green Hover */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => { setSpecies('human'); setSubCategory(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: species === 'human' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: species === 'human' ? '#ffffff' : '#475569', fontWeight: species === 'human' ? '700' : '600',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Stethoscope size={18} /> Human Health
            </button>
            <button
              onClick={() => { setSpecies('veterinary'); setSubCategory('cattle'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: species === 'veterinary' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: species === 'veterinary' ? '#ffffff' : '#475569', fontWeight: species === 'veterinary' ? '700' : '600',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Dog size={18} /> Veterinary
            </button>
            <button
              onClick={() => { setSpecies('plant'); setSubCategory('crops'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: species === 'plant' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: species === 'plant' ? '#ffffff' : '#475569', fontWeight: species === 'plant' ? '700' : '600',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Sprout size={18} /> Plant Care
            </button>
          </div>
        </div>

        {/* Sub Category Selection for Veterinary / Plant */}
        {species === 'veterinary' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Animal Type:</span>
            {['cattle', 'pet', 'birds'].map((type) => (
              <button
                key={type}
                onClick={() => setSubCategory(type)}
                className="btn-secondary"
                style={{
                  padding: '4px 12px', fontSize: '0.8rem', textTransform: 'capitalize',
                  borderColor: subCategory === type ? '#10b981' : '#e2e8f0',
                  background: subCategory === type ? '#ecfdf5' : '#ffffff',
                  color: subCategory === type ? '#059669' : '#475569',
                  fontWeight: '700'
                }}
              >
                {type === 'cattle' ? '🐄 Cattle / Livestock' : type === 'pet' ? '🐕 Dog / Cat Pet' : '🦜 Avian / Poultry'}
              </button>
            ))}
          </div>
        )}

        {species === 'plant' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Crop Type:</span>
            {['tomato', 'rice', 'wheat', 'cotton'].map((crop) => (
              <button
                key={crop}
                onClick={() => setSubCategory(crop)}
                className="btn-secondary"
                style={{
                  padding: '4px 12px', fontSize: '0.8rem', textTransform: 'capitalize',
                  borderColor: subCategory === crop ? '#10b981' : '#e2e8f0',
                  background: subCategory === crop ? '#ecfdf5' : '#ffffff',
                  color: subCategory === crop ? '#059669' : '#475569',
                  fontWeight: '700'
                }}
              >
                🌾 {crop}
              </button>
            ))}
          </div>
        )}

        {/* Image & Text Input Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Image Upload Box */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              Visual Image Input (Lesion / Leaf / Symptom)
            </label>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
                background: '#f8fafc',
                position: 'relative',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              {imagePreview ? (
                <div style={{ position: 'relative', width: '100%', height: '140px' }}>
                  <img
                    src={imagePreview}
                    alt="Symptom Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    style={{
                      position: 'absolute', top: '4px', right: '4px', background: '#ef4444',
                      border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px',
                      cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} style={{ color: '#10b981', marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                    Drag & Drop symptom image or browse
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </>
              )}
            </div>

            {/* Instant Demo Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Try Instant Sample:</span>
              <button onClick={() => loadSample('human')} className="btn-sample">Human Rash</button>
              <button onClick={() => loadSample('veterinary')} className="btn-sample">Cattle LSD</button>
              <button onClick={() => loadSample('plant')} className="btn-sample">Tomato Blight</button>
            </div>
          </div>

          {/* Text Description Box */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              Describe Symptoms & Duration
            </label>
            <textarea
              className="input-glass"
              placeholder={
                species === 'human' ? "E.g., High fever 102°F with chills, body ache, and skin rashes on arms for 2 days..." :
                species === 'veterinary' ? "E.g., Cattle exhibiting fever, skin nodules over body, reduced milk yield..." :
                "E.g., Tomato plant leaves showing brown spots with concentric ring pattern..."
              }
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              style={{ flex: 1, minHeight: '140px' }}
            />
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={runDiagnosis}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '1rem' }}
          >
            {loading ? (
              <>
                <RefreshCw className="pulse-glow" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Running Multimodal AI Diagnostic Engine...
              </>
            ) : (
              <>
                <Sparkles size={20} /> Generate AI Diagnosis & Treatment Plan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diagnostic Output Card */}
      {diagnosisResult && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', background: '#ffffff', borderLeft: `6px solid ${
          diagnosisResult.urgency_level === 'CRITICAL' ? '#dc2626' :
          diagnosisResult.urgency_level === 'MODERATE' ? '#d97706' : '#10b981'
        }` }}>
          
          {/* Card Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span className={`badge ${
                  diagnosisResult.urgency_level === 'CRITICAL' ? 'badge-critical' :
                  diagnosisResult.urgency_level === 'MODERATE' ? 'badge-moderate' : 'badge-low'
                }`}>
                  <ShieldAlert size={14} /> {diagnosisResult.urgency_level} URGENCY
                </span>
                <span style={{ fontSize: '0.8rem', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '12px', color: '#059669', fontWeight: '700' }}>
                  {diagnosisResult.category}
                </span>
              </div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
                {diagnosisResult.condition_name}
              </h3>
            </div>

            <div style={{ textAlign: 'right', background: '#f0fdf4', padding: '10px 18px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: '700' }}>AI Confidence</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669' }}>
                {diagnosisResult.confidence_score}%
              </div>
            </div>
          </div>

          {/* Urgency Alert Note */}
          <div style={{
            background: diagnosisResult.urgency_level === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${diagnosisResult.urgency_level === 'CRITICAL' ? '#fecaca' : '#fde68a'}`,
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem', color: '#0f172a'
          }}>
            <strong>Urgency Note:</strong> {diagnosisResult.urgency_reason}
          </div>

          {/* Grid of Symptoms & Treatment */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            {/* Symptoms Observed */}
            <div className="glass-card">
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#059669', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Symptoms Observed
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diagnosisResult.symptoms_observed?.map((sym, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>•</span> {sym}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Treatment Plan */}
            <div className="glass-card">
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#15803d', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight size={18} /> Treatment & Action Plan
              </h4>
              <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diagnosisResult.treatment_plan?.map((step, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: '#334155' }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Jan Aushadhi (PMBJP) Generic Medicine Mappings */}
          {diagnosisResult.jan_aushadhi_generics && diagnosisResult.jan_aushadhi_generics.length > 0 && (
            <div className="glass-card" style={{ marginBottom: '20px', background: '#f0fdf4', borderColor: '#a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pill size={20} /> Jan Aushadhi Generic Medicine Alternatives (PMBJP)
                </h4>
                <span className="badge badge-low" style={{ textTransform: 'none' }}>Save up to 85% on Branded Meds</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', color: '#0f172a' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', background: '#ffffff' }}>
                      <th style={{ padding: '10px 8px' }}>Jan Aushadhi Generic Salt</th>
                      <th style={{ padding: '10px 8px' }}>Brand Equivalent</th>
                      <th style={{ padding: '10px 8px' }}>PMBJP Price</th>
                      <th style={{ padding: '10px 8px' }}>Brand Price</th>
                      <th style={{ padding: '10px 8px' }}>Dosage Guideline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosisResult.jan_aushadhi_generics.map((med, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '700', color: '#059669' }}>{med.generic_name}</td>
                        <td style={{ padding: '10px 8px', color: '#64748b' }}>{med.brand_equivalent}</td>
                        <td style={{ padding: '10px 8px', fontWeight: '800', color: '#15803d' }}>{med.jan_aushadhi_price}</td>
                        <td style={{ padding: '10px 8px', textDecoration: 'line-through', color: '#94a3b8' }}>{med.brand_price}</td>
                        <td style={{ padding: '10px 8px', fontSize: '0.82rem' }}>{med.dosage_guideline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Emergency Hotline Banner Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PhoneCall size={20} style={{ color: '#d97706' }} />
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Verified Pan-India Helpline</div>
                <div style={{ fontWeight: '800', color: '#b45309' }}>{diagnosisResult.recommended_helpline}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '400px', textAlign: 'right' }}>
              <Info size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {diagnosisResult.disclaimer}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
