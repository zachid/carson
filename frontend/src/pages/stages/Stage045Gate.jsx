import { useState } from 'react';
import useProjectStore from '../../store/projectStore.js';
import api from '../../api/client.js';

function downloadMd(content, filename = 'DESIGN_SYSTEM.md') {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [generatingDS, setGeneratingDS] = useState(false);

  const addUrl = () => setRefUrls(u => [...u, '']);
  const updateUrl = (i, v) => setRefUrls(u => u.map((x, idx) => idx === i ? v : x));
  const removeUrl = (i) => setRefUrls(u => u.filter((_, idx) => idx !== i));

  const validUrls = refUrls.filter(u => u.trim());

  const handleDesignSystemUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setDesignSystemFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setDesignSystemText(ev.target.result);
    reader.readAsText(f);
  };

  const handleImageUpload = (e) => setImageFiles(Array.from(e.target.files));

  // Generate DESIGN_SYSTEM.md from the first reference URL
  const handleGenerateDS = async () => {
    const url = validUrls[0];
    if (!url) return;
    setGeneratingDS(true);
    try {
      const { data } = await api.post('/generate-designsystem', { url });
      setDesignSystemText(data.content);
      setDesignSystemFile({ name: `${new URL(url).hostname}-design-system.md` });
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setGeneratingDS(false);
    }
  };

  const analyzeReferences = async () => {
    setAnalyzing(true);
    let notes = '';
    if (validUrls.length) {
      try {
        const { data } = await api.post('/scrape-reference', { urls: validUrls });
        notes += data.notes;
      } catch (err) { console.error(err); }
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
        design_system: designSystemText || null,
        reference_urls: JSON.stringify(validUrls),
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

        {/* 1. Design System */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>1. Design System</div>
              <div className="secondary-text" style={{ fontSize: 12 }}>
                {designSystemFile
                  ? <span style={{ color: 'var(--accent)' }}>✓ {designSystemFile.name}</span>
                  : 'April (default)'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {designSystemText && (
                <button
                  className="btn btn-ghost"
                  style={{ height: 28, padding: '0 10px', fontSize: 9 }}
                  onClick={() => downloadMd(designSystemText, designSystemFile?.name || 'DESIGN_SYSTEM.md')}
                >
                  ↓ Download
                </button>
              )}
              <label className="btn btn-ghost" style={{ cursor: 'pointer', height: 28, padding: '0 10px', fontSize: 9 }}>
                Upload .md
                <input type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={handleDesignSystemUpload} />
              </label>
            </div>
          </div>

          {designSystemText && (
            <textarea
              className="input"
              value={designSystemText}
              onChange={e => setDesignSystemText(e.target.value)}
              style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 11, marginTop: 8 }}
            />
          )}
        </div>

        {/* 2. Reference URLs */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>2. Reference URLs</div>
            {validUrls.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ height: 28, padding: '0 12px', fontSize: 9 }}
                onClick={handleGenerateDS}
                disabled={generatingDS}
              >
                {generatingDS
                  ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Generating…</>
                  : '✦ Generate Design System'}
              </button>
            )}
          </div>

          {generatingDS && (
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
              Scraping {validUrls[0]} and reverse-engineering design tokens…
            </div>
          )}

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

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-2)' }}>✦ Generate Design System</strong> — scrapes the URL and reverse-engineers its design tokens into a new DESIGN_SYSTEM.md, replacing the default.
          </div>
        </div>

        {/* 3. Reference Images */}
        <div style={{ background: 'var(--bg-card)', padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>3. Reference Images / Moodboard</div>
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

        {/* 4. Brand Assets */}
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

        {/* Reference notes preview */}
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
