import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  ShieldAlert,
  Calendar,
  Microscope,
  Info
} from 'lucide-react';

const SAMPLE_LAB_REPORT_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='450' height='260' viewBox='0 0 450 260'><rect width='450' height='260' fill='%23f8fafc' rx='10' stroke='%23cbd5e1'/><text x='30' y='40' font-family='sans-serif' font-size='18' fill='%23059669' font-weight='bold'>Metropolis Diagnostics - Patient Report</text><text x='30' y='75' font-family='sans-serif' font-size='14' fill='%230f172a'>1. Fasting Blood Sugar (FBS) ---- 142 mg/dL (Ref: 70-99)</text><text x='30' y='110' font-family='sans-serif' font-size='14' fill='%230f172a'>2. HbA1c ---- 7.2 % (Ref: &lt; 5.7)</text><text x='30' y='145' font-family='sans-serif' font-size='14' fill='%230f172a'>3. Total Cholesterol ---- 215 mg/dL (Ref: &lt; 200)</text><text x='30' y='180' font-family='sans-serif' font-size='14' fill='%230f172a'>4. Serum Creatinine ---- 0.9 mg/dL (Ref: 0.7-1.3)</text><text x='30' y='215' font-family='sans-serif' font-size='14' fill='%230f172a'>5. Hemoglobin ---- 14.5 g/dL (Ref: 13.8-17.2)</text></svg>";

export default function LabReportScanner({ sessionId, onScanComplete }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [textSnippet, setTextSnippet] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSampleLabReport = () => {
    setImagePreview(SAMPLE_LAB_REPORT_IMAGE);
    setTextSnippet("Metropolis Diagnostics Lab Report:\nFasting Blood Sugar: 142 mg/dL (Ref: 70-99)\nHbA1c: 7.2% (Ref: < 5.7%)\nTotal Cholesterol: 215 mg/dL (Ref: < 200)\nSerum Creatinine: 0.9 mg/dL (Ref: 0.7-1.3)\nHemoglobin: 14.5 g/dL (Ref: 13.8-17.2)");
  };

  const runScan = async () => {
    if (!imagePreview && !textSnippet) {
      setErrorMsg('Please upload a lab report image or enter text details.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/labreport/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imagePreview,
          text_raw: textSnippet,
          session_id: sessionId
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setScanResult(data.result);
      if (onScanComplete) {
        onScanComplete(data);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMsg('Failed to process lab report. Ensure FastAPI backend is active on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'high':
        return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', label: 'HIGH' };
      case 'low':
        return { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', label: 'LOW' };
      case 'critical':
        return { background: '#7f1d1d', color: '#ffffff', border: '1px solid #991b1b', label: 'CRITICAL' };
      default:
        return { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', label: 'NORMAL' };
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Upload & Controller Panel */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <Microscope className="gradient-text" size={26} />
            Diagnostic Lab Report OCR & Biomarker Analyzer
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px', fontWeight: '500' }}>
            Upload digital or printed diagnostic lab reports to extract biomarkers, flag abnormal parameters, receive clinical insights, and lifestyle guidance.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Upload Area */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              Lab Report Document / Photo Upload
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
                    alt="Lab Report Preview"
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
                    Upload lab report scan (CBC, LFT, KFT, Lipid Profile, etc.)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </>
              )}
            </div>

            <div style={{ marginTop: '10px' }}>
              <button onClick={loadSampleLabReport} className="btn-sample">
                📄 Load Sample Lab Report
              </button>
            </div>
          </div>

          {/* Text input / OCR backup */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              Raw Lab Test Results or Notes (Optional)
            </label>
            <textarea
              className="input-glass"
              placeholder="Paste raw test parameters and values if the uploaded document image is low-resolution..."
              value={textSnippet}
              onChange={(e) => setTextSnippet(e.target.value)}
              style={{ flex: 1, minHeight: '140px' }}
            />
          </div>

        </div>

        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.88rem' }}>
            <AlertTriangle size={18} style={{ display: 'inline', marginRight: '6px' }} /> {errorMsg}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={runScan}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '12px 28px' }}
          >
            {loading ? (
              <>
                <RefreshCw className="pulse-glow" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Analyzing Biomarkers & Parameters...
              </>
            ) : (
              <>
                <Sparkles size={20} /> Perform OCR & Diagnostic Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Extracted Lab Report Results Card */}
      {scanResult && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-low" style={{ marginBottom: '6px' }}>
                <CheckCircle size={14} /> OCR CONFIDENCE: {scanResult.confidence_score}%
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                Extracted Biomarkers & Test Interpretations
              </h3>
            </div>

            {scanResult.abnormalities_count > 0 ? (
              <div style={{ background: '#fef2f2', padding: '8px 16px', borderRadius: '12px', border: '1px solid #fecaca', color: '#dc2626', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> {scanResult.abnormalities_count} Abnormal Biomarkers Detected
              </div>
            ) : (
              <div style={{ background: '#ecfdf5', padding: '8px 16px', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#059669', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={18} /> All Parameters Within Normal Ranges
              </div>
            )}
          </div>

          {/* Test Biomarkers Detailed Table */}
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', color: '#0f172a' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px' }}>Biomarker / Test Name</th>
                  <th style={{ padding: '12px 10px' }}>Observed Result</th>
                  <th style={{ padding: '12px 10px' }}>Reference Range</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px' }}>Clinical Context</th>
                  <th style={{ padding: '12px 10px' }}>Potential Health Impact</th>
                </tr>
              </thead>
              <tbody>
                {scanResult.tests?.map((test, idx) => {
                  const badgeStyle = getStatusBadge(test.status);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: '#0f172a' }}>
                        {test.name}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: test.status?.toLowerCase() !== 'normal' ? '#dc2626' : '#059669' }}>
                        {test.value} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>{test.unit}</span>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#64748b' }}>{test.reference_range}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ background: badgeStyle.background, border: badgeStyle.border, color: badgeStyle.color, padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem' }}>
                          {badgeStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.85rem' }}>{test.context}</td>
                      <td style={{ padding: '12px 10px', fontSize: '0.85rem', color: '#334155' }}>
                        {test.health_impact}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recommendations & Clinical Alerts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Dietary & Lifestyle Modifications */}
            <div className="glass-card">
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#059669', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} /> Recommended Lifestyle & Dietary Interventions
              </h4>
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scanResult.lifestyle_recommendations?.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.86rem', color: '#334155' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up & Critical Warnings */}
            <div className="glass-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#dc2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> Follow-up Action Items & Clinical Red Flags
              </h4>
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scanResult.followup_actions?.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.86rem', color: '#b91c1c' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}