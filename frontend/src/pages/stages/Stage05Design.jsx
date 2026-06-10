import { useState, useEffect, useRef } from 'react';
import { streamStage } from '../../api/client.js';
import api from '../../api/client.js';
import {
  IconEdit, IconClose, IconCheck, IconDownload, IconRefresh,
  IconSun, IconFullscreen, IconBookmark, IconBookmarkFill, IconSync,
} from '../../components/Icons.jsx';

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

const THEMES_KEY = 'carson_saved_themes';
function saveToThemes(tokens) {
  if (!tokens) return false;
  try {
    const existing = JSON.parse(localStorage.getItem(THEMES_KEY) || '[]');
    if (existing.some(t => t.name === tokens.name && t.name)) return false; // no duplicates by name
    const theme = {
      id: Date.now().toString(),
      name: tokens.name || 'Untitled',
      url: '',
      tokens,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(THEMES_KEY, JSON.stringify([...existing, theme]));
    return true;
  } catch { return false; }
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
  const [syncing,       setSyncing]       = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null); // { idx, version }

  // What's shown in the iframe: saved version if available, else existing stageData output
  const displayHtml = versions[activeV]?.html || existingHtml;

  // ── Generation state ────────────────────────────────────────────────────────
  const [status,     setStatus]     = useState(startFresh ? 'running' : (stageData?.status || 'pending'));
  const [streamText, setStreamText] = useState('');
  const [editMode,   setEditMode]   = useState(false);
  const [editHtml,   setEditHtml]   = useState('');
  const [themeSaved, setThemeSaved] = useState(false);
  const iframeRef   = useRef(null);
  const autoStarted = useRef(false);

  const dirTokens    = project?.direction?.tokens;
  const dirName      = dirTokens?.name || '';

  const handleSaveToThemes = () => {
    const saved = saveToThemes(dirTokens);
    if (saved) {
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2000);
    }
  };

  const handleDeleteVersion = async (idx) => {
    const version = versions[idx];
    const updated = versions.filter((_, i) => i !== idx);
    // Re-label remaining versions sequentially
    const relabelled = updated.map((v, i) => ({ ...v, label: `v${i + 1}` }));

    // Adjust active index: if deleting active, go to the one before it (or 0)
    const newActive = activeV >= relabelled.length
      ? Math.max(0, relabelled.length - 1)
      : activeV > idx ? activeV - 1 : activeV;

    setVersions(relabelled);
    setActiveV(newActive);
    writeCache(project.id, relabelled);
    setDeleteCandidate(null);

    // Remove from Firestore if the version has a db id
    if (version?.id) {
      try {
        await api.delete(`/projects/${project.id}/stages/5/versions/${version.id}`);
      } catch {}
    }
  };

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

    // Load from Firestore; if empty but localStorage has versions, auto-sync them up
    fetchVersionsFromDB(project.id).then(async dbVersions => {
      const cached = readCache(project.id);
      if (dbVersions === null) {
        // Network error — keep localStorage data
        setVersionsReady(true);
        return;
      }
      if (dbVersions.length === 0 && cached.length > 0) {
        // First time using Firestore — upload existing localStorage versions
        console.log(`[s5] Syncing ${cached.length} local version(s) to Firestore…`);
        for (const v of cached) {
          await saveVersionToDB(project.id, v.html, v.label);
        }
        // Re-fetch after sync
        const synced = await fetchVersionsFromDB(project.id);
        if (synced && synced.length > 0) {
          setVersions(synced); setActiveV(synced.length - 1); writeCache(project.id, synced);
        }
      } else if (dbVersions.length > 0) {
        setVersions(dbVersions); setActiveV(dbVersions.length - 1); writeCache(project.id, dbVersions);
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

      {/* Design system bar */}
      {dirName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          background: 'var(--bg-card)', border: '1px solid var(--border-md)',
          marginBottom: -4,
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.10em', flexShrink: 0 }}>
            Design System
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {dirName}
          </span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 10, marginLeft: 4, color: themeSaved ? 'var(--color-success)' : undefined }}
            onClick={handleSaveToThemes}
            title="Save this design system to Saved Themes"
          >
            {themeSaved
            ? <><IconBookmarkFill size={13} style={{ color: 'var(--color-success)' }} /> Saved</>
            : <><IconBookmark size={13} /> Save to Themes</>}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Version switcher */}
        {versions.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginRight: 8, alignItems: 'center' }}>
            {versions.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
                {/* Version label button */}
                <button
                  onClick={() => setActiveV(i)}
                  style={{
                    fontSize: 10, padding: '3px 8px 3px 10px', cursor: 'pointer',
                    background: activeV === i ? 'var(--accent)' : 'var(--bg)',
                    color: activeV === i ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${activeV === i ? 'var(--accent)' : 'var(--border-md)'}`,
                    borderRight: 'none',
                    fontWeight: activeV === i ? 700 : 400,
                  }}
                >
                  {v.label}
                </button>
                {/* Delete button */}
                <button
                  onClick={() => setDeleteCandidate({ idx: i, version: v })}
                  title={`Delete ${v.label}`}
                  style={{
                    fontSize: 9, padding: '0 5px', cursor: 'pointer',
                    background: activeV === i ? 'var(--accent)' : 'var(--bg)',
                    color: activeV === i ? 'rgba(255,255,255,0.65)' : 'var(--text-3)',
                    border: `1px solid ${activeV === i ? 'var(--accent)' : 'var(--border-md)'}`,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = activeV === i ? '#fff' : 'var(--color-error)'; e.currentTarget.style.borderColor = activeV === i ? 'var(--accent)' : 'var(--color-error)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = activeV === i ? 'rgba(255,255,255,0.65)' : 'var(--text-3)'; e.currentTarget.style.borderColor = activeV === i ? 'var(--accent)' : 'var(--border-md)'; }}
                >
                  <IconClose size={9} />
                </button>
              </div>
            ))}
            <div style={{ width: 1, background: 'var(--border-md)', margin: '0 4px' }} />
          </div>
        )}

        {!versionsReady && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>● Syncing…</span>}
        {versionsReady && (
          <button className="btn btn-ghost" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }} disabled={syncing} onClick={async () => {
            setSyncing(true);
            const cached = readCache(project.id);
            for (const v of cached) await saveVersionToDB(project.id, v.html, v.label);
            const fresh = await fetchVersionsFromDB(project.id);
            if (fresh?.length) { setVersions(fresh); setActiveV(fresh.length - 1); writeCache(project.id, fresh); }
            setSyncing(false);
          }}>
            <IconSync size={12} /> {syncing ? 'Syncing…' : 'Sync'}
          </button>
        )}
        <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={handleThemeToggle}>
          <IconSun size={14} /> Toggle Theme
        </button>
        <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => iframeRef.current?.requestFullscreen?.()}>
          <IconFullscreen size={14} /> Fullscreen
        </button>
        <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => { setEditHtml(displayHtml); setEditMode(e => !e); }}>
          {editMode ? <><IconClose size={13} /> Close Editor</> : <><IconEdit size={13} /> Edit HTML</>}
        </button>
        {editMode && (
          <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => {
            addVersion(editHtml);
            setEditMode(false);
          }}>
            <IconCheck size={13} /> Apply & Save
          </button>
        )}
        <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => downloadHtml(displayHtml, `${project.name.replace(/\s+/g, '-').toLowerCase()}.html`)}>
          <IconDownload size={13} /> Download HTML
        </button>
        <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => openPDFFromHtml(displayHtml)}>
          <IconDownload size={13} /> Save PDF
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => onBack?.()}>
          <IconRefresh size={13} /> Regenerate
        </button>
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

      {/* ── Delete confirmation modal ── */}
      {deleteCandidate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDeleteCandidate(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-md)',
              padding: '28px 32px',
              width: 360,
              maxWidth: '90vw',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-error)', marginBottom: 6 }}>
                  Delete version
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                  {deleteCandidate.version.label}
                </div>
              </div>
              <button
                onClick={() => setDeleteCandidate(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, display: 'flex', alignItems: 'center', marginTop: -4, marginRight: -4 }}
              >
                <IconClose size={16} />
              </button>
            </div>

            {/* Body */}
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
              This design version will be permanently deleted and cannot be recovered.
              {versions.length === 1 && (
                <span style={{ display: 'block', marginTop: 8, color: 'var(--color-warning)', fontSize: 12 }}>
                  This is your only saved version.
                </span>
              )}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11 }}
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  fontSize: 11, height: 36, padding: '0 18px', cursor: 'pointer',
                  background: 'var(--color-error)', border: '1px solid var(--color-error)',
                  color: '#fff', fontWeight: 700, letterSpacing: '0.06em',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
                onClick={() => handleDeleteVersion(deleteCandidate.idx)}
              >
                <IconClose size={12} /> Delete {deleteCandidate.version.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
