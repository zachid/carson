import { useState, useEffect, useRef } from 'react';
import { streamStage } from '../../api/client.js';
import api from '../../api/client.js';

function stripCodeFences(text) {
  if (!text) return text;
  let s = text.trimStart();
  if (s.startsWith('```')) {
    const nl = s.indexOf('\n');
    if (nl > -1) s = s.slice(nl + 1);
  }
  const last = s.lastIndexOf('\n```');
  if (last > -1) s = s.slice(0, last);
  return s.trim();
}

function openPDFFromHtml(html) {
  const win = window.open('', '_blank');
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 800);
}

// Inject <base target="_blank"> so iframe links open in a new tab, not inside the iframe
function injectBaseTarget(html) {
  if (!html) return html;
  if (/<base\b/i.test(html)) return html;
  return html.replace(/(<head[^>]*>)/i, '$1\n  <base target="_blank">');
}

function downloadHtml(html, filename = 'site.html') {
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Version storage helpers ──────────────────────────────────────────────────
// Primary store: Firestore (persists across devices)
// Cache: localStorage (instant load on repeat visits)

function cacheKey(projectId) { return `carson_s5v_${projectId}`; }

function readCache(projectId) {
  try { return JSON.parse(localStorage.getItem(cacheKey(projectId)) || '[]'); }
  catch { return []; }
}

function writeCache(projectId, versions) {
  try { localStorage.setItem(cacheKey(projectId), JSON.stringify(versions)); }
  catch {}
}

async function fetchVersionsFromDB(projectId) {
  try {
    const { data } = await api.get(`/projects/${projectId}/stages/5/versions`);
    return data.versions || [];
  } catch { return null; } // null = network error, keep cache
}

async function saveVersionToDB(projectId, html, label) {
  try {
    const { data } = await api.post(`/projects/${projectId}/stages/5/versions`, { html, label });
    return data.id; // Firestore doc id
  } catch (e) {
    console.warn('Failed to save version to Firestore:', e.message);
    return null;
  }
}

export default function Stage05Design({ project, stageData, onComplete, onContinue, onBack, startFresh, onMounted }) {
  const existingHtml = stageData?.output ? stripCodeFences(stageData.output) : '';

  // ── Version history ─────────────────────────────────────────────────────────
  // Seed from localStorage cache immediately; refresh from Firestore in background
  const [versions,      setVersions]     = useState(() => readCache(project.id));
  const [activeV,       setActiveV]      = useState(() => {
    const v = readCache(project.id);
    return v.length > 0 ? v.length - 1 : 0;
  });
  const [versionsReady, setVersionsReady] = useState(false);

  // What's shown in the iframe: saved version if available, else existing stageData output
  const displayHtml = versions[activeV]?.html || existingHtml;

  // ── Generation state ────────────────────────────────────────────────────────
  const [status,     setStatus]     = useState(startFresh ? 'running' : (stageData?.status || 'pending'));
  const [streamText, setStreamText] = useState('');
  const [editMode,   setEditMode]   = useState(false);
  const [editHtml,   setEditHtml]   = useState('');
  const iframeRef   = useRef(null);
  const autoStarted = useRef(false);

  const addVersion = (html) => {
    setVersions(prev => {
      if (prev.length > 0 && prev[prev.length - 1].html === html) return prev;
      const label = `v${prev.length + 1}`;
      const updated = [...prev, { label, html }];
      // Write-through: cache immediately, persist to Firestore async
      writeCache(project.id, updated);
      setActiveV(updated.length - 1);
      saveVersionToDB(project.id, html, label); // fire-and-forget
      return updated;
    });
  };

  const startGeneration = () => {
    setStatus('running');
    setStreamText('');
    streamStage(project.id, 5, {
      onChunk: (text) => setStreamText(prev => prev + text),
      onDone:  (full) => {
        const clean = stripCodeFences(full);
        addVersion(clean);
        setStreamText('');
        setStatus('done');
        onComplete?.();
      },
      onError: (err) => {
        setStatus('error');
        setStreamText(`Error: ${err.message}`);
      },
    });
  };

  // ── On mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    onMounted?.();

    // Load versions from Firestore (source of truth) — update cache + state
    fetchVersionsFromDB(project.id).then(dbVersions => {
      if (dbVersions && dbVersions.length > 0) {
        setVersions(dbVersions);
        setActiveV(dbVersions.length - 1);
        writeCache(project.id, dbVersions);
      }
      setVersionsReady(true);
    });

    if (startFresh && !autoStarted.current) {
      autoStarted.current = true;
      // Archive existing HTML as a version before generating the new one
      if (existingHtml && !versions.some(v => v.html === existingHtml)) {
        const label = `v${versions.length + 1}`;
        const updated = [...versions, { label, html: existingHtml }];
        setVersions(updated);
        writeCache(project.id, updated);
        saveVersionToDB(project.id, existingHtml, label);
      }
      startGeneration();
    }
  }, []);

  // Sync stageData if it loads after mount (normal navigation, no regen)
  useEffect(() => {
    if (!startFresh && stageData?.output) {
      setStatus(stageData.status || 'done');
    }
  }, [stageData]);

  const handleThemeToggle = () => {
    try {
      const body = iframeRef.current?.contentDocument?.body;
      if (body) body.classList.toggle('light');
    } catch {}
  };

  // ── Streaming ───────────────────────────────────────────────────────────────
  if (status === 'running') {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Generating…</h2>
          <p className="secondary-text">{streamText.length.toLocaleString()} characters</p>
        </div>
        <textarea readOnly value={streamText} style={{
          width: '100%', height: 480,
          background: 'var(--bg-card)', border: '1px solid var(--border-md)',
          color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 11,
          padding: 16, resize: 'none',
        }} />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>Error</h2>
        <pre style={{ color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 12, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{streamText}</pre>
        <button className="btn btn-primary" onClick={startGeneration}>Retry</button>
      </div>
    );
  }

  // ── No output yet ───────────────────────────────────────────────────────────
  if (!displayHtml) {
    return (
      <div style={{ padding: '40px 48px', maxWidth: 520 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Design Concept</h2>
        <p className="secondary-text" style={{ marginBottom: 24 }}>Direction is set. Generate the full HTML redesign.</p>
        <button className="btn btn-primary btn-lg" onClick={startGeneration}>Generate Design →</button>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Design Concept</h2>
        </div>
        {status === 'done' && <span className="badge badge-do">Done</span>}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Version switcher */}
        {versions.length > 1 && (
          <div style={{ display: 'flex', gap: 3, marginRight: 8 }}>
            {versions.map((v, i) => (
              <button key={i} onClick={() => setActiveV(i)} style={{
                fontSize: 10, padding: '3px 10px', cursor: 'pointer',
                background: activeV === i ? 'var(--accent)' : 'var(--bg)',
                color: activeV === i ? '#fff' : 'var(--text-2)',
                border: `1px solid ${activeV === i ? 'var(--accent)' : 'var(--border-md)'}`,
                fontWeight: activeV === i ? 700 : 400,
              }}>
                {v.label}
              </button>
            ))}
            <div style={{ width: 1, background: 'var(--border-md)', margin: '0 4px' }} />
          </div>
        )}

        <button className="btn btn-ghost" onClick={handleThemeToggle}>◑ Toggle Theme</button>
        <button className="btn btn-ghost" onClick={() => iframeRef.current?.requestFullscreen?.()}>⛶ Fullscreen</button>
        <button className="btn btn-ghost" onClick={() => { setEditHtml(displayHtml); setEditMode(e => !e); }}>
          {editMode ? '✓ Close Editor' : '✎ Edit HTML'}
        </button>
        {editMode && (
          <button className="btn btn-primary" onClick={() => {
            // Save edit as a new version
            addVersion(editHtml);
            setEditMode(false);
          }}>Apply & Save</button>
        )}
        <button className="btn btn-ghost" onClick={() => downloadHtml(displayHtml, `${project.name.replace(/\s+/g, '-').toLowerCase()}.html`)}>↓ Download HTML</button>
        <button className="btn btn-ghost" onClick={() => openPDFFromHtml(displayHtml)}>↓ Save PDF</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={() => onBack?.()}>← Regenerate</button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, border: '1px solid var(--border-md)', minHeight: 600 }}>
          <iframe
            key={`${activeV}-${displayHtml.slice(0, 40)}`}
            ref={iframeRef}
            srcDoc={injectBaseTarget(displayHtml)}
            style={{ width: '100%', height: 800, border: 'none', display: 'block' }}
            title="Design preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        {editMode && (
          <div style={{ width: 480, flexShrink: 0 }}>
            <textarea className="input" value={editHtml} onChange={e => setEditHtml(e.target.value)}
              style={{ height: 800, fontFamily: 'monospace', fontSize: 11, resize: 'none' }} />
          </div>
        )}
      </div>

      {status === 'done' && onContinue && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={onContinue}>Continue to Export →</button>
        </div>
      )}
    </div>
  );
}
