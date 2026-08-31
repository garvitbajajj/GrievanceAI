import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useGrievanceFlow } from '../context/GrievanceFlowContext';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import jsPDF from 'jspdf';
import PopupModal from '../components/PopupModal';
import './AIAnalysis.css';

// Fix Leaflet's default icon path issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.4, 0, 0.2, 1] }
  }),
};

export default function AIAnalysis() {
  const { id }       = useParams();
  const location     = useLocation();
  const { exitFlow } = useGrievanceFlow();

  useEffect(() => { exitFlow(); }, [exitFlow]);

  const [data, setData]       = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError]     = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translated, setTranslated]     = useState(null);
  const [isNative, setIsNative]           = useState(false);

  useEffect(() => {
    if (location.state) return;
    const fetchData = async () => {
      try {
        const res = await api.get(`/api/grievance/${id}`);
        const { grievance, ai_analysis } = res.data;
        setData({
          english_summary:          ai_analysis?.english_summary || grievance.title || '',
          category:                 grievance.category || 'other',
          keywords:                 ai_analysis?.keywords || [],
          confidence_score:         ai_analysis?.confidence_score,
          detected_language:        ai_analysis?.detected_language || grievance.original_language || 'en-IN',
          portal_links:             grievance.portal_links || null,
          nearby_offices:           grievance.nearby_offices || [],
          procedure_steps:          grievance.procedure_steps || [],
          expected_resolution_days: grievance.expected_resolution_days || null,
        });
      } catch {
        setError('Could not load grievance analysis. Please try again from the dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, location.state]);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <motion.div
              style={{ width: 44, height: 44, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            />
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading AI analysis…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ padding: '32px', textAlign: 'center', maxWidth: 400 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'var(--error)', display: 'block', marginBottom: 16 }}>error</span>
            <p style={{ marginBottom: 24, color: 'var(--on-surface-variant)' }}>{error || 'Analysis data not available.'}</p>
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const {
    english_summary          = '',
    category                 = 'other',
    portal_links             = null,
    nearby_offices           = [],
    procedure_steps          = [],
    expected_resolution_days = null,
    confidence_score,
    detected_language        = 'en-IN',
  } = data;

  const displayData = isNative && translated ? {
    summary: translated.summary,
    category: translated.category,
    steps: translated.steps,
    offices: translated.offices,
  } : {
    summary: english_summary,
    category: category,
    steps: procedure_steps,
    offices: nearby_offices.map(o => o.name || o),
  };

  const fetchTranslation = async () => {
    if (translated) return translated;
    setIsTranslating(true);
    try {
      const res = await api.post(`/api/grievance/${id}/translate-analysis`, {
        target_lang: detected_language,
        summary: english_summary,
        category: category,
        steps: procedure_steps,
        offices: nearby_offices.map(o => o.name || o),
      });
      if (res.data?.success) {
        setTranslated(res.data.translated);
        setIsTranslating(false);
        return res.data.translated;
      }
    } catch (e) {
      console.error('Translation failed', e);
      setIsTranslating(false);
    }
    return null;
  };

  const handleToggleLanguage = async () => {
    if (isNative) {
      setIsNative(false);
    } else {
      await fetchTranslation();
      setIsNative(true);
    }
  };

  const handleDownloadSummary = async () => {
    setIsDownloading(true);
    try {
      // Fetch native translation if not already loaded
      let nativeData = translated;
      const isNonEnglish = detected_language !== 'en-IN' && detected_language !== 'en';
      if (isNonEnglish && !nativeData) {
        nativeData = await fetchTranslation();
      }

      const reportData = (isNonEnglish && nativeData) ? {
        summary: nativeData.summary || english_summary,
        category: nativeData.category || category,
        steps: nativeData.steps?.length ? nativeData.steps : procedure_steps,
        offices: nativeData.offices?.length ? nativeData.offices : nearby_offices.map(o => o.name || o),
      } : {
        summary: english_summary,
        category: category,
        steps: procedure_steps,
        offices: nearby_offices.map(o => o.name || o),
      };

      const refNo = id ? `GRV-${String(id).slice(-8).toUpperCase()}` : 'GRV-XXXXXXXX';
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const catDisplay = String(reportData.category || 'General').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // Build an off-screen HTML report the browser can render with proper Unicode fonts
      const pdfHtml = document.createElement('div');
      pdfHtml.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;color:#1a1a2e;font-family:"Noto Sans","Plus Jakarta Sans",Arial,sans-serif;padding:0;box-sizing:border-box;';

      const stepsHtml = reportData.steps?.length > 0
        ? `<div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:4px;height:20px;background:#1a237e;border-radius:2px;"></div>
              <div style="color:#1a237e;font-size:14px;font-weight:800;">${isNonEnglish && nativeData ? 'Next Steps / अगले कदम' : 'Next Steps'}</div>
            </div>
            <ol style="font-size:13px;line-height:1.8;color:#323246;padding-left:30px;margin:0;">
              ${reportData.steps.map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('')}
            </ol>
          </div>` : '';

      const officesHtml = reportData.offices?.length > 0
        ? `<div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:4px;height:20px;background:#1a237e;border-radius:2px;"></div>
              <div style="color:#1a237e;font-size:14px;font-weight:800;">${isNonEnglish && nativeData ? 'Nearby Offices / नजदीकी कार्यालय' : 'Nearby Offices'}</div>
            </div>
            <ul style="font-size:13px;line-height:1.8;color:#323246;padding-left:30px;margin:0;">
              ${reportData.offices.map(o => `<li>${String(o)}</li>`).join('')}
            </ul>
          </div>` : '';

      const portalsHtml = portalsArray.length > 0
        ? `<div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:4px;height:20px;background:#1a237e;border-radius:2px;"></div>
              <div style="color:#1a237e;font-size:14px;font-weight:800;">${isNonEnglish && nativeData ? 'Government Portals / सरकारी पोर्टल' : 'Relevant Government Portals'}</div>
            </div>
            ${portalsArray.map(p => `
              <div style="padding-left:12px;margin-bottom:8px;">
                <div style="font-weight:700;color:#1a237e;font-size:13px;">${p.name || 'Portal'}</div>
                ${p.url ? `<div style="font-size:11px;color:#646482;">${p.url}</div>` : ''}
              </div>
            `).join('')}
          </div>` : '';

      pdfHtml.innerHTML = `
        <div style="background:linear-gradient(135deg,#1a237e,#283593);padding:28px 36px;color:#fff;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;">BhashaFlow — Citizen Grievance Portal</div>
            <div style="font-size:11px;opacity:0.8;margin-top:4px;">Multilingual AI-Powered Grievance Management System | Student Initiative</div>
          </div>
          <div style="text-align:right;font-size:11px;opacity:0.85;">
            <div>Ref: ${refNo}</div>
            <div>Date: ${dateStr}</div>
          </div>
        </div>
        <div style="background:#f0f3ff;text-align:center;padding:14px;margin:24px 36px 0;border-radius:6px;">
          <div style="color:#1a237e;font-size:14px;font-weight:800;letter-spacing:0.04em;">GRIEVANCE ACKNOWLEDGEMENT CERTIFICATE</div>
        </div>
        <div style="padding:16px 36px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px;border-bottom:1px solid #dce1f0;padding-bottom:16px;margin-bottom:20px;">
          <div><strong style="color:#505064;">Reference No:</strong> ${refNo}</div>
          <div><strong style="color:#505064;">Category:</strong> ${catDisplay}</div>
          <div><strong style="color:#505064;">Language:</strong> ${String(detected_language || 'en-IN').toUpperCase()}</div>
          <div><strong style="color:#505064;">Status:</strong> <span style="color:#138808;font-weight:700;">SUBMITTED &amp; ACKNOWLEDGED</span></div>
        </div>
        <div style="padding:0 36px;">
          <div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:4px;height:20px;background:#1a237e;border-radius:2px;"></div>
              <div style="color:#1a237e;font-size:14px;font-weight:800;">${isNonEnglish && nativeData ? 'AI Analysis / AI विश्लेषण' : 'AI Summary'}</div>
            </div>
            <div style="font-size:13px;line-height:1.8;color:#323246;padding-left:12px;">${reportData.summary || ''}</div>
          </div>
          ${stepsHtml}
          ${officesHtml}
          ${portalsHtml}
        </div>
        <div style="background:#1a237e;padding:14px 36px;color:#c8d2ff;font-size:10px;text-align:center;margin-top:24px;">
          <div>This is a system-generated acknowledgement from BhashaFlow. For disputes, contact your district grievance office.</div>
          <div style="color:#ff9933;margin-top:4px;font-weight:600;">© BhashaFlow Student Initiative  |  ${dateStr}  |  Ref: ${refNo}</div>
        </div>
      `;

      document.body.appendChild(pdfHtml);

      // html2canvas renders through browser fonts — supports all Indic scripts
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(pdfHtml, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      document.body.removeChild(pdfHtml);

      // Place the rendered image into a jsPDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/png');
      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;

      // Multi-page support for long content
      let position = 0;
      let remaining = imgH;
      while (remaining > 0) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgW, imgH);
        remaining -= pdfH;
        position += pdfH;
      }

      pdf.save(`BhashaFlow_Grievance_${refNo}.pdf`);
      setIsDownloading(false);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      setIsDownloading(false);
    }
  };

  const portalsArray = (() => {
    if (!portal_links) return [];
    if (Array.isArray(portal_links)) return portal_links.map(p => ({
      name: p.portal_name || p.name,
      url:  p.portal_url  || p.url,
      desc: p.helpline ? `Helpline: ${p.helpline}` : (p.desc || ''),
    }));
    return [{ name: portal_links.portal_name, url: portal_links.portal_url, desc: portal_links.helpline ? `Helpline: ${portal_links.helpline}` : '' }];
  })();

  const mapBounds = (() => {
    if (!nearby_offices || nearby_offices.length === 0) return null;
    const validOffices = nearby_offices.filter(o => o.lat != null && o.lng != null);
    if (validOffices.length === 0) return null;
    if (validOffices.length === 1) {
      // If only one office, create a tiny bounding box around it so the map doesn't zoom in too much
      const lat = parseFloat(validOffices[0].lat);
      const lng = parseFloat(validOffices[0].lng);
      return [ [lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01] ];
    }
    const lats = validOffices.map(o => parseFloat(o.lat));
    const lngs = validOffices.map(o => parseFloat(o.lng));
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  })();

  return (
    <DashboardLayout>
      <div className="ai-page">

        {/* Success banner */}
        <motion.div
          className="ai-success-banner"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="ai-success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 320, damping: 20 }}
          >
            <span className="material-symbols-outlined filled">check_circle</span>
          </motion.div>
          <div className="ai-success-text">
            <h2>Grievance Submitted Successfully</h2>
            <p>Your complaint has been received, analysed by AI, and is being routed to the correct authority.</p>
          </div>
        </motion.div>

        {/* Summary quote */}
          <motion.div
            className="ai-quote"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <span className="material-symbols-outlined quote-icon">format_quote</span>
            <p><strong>{isNative ? 'एआई सारांश' : 'AI Summary'}: </strong>{displayData.summary}</p>
          </motion.div>

        <div className="ai-grid">
          <div className="ai-main">

            {/* Classification */}
            <motion.section className="ai-section" custom={0} variants={sectionVariants} initial="hidden" animate="show">
              <h2>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>analytics</span>
                Classification
              </h2>
              <div className="class-grid">
                <div className="class-item">
                  <span className="class-label">Category</span>
                  <span className="class-value" style={{ textTransform: 'capitalize' }}>{displayData.category}</span>
                </div>
                {confidence_score != null && (
                  <div className="class-item">
                    <span className="class-label">AI Confidence</span>
                    <span className="class-value">{Math.round(confidence_score * 100)}%</span>
                  </div>
                )}
                {expected_resolution_days != null && (
                  <div className="class-item">
                    <span className="class-label">Expected Resolution</span>
                    <span className="class-value">{expected_resolution_days} days</span>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Government Portals */}
            <motion.section className="ai-section" custom={1} variants={sectionVariants} initial="hidden" animate="show">
              <h2>
                <span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>account_balance</span>
                Relevant Government Portals
              </h2>
              <div className="action-list">
                {portalsArray.length > 0 ? portalsArray.map((p, i) => (
                  <motion.a
                    key={i}
                    href={p.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="action-card"
                    style={{ textDecoration: 'none' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                  >
                    <div className="action-info">
                      <div className="action-icon">
                        <span className="material-symbols-outlined">domain</span>
                      </div>
                      <div>
                        <strong>{p.name || 'Portal'}</strong>
                        {p.desc && <p>{p.desc}</p>}
                      </div>
                    </div>
                    <span className="material-symbols-outlined">open_in_new</span>
                  </motion.a>
                )) : (
                  <p style={{ color: 'var(--outline)', fontSize: 13 }}>No specific portals matched for your state/category.</p>
                )}
              </div>
            </motion.section>

            {/* Procedure */}
            <motion.section className="ai-section" custom={2} variants={sectionVariants} initial="hidden" animate="show">
              <h2>
                <span className="material-symbols-outlined" style={{ color: 'var(--emerald)' }}>format_list_numbered</span>
                Next Steps
              </h2>
              {displayData.steps.length > 0 ? (
                <div className="procedure-list">
                  {displayData.steps.map((step, i) => (
                    <motion.div
                      key={i}
                      className="procedure-step"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.07 }}
                    >
                      <div className="procedure-num">{i + 1}</div>
                      <p>{step}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--outline)', fontSize: 13 }}>No procedure steps available for this category.</p>
              )}
            </motion.section>

            {/* CTA */}
            <motion.div className="ai-cta" custom={3} variants={sectionVariants} initial="hidden" animate="show">
              <p>Save this analysis for your records or return to your dashboard to track progress.</p>
              <div className="ai-cta-btns">
                <button 
                  className="btn btn-primary" 
                  onClick={handleDownloadSummary} 
                  disabled={isDownloading}
                  style={{ borderRadius: 10, minWidth: 180 }}
                >
                  {isDownloading ? (
                    <motion.div
                      style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    />
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                      Download Summary
                    </>
                  )}
                </button>
                <Link to="/dashboard" className="btn btn-outline" style={{ borderRadius: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
                  Back to Dashboard
                </Link>
                {(detected_language !== 'en-IN' && detected_language !== 'en') && (
                  <button 
                    className="btn btn-outline" 
                    onClick={handleToggleLanguage}
                    disabled={isTranslating}
                    style={{ borderRadius: 10, border: '1px solid var(--primary)', minWidth: 150 }}
                  >
                    {isTranslating ? (
                      <motion.div
                        style={{ width: 14, height: 14, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      />
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>language</span>
                        {isNative ? 'Show English' : 'Show Native'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Aside */}
          <aside className="ai-aside">

            {/* Nearby Offices */}
            <motion.div className="ai-aside-card" custom={0} variants={sectionVariants} initial="hidden" animate="show">
              <h3>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>business</span>
                Nearby Offices
              </h3>
              {nearby_offices.length > 0 ? nearby_offices.map((office, idx) => (
                <div key={idx} className="contact-item">
                  <span className="contact-label">{isNative && translated ? displayData.offices[idx] : (office.name || office)}</span>
                  {office.lat && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${office.lat},${office.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="contact-value"
                    >
                      View on Maps →
                    </a>
                  )}
                </div>
              )) : (
                <p style={{ fontSize: 13, color: 'var(--outline)' }}>No nearby offices found for your district.</p>
              )}
            </motion.div>

            {/* Helpline */}
            {portal_links?.helpline && (
              <motion.div className="ai-aside-card" custom={1} variants={sectionVariants} initial="hidden" animate="show">
                <h3>
                  <span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>call</span>
                  Helpline
                </h3>
                <a href={`tel:${portal_links.helpline}`} className="contact-value" style={{ fontSize: 20, fontWeight: 800 }}>
                  {portal_links.helpline}
                </a>
                <p style={{ fontSize: 12, color: 'var(--outline)', marginTop: 4 }}>{portal_links.portal_name}</p>
              </motion.div>
            )}

            {/* Map */}
            <motion.div className="ai-aside-card" custom={2} variants={sectionVariants} initial="hidden" animate="show">
              <h3>
                <span className="material-symbols-outlined" style={{ color: 'var(--emerald)' }}>map</span>
                Coverage Map
              </h3>
              {mapBounds ? (
                <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', marginTop: '12px' }}>
                  <MapContainer bounds={mapBounds} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {nearby_offices.filter(o => o.lat != null && o.lng != null).map((office, idx) => (
                      <Marker key={idx} position={[parseFloat(office.lat), parseFloat(office.lng)]}>
                        <Popup>{office.name}</Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className="map-placeholder">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>Interactive Map Available After Location Set</span>
                  <span style={{ fontSize: 11, background: 'var(--surface-container-highest)', padding: '2px 8px', borderRadius: 4 }}>Region coverage</span>
                </div>
              )}
            </motion.div>

            {/* Eco badge */}
            <motion.div className="ai-aside-card" custom={3} variants={sectionVariants} initial="hidden" animate="show">
              <h3>
                <span className="material-symbols-outlined" style={{ color: 'var(--emerald)' }}>eco</span>
                Environmental Impact
              </h3>
              <div className="eco-badge">
                <span className="material-symbols-outlined" style={{ color: 'var(--emerald)', fontSize: 18 }}>eco</span>
                <div>
                  <span className="eco-label">Digital Filing</span>
                  <p>Saved approx. 120g paper carbon by filing digitally.</p>
                </div>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}