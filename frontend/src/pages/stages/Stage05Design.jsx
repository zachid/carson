import { useState, useEffect, useRef } from 'react';
import { streamStage } from '../../api/client.js';

function stripCodeFences(text) {
  if (!text) return text;
  let s = text.trimStart();
  if (s.startsWith('```')) {
    const firstNewline = s.indexOf('\n');
    if (firstNewline > -1) s = s.slice(firstNewline + 1);
  }
  const lastFence = s.lastIndexOf('\n```');
  if (lastFence > -1) s = s.slice(0, lastFence);
  return s.trim();
}

function openPDFFromHtml(html) {
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

function downloadHtml(html, filename = 'site.html') {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Stage05Design({ project, stageData, onComplete, onContinue, onBack, startFresh }) {
  const existingHtml = stageData?.output ? stripCodeFences(stageData.output) : '';

  // If startFresh → always generate from scratch. Otherwise show existing result if any.
  const [status,     setStatus]     = useState(startFresh ? 'running' : (stageData?.status || 'pending'));
  const [streamText, setStreamText] = useState('');
  const [finalHtml,  setFinalHtml]  = useState(startFresh ? '' : existingHtml);
  const [editMode,   setEditMode]   = useState(false);
  const [editHtml,   setEditHtml]   = useState('');
  const iframeRef   = useRef(null);
  const autoStarted = useRef(false);

  const startGeneration = () => {
    setStatus('running');
    setStreamText('');
    setFinalHtml('');
    streamStage(project.id, 5, {
      onChunk: (text) => setStreamText(prev => prev + text),
      onDone:  (full) => {
        const clean = stripCodeFences(full);
        setFinalHtml(clean);
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

  // Auto-start when mounted fresh from 04.5
  useEffect(() => {
    if (startFresh && !autoStarted.current) {
      autoStarted.current = true;
      startGeneration();
    }
  }, []);

  // Sync result if stageData loads after mount (normal navigation)
  useEffect(() => {
    if (!startFresh && stageData?.output) {
      setFinalHtml(stripCodeFences(stageData.output));
      setStatus(stageData.status || 'done');
    }
  }, [stageData]);

  const handleThemeToggle = () => {
    try {
      const body = iframeRef.current?.contentDocument?.body;
      if (body) body.classList.toggle('light');
    } catch {}
  };

  // ── Streaming view ──────────────────────────────────────────────────────────
  if (status === 'running') {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Generating…</h2>
          <p className="secondary-text">{streamText.length.toLocaleString()} characters</p>
        </div>
        <textarea
          readOnly value={streamText}
          style={{
            width: '100%', height: 480,
            background: 'var(--bg-card)', border: '1px solid var(--border-md)',
            color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 11,
            padding: 16, resize: 'none',
          }}
        />
      </div>
    );
  }

  // ── Empty / pending (no result yet, not running) ────────────────────────────
  if (!finalHtml && status !== 'error') {
    return (
      <div style={{ padding: '40px 48px', maxWidth: 520 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Design Concept</h2>
        <p className="secondary-text" style={{ marginBottom: 24 }}>
          Direction is set. Generate the full HTML redesign.
        </p>
        <button className="btn btn-primary btn-lg" onClick={startGeneration}>
          Generate Design →
        </button>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>Error</h2>
        <pre style={{ color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 12, marginBottom: 24 }}>{streamText}</pre>
        <button className="btn btn-primary" onClick={startGeneration}>Retry</button>
      </div>
    );
  }

  // ── Result view ─────────────────────────────────────────────────────────────
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
        <button className="btn btn-ghost" onClick={handleThemeToggle}>◑ Toggle Theme</button>
        <button className="btn btn-ghost" onClick={() => iframeRef.current?.requestFullscreen?.()}>⛶ Fullscreen</button>
        <button className="btn btn-ghost" onClick={() => { setEditHtml(finalHtml); setEditMode(e => !e); }}>
          {editMode ? '✓ Close Editor' : '✎ Edit HTML'}
        </button>
        {editMode && (
          <button className="btn btn-primary" onClick={() => { setFinalHtml(editHtml); setEditMode(false); }}>Apply Changes</button>
        )}
        <button className="btn btn-ghost" onClick={() => downloadHtml(finalHtml, `${project.name.replace(/\s+/g, '-').toLowerCase()}.html`)}>↓ Download HTML</button>
        <button className="btn btn-ghost" onClick={() => openPDFFromHtml(finalHtml)}>↓ Save PDF</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={() => onBack?.()}>← Regenerate</button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, border: '1px solid var(--border-md)', minHeight: 600 }}>
          <iframe
            key={finalHtml.slice(0, 40)}
            ref={iframeRef}
            srcDoc={finalHtml}
            style={{ width: '100%', height: 800, border: 'none', display: 'block' }}
            title="Design preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        {editMode && (
          <div style={{ width: 480, flexShrink: 0 }}>
            <textarea
              className="input" value={editHtml} onChange={e => setEditHtml(e.target.value)}
              style={{ height: 800, fontFamily: 'monospace', fontSize: 11, resize: 'none' }}
            />
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
