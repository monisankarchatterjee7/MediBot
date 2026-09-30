import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Pill, 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  RefreshCw, 
  ShieldAlert,
  Calendar,
  Clock
} from 'lucide-react';

const SAMPLE_RX_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='450' height='260' viewBox='0 0 450 260'><rect width='450' height='260' fill='%23f8fafc' rx='10' stroke='%23cbd5e1'/><text x='30' y='40' font-family='cursive, sans-serif' font-size='20' fill='%23059669' font-weight='bold'>Dr. R. K. Sharma (MD Internal Med)</text><text x='30' y='75' font-family='cursive' font-size='17' fill='%2310b981'>Rx</text><text x='60' y='105' font-family='cursive' font-size='16' fill='%230f172a'>1. Tab. Amoxyclav 625 ---- 1-0-1 (5 days)</text><text x='60' y='140' font-family='cursive' font-size='16' fill='%230f172a'>2. Tab. Dolo 650 ---- 1-1-1 (TDS sos)</text><text x='60' y='175' font-family='cursive' font-size='16' fill='%230f172a'>3. Cap. Pantocid 40 ---- 1-0-0 (B.F.)</text><text x='60' y='210' font-family='cursive' font-size='16' fill='%230f172a'>4. Tab. Cetzine 10mg ---- 0-0-1 (H.S.)</text></svg>";

export default function PrescriptionScanner({ sessionId, onScanComplete }) {
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

  const loadSamplePrescription = () => {
    setImagePreview(SAMPLE_RX_IMAGE);
    setTextSnippet("Rx: Tab. Amoxyclav 625 (1-0-1 x 5 days), Tab. Dolo 650 (1-1-1), Cap. Pantocid 40 (1-0-0 B.F.), Tab. Cetzine 10 (0-0-1 H.S.)");
  };

  const runScan = async () => {
    if (!imagePreview && !textSnippet) {
      setErrorMsg('Please upload a prescription image or enter text details.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/prescription/scan', {
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
      setErrorMsg('Failed to process prescription. Ensure FastAPI backend is active on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Upload & Controller Panel */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <FileText className="gradient-text" size={26} />
            Handwritten Prescription OCR Reader & Dosage Parser
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px', fontWeight: '500' }}>
            Scan low-clarity handwritten prescriptions to extract dosages, schedules, safety alerts, and cheaper Jan Aushadhi generic salts.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Upload Area */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              Prescription Document / Photo Upload
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
                    alt="Prescription Preview"
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
                    Upload Rx photo or handwritten doctor slip
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
              <button onClick={loadSamplePrescription} className="btn-sample">
                📄 Load Sample Handwritten Rx
              </button>
            </div>
          </div>

          {/* Text input / OCR backup */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              Raw Rx Text or Doctor Notes (Optional)
            </label>
            <textarea
              className="input-glass"
              placeholder="Paste raw prescription text or notes if photo is partially illegible..."
              value={textSnippet}
              onChange={(e) => setTextSnippet(e.target.value)}
              style={{ flex: 1, minHeight: '140px' }}
            />
          </div>

        </div>

        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.88rem' }}>
            <AlertCircle size={18} style={{ display: 'inline', marginRight: '6px' }} /> {errorMsg}
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
                Extracting Medicines & Generic Mappings...
              </>
            ) : (
              <>
                <Sparkles size={20} /> Perform OCR & Prescription Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Extracted Prescription Results Card */}
      {scanResult && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-low" style={{ marginBottom: '6px' }}>
                <CheckCircle size={14} /> OCR CONFIDENCE: {scanResult.confidence_score}%
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                Extracted Prescribed Medicines & Dosage Schedule
              </h3>
            </div>

            <div style={{ background: '#ecfdf5', padding: '8px 16px', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#059669', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={18} /> Substantial Jan Aushadhi Savings Detected
            </div>
          </div>

          {/* Medicines Detailed Table */}
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', color: '#0f172a' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px' }}>Detected Medicine Name</th>
                  <th style={{ padding: '12px 10px' }}>Strength</th>
                  <th style={{ padding: '12px 10px' }}>Dosage Schedule</th>
                  <th style={{ padding: '12px 10px' }}>Timing & Duration</th>
                  <th style={{ padding: '12px 10px' }}>Clinical Purpose</th>
                  <th style={{ padding: '12px 10px' }}>Jan Aushadhi Generic Salt</th>
                  <th style={{ padding: '12px 10px' }}>PMBJP Price vs Brand</th>
                </tr>
              </thead>
              <tbody>
                {scanResult.medicines?.map((med, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#059669' }}>
                      {med.name}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#64748b' }}>{med.strength}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '6px', color: '#059669', fontWeight: '700' }}>
                        {med.dosage_schedule}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: '0.82rem' }}>
                      <div><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />{med.timing}</div>
                      <div style={{ color: '#64748b' }}><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />{med.duration}</div>
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: '0.85rem' }}>{med.purpose}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#15803d' }}>
                      {med.jan_aushadhi_generic}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: '800', color: '#059669' }}>{med.jan_aushadhi_price_est}</div>
                      <div style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: '#94a3b8' }}>{med.brand_price_est}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dietary & Safety Warnings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Dietary Instructions */}
            <div className="glass-card">
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#059669', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={18} /> Dietary & Lifestyle Instructions
              </h4>
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scanResult.dietary_instructions?.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.86rem', color: '#334155' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Safety & Warning Alerts */}
            <div className="glass-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#dc2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> Crucial Safety Warnings & Drug Alerts
              </h4>
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scanResult.safety_warnings?.map((item, idx) => (
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
