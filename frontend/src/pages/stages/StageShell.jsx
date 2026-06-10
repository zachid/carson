import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconDownload } from '../../components/Icons.jsx';

function openPDF(title, markdown) {
  const win = window.open('', '_blank');
  win._md = markdown;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Manrope', sans-serif; padding: 64px 80px; color: #111110; line-height: 1.65; max-width: 840px; margin: 0 auto; }
    .doc-header { margin-bottom: 48px; padding-bottom: 20px; border-bottom: 2px solid #111110; }
    .doc-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #8B5CF6; margin-bottom: 8px; }
    .doc-title { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; }
    h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; margin: 36px 0 12px; }
    h2 { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; margin: 28px 0 10px; border-bottom: 1px solid #e5e5e0; padding-bottom: 6px; }
    h3 { font-size: 15px; font-weight: 700; margin: 20px 0 8px; }
    p { font-size: 14px; color: #333; margin-bottom: 12px; }
    ul, ol { padding-left: 20px; margin-bottom: 12px; }
    li { font-size: 14px; line-height: 1.7; color: #333; margin-bottom: 4px; }
    code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; background: #f0f0ec; padding: 2px 5px; }
    pre { background: #f0f0ec; border-left: 3px solid #8B5CF6; padding: 16px; margin-bottom: 16px; overflow: auto; }
    pre code { background: none; display: block; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; background: #f0f0ec; font-weight: 700; border: 1px solid #ddd; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    hr { border: none; border-top: 1px solid #e5e5e0; margin: 32px 0; }
    strong { font-weight: 700; }
    blockquote { border-left: 3px solid #8B5CF6; padding-left: 16px; color: #555; margin-bottom: 16px; }
    @media print {
      body { padding: 20px 40px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-eyebrow">Carson — Redesign Pipeline</div>
    <div class="doc-title">${title}</div>
  </div>
  <div id="content"></div>
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"><\/script>
  <script>
    document.getElementById('content').innerHTML = marked.parse(window._md || '');
    setTimeout(() => window.print(), 600);
  <\/script>
</body>
</html>`);
  win.document.close();
}

export function StageShell({
  eyebrow, title, desc, instructions,
  input, status, output, onRun,
  runLabel = 'Run Stage', disabled,
  onContinue, nextLabel,
  outputActions,  // extra JSX rendered in output header (left of Save PDF)
  editPanel,      // JSX rendered between output header and output body
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: '40px 48px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>{title}</h2>
        {desc && <p className="secondary-text">{desc}</p>}
      </div>

      {/* Instructions */}
      {instructions && (
        <div style={{ border: '1px solid var(--border-md)', marginBottom: 24 }}>
          <button className="collapsible-toggle" style={{ padding: '10px 16px' }} onClick={() => setOpen(o => !o)}>
            <span style={{ fontSize: 14 }}>{open ? '▾' : '▸'}</span>
            About this stage
          </button>
          {open && (
            <div style={{ padding: '0 16px 16px', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.65, borderTop: '1px solid var(--border)' }}>
              <div style={{ paddingTop: 12 }}>{instructions}</div>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      {input && <div style={{ marginBottom: 24 }}>{input}</div>}

      {/* Run button */}
      {onRun && (
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={onRun}
            disabled={disabled || status === 'running'}
          >
            {status === 'running'
              ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Running…</>
              : runLabel}
          </button>
          {status === 'done' && <span className="badge badge-do">Done</span>}
        </div>
      )}

      {/* Custom children */}
      {children}

      {/* Output */}
      {output && (
        <div style={{ border: '1px solid var(--border-md)' }}>
          <div style={{ padding: '10px 24px', borderBottom: editPanel ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="eyebrow">Output</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {outputActions}
              <button
                className="btn btn-ghost"
                style={{ height: 28, padding: '0 10px', fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                onClick={() => openPDF(`${eyebrow} — ${title}`, output)}
              >
                <IconDownload size={12} /> Save PDF
              </button>
            </div>
          </div>
          {editPanel}
          <div className="markdown-output" style={{ padding: 24 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Continue button */}
      {status === 'done' && onContinue && (
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary btn-lg" onClick={onContinue}>
            Continue to {nextLabel} →
          </button>
        </div>
      )}
    </div>
  );
}
