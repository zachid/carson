import { useState } from 'react';
import useProjectStore from '../../store/projectStore.js';
import api from '../../api/client.js';

export default function Stage045Gate({ project, onComplete }) {
  const { saveDirection } = useProjectStore();
  const [designSystemFile, setDesignSystemFile] = useState(null);
  const [designSystemText, setDesignSystemText] = useState('');
  const [refUrls, setRefUrls] = useState(['']);
  const [refNotes, setRefNotes] = useState('');
  const [brandAssets, setBrandAssets] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const addUrl = () => setRefUrls(u => [...u, '']);
  const updateUrl = (i, v) => setRefUrls(u => u.map((x, idx) => idx === i ? v : x));
  const removeUrl = (i) => setRefUrls(u => u.filter((_, idx) => idx !== i));

  const handleDesignSystemUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setDesignSystemFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setDesignSystemText(ev.target.result);
    reader.readAsText(f);
  };

  const handleImageUpload = (e) => {
    setImageFiles(Array.from(e.target.files));
  };

  const analyzeReferences = async () => {
    setAnalyzing(true);
    let notes = '';

    const validUrls = refUrls.filter(u => u.trim());
    if (validUrls.length) {
      try {
        const { data } = await api.post('/scrape-reference', { urls: validUrls });
        notes += data.notes;
      } catch (err) {
        console.error('URL analysis failed:', err);
      }
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
      } catch (err) {
        console.error('Image analysis failed:', err);
      }
    }

    setRefNotes(notes);
    setAnalyzing(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await saveDirection(project.id, {
        design_system: designSystemText || null,
        reference_urls: JSON.stringify(refUrls.filter(u => u.trim())),
        reference_notes: refNotes || null,
        brand_assets: brandAssets || null,
      });
      onComplete?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 720 }}>
      <div style={{ marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Design Direction</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Before We Build</h2>
        <p className="secondary-text">Set the visual direction for Stage 05. None of these are required — defaults apply if skipped.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-md)' }}>

        {/* Design System */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>1. Design System</div>
              <div className="secondary-text" style={{ fontSize: 12 }}>
                Currently: {designSystemFile ? designSystemFile.name : 'April (default)'}
              </div>
            </div>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              Upload DESIGN_SYSTEM.md
              <input type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={handleDesignSystemUpload} />
            </label>
          </div>
          {designSystemText && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 12, fontSize: 12, color: 'var(--text-2)', maxHeight: 120, overflow: 'auto', fontFamily: 'monospace' }}>
              {designSystemText.slice(0, 400)}…
            </div>
          )}
        </div>

        {/* Reference URLs */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>2. Reference URLs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {refUrls.map((url, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="https://example.com"
                  value={url}
                  onChange={e => updateUrl(i, e.target.value)}
                  type="url"
                  style={{ flex: 1 }}
                />
                {refUrls.length > 1 && (
                  <button className="btn btn-ghost" style={{ padding: '0 10px' }} onClick={() => removeUrl(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={addUrl}>+ Add URL</button>
        </div>

        {/* Reference Images */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>3. Reference Images / Moodboard</div>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            {imageFiles.length ? `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} selected` : 'Upload Images'}
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          {imageFiles.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {imageFiles.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg)', border: '1px solid var(--border-md)', padding: '2px 8px' }}>
                  {f.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand Assets */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>4. Brand Assets Notes</div>
          <textarea
            className="input"
            placeholder="Describe logo, brand colors, fonts, or any existing assets to incorporate…"
            value={brandAssets}
            onChange={e => setBrandAssets(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Analyzed notes preview */}
        {refNotes && (
          <div style={{ background: 'var(--bg-card)', padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Reference Notes (analyzed)</div>
            <textarea
              className="input"
              value={refNotes}
              onChange={e => setRefNotes(e.target.value)}
              style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        {(refUrls.some(u => u.trim()) || imageFiles.length > 0) && !refNotes && (
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
