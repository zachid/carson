import { useState, useEffect, useRef } from 'react';
import { streamStage } from '../../api/client.js';

function stripCodeFences(text) {
  if (!text) return text;
  // Strip opening ```html or ``` line
  let s = text.trimStart();
  if (s.startsWith('```')) {
    const firstNewline = s.indexOf('\n');
    if (firstNewline > -1) s = s.slice(firstNewline + 1);
  }
  // Strip closing ``` if present
  const lastFence = s.lastIndexOf('\n```');
  if (lastFence > -1) s = s.slice(0, lastFence);
  return s.trim();
}

function DesignBrief({ project }) {
  const dir = project.direction;
  const ds = dir?.design_system;
  const isCustomDS = !!ds;

  // Extract a few key tokens from design system for preview
  const colorTokens = [
    { name: 'bg', value: '#111110' },
    { name: 'text', value: '#F4F3EF' },
    { name: 'accent', value: '#8B5CF6' },
    { name: 'accent-2', value: '#06B6D4' },
  ];

  const rules = [
    'Manrope typeface only',
    'Zero border-radius on blocks',
    'No shadows — depth via borders',
    'Dark-first, light via body.light',
    '4px spacing grid',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-md)', border: '1px solid var(--border-md)' }}>
      {/* Design system */}
      <div style={{ background: 'var(--bg-card)', padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Design System</div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          {isCustomDS ? 'Custom (uploaded)' : 'April v1.0 — default'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {colorTokens.map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
              <div style={{ width: 14, height: 14, background: t.value, border: '1px solid var(--border-hi)', flexShrink: 0 }} />
              --{t.name}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {rules.map(r => (
            <span key={r} className="kw-tag" style={{ fontSize: 10 }}>{r}</span>
          ))}
        </div>
      </div>

      {/* Reference notes */}
      {dir?.reference_notes && (
        <div style={{ background: 'var(--bg-card)', padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Reference Direction</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65, maxHeight: 100, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
            {dir.reference_notes}
          </div>
        </div>
      )}

      {/* Brand assets */}
      {dir?.brand_assets && (
        <div style={{ background: 'var(--bg-card)', padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Brand Assets</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>{dir.brand_assets}</div>
        </div>
      )}

      {/* Model */}
      <div style={{ background: 'var(--bg-card)', padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Model</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
          {import.meta.env.VITE_MODEL || 'anthropic/claude-sonnet-4-6'}
        </div>
      </div>
    </div>
  );
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
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Stage05Design({ project, stageData, onComplete, onContinue, onBack, startFresh }) {
  const existingHtml = stageData?.output ? stripCodeFences(stageData.output) : '';

  const [approved, setApproved] = useState(startFresh ? false : !!existingHtml);
  const [status, setStatus] = useState(startFresh ? 'running' : (stageData?.status || 'pending'));
  const [streamText, setStreamText] = useState('');
  const [finalHtml, setFinalHtml] = useState(startFresh ? '' : existingHtml);
  const [editMode, setEditMode] = useState(false);
  const [editHtml, setEditHtml] = useState('');
  const iframeRef = useRef(null);
  const streamRef = useRef(null);
  const autoStarted = useRef(false);

  // Auto-start generation when coming from 04.5
  useEffect(() => {
    if (startFresh && !autoStarted.current) {
      autoStarted.current = true;
      streamRef.current = streamStage(project.id, 5, {
        onChunk: (text) => setStreamText(prev => prev + text),
        onDone: (full) => {
          const clean = stripCodeFences(full);
          setFinalHtml(clean);
          setStreamText('');
          setStatus('done');
          setApproved(true);
          onComplete?.();
        },
        onError: (err) => {
          setStatus('error');
          setStreamText(`Error: ${err.message}`);
        },
      });
    }
  }, []);

  useEffect(() => {
    if (!startFresh && stageData?.output) {
      const clean = stripCodeFences(stageData.output);
      setFinalHtml(clean);
      setStatus(stageData.status || 'done');
      setApproved(true);
    }
  }, [stageData]);

  const handleGenerate = () => {
    setStatus('running');
    setStreamText('');
    setFinalHtml('');

    streamRef.current = streamStage(project.id, 5, {
      onChunk: (text) => setStreamText(prev => prev + text),
      onDone: (full) => {
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

  const handleEditApply = () => {
    setFinalHtml(editHtml);
    setEditMode(false);
  };

  const handleThemeToggle = () => {
    try {
      const body = iframeRef.current?.contentDocument?.body;
      if (body) body.classList.toggle('light');
    } catch {}
  };

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  // — Brief / approval —
  if (!approved) {
    return (
      <div style={{ padding: '40px 48px', maxWidth: 720 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Design Concept</h2>
          <p className="secondary-text">Review the design brief below, then approve to generate the full HTML redesign.</p>
        </div>

        <DesignBrief project={project} />

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary btn-lg" onClick={() => { setApproved(true); handleGenerate(); }}>
            Approve & Generate →
          </button>
        </div>
      </div>
    );
  }

  // — Streaming view —
  if (status === 'running') {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 05</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Generating…</h2>
          <p className="secondary-text">{streamText.length.toLocaleString()} characters</p>
        </div>
        <textarea
          readOnly
          value={streamText}
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

  // — Result view (done or pre-existing) —
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
        <button className="btn btn-ghost" onClick={handleFullscreen}>⛶ Fullscreen</button>
        <button className="btn btn-ghost" onClick={() => { setEditHtml(finalHtml); setEditMode(e => !e); }}>
          {editMode ? '✓ Close Editor' : '✎ Edit HTML'}
        </button>
        {editMode && (
          <button className="btn btn-primary" onClick={handleEditApply}>Apply Changes</button>
        )}
        <button className="btn btn-ghost" onClick={() => downloadHtml(finalHtml, `${project.name.replace(/\s+/g,'-').toLowerCase()}.html`)}>↓ Download HTML</button>
        <button className="btn btn-ghost" onClick={() => openPDFFromHtml(finalHtml)}>↓ Save PDF</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={() => onBack?.()}>
          ← Regenerate
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* iframe — srcDoc only changes when finalHtml changes (not during stream) */}
        {finalHtml && (
          <div style={{ flex: 1, border: '1px solid var(--border-md)', minHeight: 600 }}>
            <iframe
              key={finalHtml.slice(0, 40)} // stable key — only remounts on truly new HTML
              ref={iframeRef}
              srcDoc={finalHtml}
              style={{ width: '100%', height: 800, border: 'none', display: 'block' }}
              title="Design preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}

        {/* Editor panel */}
        {editMode && (
          <div style={{ width: 480, flexShrink: 0 }}>
            <textarea
              className="input"
              value={editHtml}
              onChange={e => setEditHtml(e.target.value)}
              style={{ height: 800, fontFamily: 'monospace', fontSize: 11, resize: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Continue */}
      {status === 'done' && onContinue && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={onContinue}>
            Continue to Export →
          </button>
        </div>
      )}
    </div>
  );
}
