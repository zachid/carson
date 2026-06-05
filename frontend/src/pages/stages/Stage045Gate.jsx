import { useState } from 'react';
import useProjectStore from '../../store/projectStore.js';
import api from '../../api/client.js';

function downloadMd(content, filename = 'DESIGN_SYSTEM.md') {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseBrandName(md) {
  const m = md.match(/^#\s+(.+)/m);
  if (!m) return 'Custom';
  return m[1].replace(/design system/i, '').replace(/·.*$/, '').trim() || 'Custom';
}

function parseTypeface(md) {
  const m = md.match(/\|\s*Typeface\s*\|\s*([^|\n]+)/i);
  return m ? m[1].trim() : null;
}

function parseDesignColors(md) {
  const tokenMap = [
    { token: 'bg',       label: 'Background' },
    { token: 'bg-card',  label: 'Bg Card'    },
    { token: 'border',   label: 'Border'     },
    { token: 'text',     label: 'Text'       },
    { token: 'accent',   label: 'Accent 01'  },
    { token: 'accent-2', label: 'Accent 02'  },
  ];
  return tokenMap.reduce((acc, { token, label }) => {
    const escaped = token.replace(/-/g, '\\-');
    const re = new RegExp(`--${escaped}(?![\\w-]):\\s*(#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\))`);
    const m = md.match(re);
    if (m) acc.push({ token, label, value: m[1] });
    return acc;
  }, []);
}

const WEIGHT_NAMES = { '900':'Black','800':'Extrabold','700':'Bold','600':'Semibold','500':'Medium','400':'Regular','300':'Light','200':'Thin' };
const DEFAULT_ROWS = [
  { role:'Headlines', w:'700' }, { role:'Sub', w:'600' },
  { role:'Body',      w:'400' }, { role:'Captions', w:'300' },
];

function parseTypography(md, typeface) {
  const fontName = typeface ? typeface.split(/[\s,(]/)[0].toUpperCase() : '—';
  const section  = md.match(/## Typography\n([\s\S]*?)(\n##|$)/i);

  const makeRow = (role, w) => ({ role, font: fontName, weightName: WEIGHT_NAMES[w] || 'Regular', weight: w });

  if (!section) return DEFAULT_ROWS.map(r => makeRow(r.role, r.w));

  const rows = [];
  for (const line of section[1].split('\n')) {
    if (!line.includes('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (!cells.length || cells[0].includes('---') || /role|name/i.test(cells[0])) continue;
    const wm = line.match(/\b([1-9]00)\b/);
    rows.push(makeRow(cells[0], wm ? wm[1] : '400'));
  }
  return (rows.length ? rows : DEFAULT_ROWS.map(r => makeRow(r.role, r.w))).slice(0, 4);
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function DesignSystemSummary({ content }) {
  const brand    = parseBrandName(content);
  const typeface = parseTypeface(content);
  const colors   = parseDesignColors(content);
  const typo     = parseTypography(content, typeface);

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border-md)',
      padding: '20px 24px', marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 20 }}>
        Custom Design System / {brand}
      </div>

      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
        {/* Colors */}
        {colors.length > 0 && (
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
              Colors
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {colors.map(c => (
                <div key={c.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    width: 56, height: 56,
                    background: c.value,
                    border: '1px solid rgba(255,255,255,0.07)',
                  }} />
                  <div style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1.3, maxWidth: 56 }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Typography */}
        {typo.length > 0 && (
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
              Typography
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {typo.map(row => (
                <div key={row.role} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 72, flexShrink: 0 }}>{row.role}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.05em', width: 64, flexShrink: 0 }}>{row.font}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.15em', width: 52, flexShrink: 0 }}>ABCDE</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', width: 72, flexShrink: 0 }}>{row.weightName}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{row.weight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Stage045Gate({ project, onComplete }) {
  const { saveDirection } = useProjectStore();

  // Version history — "Saved" = already in Firestore, new = just generated/uploaded
  const savedDS = project?.direction?.design_system || null;
  const [dsVersions, setDsVersions] = useState(() =>
    savedDS ? [{ label: 'Saved', content: savedDS }] : []
  );
  const [activeVersion, setActiveVersion] = useState(0);

  const designSystemText  = dsVersions[activeVersion]?.content || '';
  const designSystemLabel = dsVersions[activeVersion]?.label   || '';

  const setDesignSystem = (content, label) => {
    setDsVersions(prev => {
      const idx = prev.findIndex(v => v.label === label);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { label, content };
        setTimeout(() => setActiveVersion(idx), 0);
        return next;
      }
      setTimeout(() => setActiveVersion(prev.length), 0);
      return [...prev, { label, content }];
    });
  };

  const updateActiveContent = (content) => {
    setDsVersions(prev => prev.map((v, i) => i === activeVersion ? { ...v, content } : v));
  };

  const [refUrls,    setRefUrls]    = useState(['']);
  const [refNotes,   setRefNotes]   = useState('');
  const [brandAssets,setBrandAssets]= useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [colorMode,  setColorMode]  = useState('match');

  const [loading,         setLoading]         = useState(false);
  const [analyzing,       setAnalyzing]       = useState(false);
  const [generatingDSUrl, setGeneratingDSUrl] = useState(false);
  const [generatingDSImg, setGeneratingDSImg] = useState(false);

  const addUrl    = ()      => setRefUrls(u => [...u, '']);
  const updateUrl = (i, v)  => setRefUrls(u => u.map((x, idx) => idx === i ? v : x));
  const removeUrl = (i)     => setRefUrls(u => u.filter((_, idx) => idx !== i));
  const validUrls = refUrls.filter(u => u.trim());

  const handleDesignSystemUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDesignSystem(ev.target.result, f.name);
    reader.readAsText(f);
  };

  const handleImageUpload = (e) => setImageFiles(Array.from(e.target.files));

  const handleGenerateDSFromUrl = async () => {
    const url = validUrls[0]; if (!url) return;
    setGeneratingDSUrl(true);
    try {
      const { data } = await api.post('/generate-designsystem', { url });
      setDesignSystem(data.content, new URL(url).hostname);
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setGeneratingDSUrl(false); }
  };

  const handleGenerateDSFromImages = async () => {
    if (!imageFiles.length) return;
    setGeneratingDSImg(true);
    try {
      const form = new FormData();
      imageFiles.forEach(f => form.append('images', f));
      const { data } = await api.post('/generate-designsystem-from-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const label = imageFiles.length === 1 ? imageFiles[0].name : `${imageFiles.length} images`;
      setDesignSystem(data.content, label);
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setGeneratingDSImg(false); }
  };

  const analyzeReferences = async () => {
    setAnalyzing(true);
    let notes = '';
    if (validUrls.length) {
      try { const { data } = await api.post('/scrape-reference', { urls: validUrls }); notes += data.notes; }
      catch (err) { console.error(err); }
    }
    if (imageFiles.length) {
      try {
        const form = new FormData();
        imageFiles.forEach(f => form.append('images', f));
        const { data } = await api.post(`/projects/${project.id}/analyze-images`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (notes) notes += '\n\n---\n\n';
        notes += data.notes;
      } catch (err) { console.error(err); }
    }
    setRefNotes(notes);
    setAnalyzing(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await saveDirection(project.id, {
        design_system:   designSystemText || null,
        reference_urls:  JSON.stringify(validUrls),
        reference_notes: refNotes || null,
        brand_assets:    brandAssets || null,
        color_mode:      colorMode,
      });
      onComplete?.();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <div style={{ marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Design Direction</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Before We Build</h2>
        <p className="secondary-text">Set the visual direction for Stage 05. None of these are required — defaults apply if skipped.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-md)' }}>

        {/* ── 1. Design System ── */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>1. Design System</div>
              <div className="secondary-text" style={{ fontSize: 12 }}>
                {designSystemText
                  ? <span style={{ color: 'var(--accent)' }}>✓ {designSystemLabel}</span>
                  : 'April (default)'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {designSystemText && (
                <button className="btn btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 9 }}
                  onClick={() => downloadMd(designSystemText, `${designSystemLabel}.md`)}>
                  ↓ Download
                </button>
              )}
              <label className="btn btn-ghost" style={{ cursor: 'pointer', height: 28, padding: '0 10px', fontSize: 9 }}>
                Upload .md
                <input type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={handleDesignSystemUpload} />
              </label>
            </div>
          </div>

          {/* Version switcher */}
          {dsVersions.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {dsVersions.map((v, i) => (
                <button key={i} onClick={() => setActiveVersion(i)} style={{
                  fontSize: 10, padding: '3px 12px', cursor: 'pointer',
                  background: activeVersion === i ? 'var(--accent)' : 'var(--bg)',
                  color: activeVersion === i ? '#fff' : 'var(--text-2)',
                  border: `1px solid ${activeVersion === i ? 'var(--accent)' : 'var(--border-md)'}`,
                  fontWeight: activeVersion === i ? 700 : 400,
                }}>
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Summary card */}
          {designSystemText && <DesignSystemSummary content={designSystemText} />}

          {/* Editable textarea */}
          {designSystemText && (
            <textarea className="input" value={designSystemText} onChange={e => updateActiveContent(e.target.value)}
              style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 11 }} />
          )}

          {/* Color mode */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Color Mode</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'match', label: 'Match design system',       desc: 'Use the mode defined in the design system' },
                { value: 'both',  label: 'Dark + light with toggle',  desc: 'Generate both modes with a toggle button'  },
              ].map(opt => (
                <button key={opt.value} onClick={() => setColorMode(opt.value)} style={{
                  flex: 1, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                  background: colorMode === opt.value ? 'var(--bg)' : 'transparent',
                  border: `1px solid ${colorMode === opt.value ? 'var(--accent)' : 'var(--border-md)'}`,
                  transition: 'border-color 0.12s',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colorMode === opt.value ? 'var(--accent)' : 'var(--text)', marginBottom: 3 }}>
                    {colorMode === opt.value ? '● ' : '○ '}{opt.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.4 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Reference URLs ── */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>2. Reference URLs</div>
            {validUrls.length > 0 && (
              <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 9 }}
                onClick={handleGenerateDSFromUrl} disabled={generatingDSUrl}>
                {generatingDSUrl ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Generating…</> : '✦ Generate Design System'}
              </button>
            )}
          </div>
          {generatingDSUrl && (
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
              Scraping {validUrls[0]} and reverse-engineering design tokens…
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {refUrls.map((url, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="https://example.com" value={url}
                  onChange={e => updateUrl(i, e.target.value)} type="url" style={{ flex: 1 }} />
                {refUrls.length > 1 && (
                  <button className="btn btn-ghost" style={{ padding: '0 10px' }} onClick={() => removeUrl(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={addUrl}>+ Add URL</button>
        </div>

        {/* ── 3. Reference Images ── */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>3. Reference Images / Moodboard</div>
            {imageFiles.length > 0 && (
              <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 9 }}
                onClick={handleGenerateDSFromImages} disabled={generatingDSImg}>
                {generatingDSImg ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Generating…</> : '✦ Generate Design System'}
              </button>
            )}
          </div>
          {generatingDSImg && (
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
              Analyzing images and extracting design tokens…
            </div>
          )}
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            {imageFiles.length ? `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} selected` : 'Upload Images'}
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          {imageFiles.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {imageFiles.map((f, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg)', border: '1px solid var(--border-md)', padding: '2px 8px' }}>
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Brand Assets ── */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>4. Brand Assets Notes</div>
          <textarea className="input"
            placeholder="Describe logo, brand colors, fonts, or any existing assets to incorporate…"
            value={brandAssets} onChange={e => setBrandAssets(e.target.value)}
            style={{ minHeight: 80 }} />
        </div>

        {/* Reference notes */}
        {refNotes && (
          <div style={{ background: 'var(--bg-card)', padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Reference Notes (analyzed)</div>
            <textarea className="input" value={refNotes} onChange={e => setRefNotes(e.target.value)}
              style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {(validUrls.length > 0 || imageFiles.length > 0) && !refNotes && (
          <button className="btn btn-ghost" onClick={analyzeReferences} disabled={analyzing}>
            {analyzing ? 'Analyzing references…' : 'Analyze References'}
          </button>
        )}
        <button className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={loading}>
          {loading ? 'Saving…' : 'Confirm & Build →'}
        </button>
      </div>
    </div>
  );
}
