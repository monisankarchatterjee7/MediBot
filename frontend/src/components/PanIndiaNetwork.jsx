import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Search, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  TrendingDown, 
  ExternalLink, 
  HeartHandshake,
  AlertCircle
} from 'lucide-react';

export default function PanIndiaNetwork() {
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/pan-india/resources');
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (err) {
      console.error('Failed to load Pan-India resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGenerics = resources?.popular_generics_directory?.filter(item =>
    item.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.disease_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand_price.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)', border: '1px solid #a7f3d0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-low" style={{ marginBottom: '8px' }}>
              <ShieldCheck size={14} /> Official Pan-India Government Integrations
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
              Pan-India Emergency Helplines & Jan Aushadhi (PMBJP) Network
            </h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '4px', fontWeight: '500' }}>
              Toll-free emergency numbers for Human, Veterinary & Agriculture plus affordable generic medicine price comparison.
            </p>
          </div>

          <a
            href="https://janaushadhi.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', textDecoration: 'none' }}
          >
            Find Nearest Jan Aushadhi Kendra <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Emergency Helplines Cards Grid */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PhoneCall size={20} /> Verified Toll-Free Emergency Lines
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {resources?.emergency_helplines?.map((line, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '18px', background: '#ffffff', borderLeft: `4px solid ${
              line.number === '108' ? '#dc2626' :
              line.number === '1962' ? '#d97706' :
              line.number === '1551' ? '#10b981' : '#0284c7'
            }` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  {line.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                  {line.availability}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <a
                  href={`tel:${line.number}`}
                  style={{
                    fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  📞 {line.number}
                </a>
              </div>

              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', marginBottom: '6px' }}>
                {line.name}
              </div>

              <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                {line.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Jan Aushadhi Generic Medicine Directory & Savings Tool */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={22} /> Jan Aushadhi (PMBJP) Generic Medicine Search
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>
              Compare generic salt prices vs expensive branded alternatives across India.
            </p>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input-glass"
              placeholder="Search generic medicine or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px', height: '40px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Directory Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredGenerics.map((item, idx) => (
            <div key={idx} className="glass-card" style={{ background: '#f0fdf4', borderColor: '#a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
                  {item.disease_category}
                </span>
                <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>
                  SAVE {item.savings}
                </span>
              </div>

              <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#059669', marginBottom: '8px' }}>
                {item.generic_name}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>PMBJP Generic Price</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#15803d' }}>{item.jan_price}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Brand Price</div>
                  <div style={{ fontSize: '1rem', textDecoration: 'line-through', color: '#94a3b8' }}>{item.brand_price}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
