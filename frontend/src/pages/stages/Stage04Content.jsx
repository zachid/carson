import { useState, useEffect, useRef } from 'react';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';
import api from '../../api/client.js';

export default function Stage04Content({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  // Uploaded site content
  const [siteContent,  setSiteContent]  = useState('');
  const [siteFileName, setSiteFileName] = useState('');
  const [parsing,      setParsing]      = useState(false);
  const [parseError,   setParseError]   = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
  }, [stageData]);

  // ── File upload handler ───────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // reset so same file can be re-selected
    if (!file) return;

    setParseError('');
    setSiteFileName(file.name);

    const name = file.name.toLowerCase();
    const isMdOrTxt = name.endsWith('.md') || name.endsWith('.txt');

    if (isMdOrTxt) {
      // Parse entirely on the frontend — no server round-trip
      const reader = new FileReader();
      reader.onload = (ev) => setSiteContent(ev.target.result || '');
      reader.onerror = () => setParseError('Could not read file.');
      reader.readAsText(file);
    } else {
      // PDF / DOCX / DOC — send to backend parser
      setParsing(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post('/parse-content', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSiteContent(data.text || '');
      } catch (err) {
        setParseError(err.response?.data?.error || 'Could not parse file.');
        setSiteFileName('');
      } finally {
        setParsing(false);
      }
    }
  };

  const clearContent = () => {
    setSiteContent('');
    setSiteFileName('');
    setParseError('');
  };

  // ── Stage run ─────────────────────────────────────────────────────────────────
  const handleRun = () => {
    setStatus('running');
    setOutput('');
    streamStage(project.id, 4, {
      body: siteContent ? { siteContent } : {},
      onChunk: (text) => setOutput(prev => prev + text),
      onDone:  (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err)  => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  // ── Upload panel (passed as StageShell `input`) ───────────────────────────────
  const uploadPanel = (
    <div style={{ border: '1px solid var(--border-md)', background: 'var(--bg-card)' }}>
      {/* Header row */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Site Content Reference — optional
        </span>
        {siteContent && (
          <button
            onClick={clearContent}
            style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        {!siteContent ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer' }}>
                <span className="btn btn-ghost" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
                  ↑ Upload PDF · DOC · MD
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.md,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
              {parsing && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>●</span> Parsing…
                </span>
              )}
            </div>
            {parseError && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>{parseError}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Upload your existing site copy, page structure, or content brief. The blueprint will use it as a structural base and preserve what works.
            </div>
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{siteFileName}</span>
              <span className="badge badge-do" style={{ fontSize: 9 }}>Loaded</span>
            </div>
            <div style={{
              fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6,
              fontFamily: 'monospace', background: 'var(--bg)',
              padding: '10px 12px', border: '1px solid var(--border)',
              maxHeight: 120, overflowY: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {siteContent.slice(0, 600)}{siteContent.length > 600 ? '\n…' : ''}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>
              {siteContent.length.toLocaleString()} characters loaded
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <StageShell
      eyebrow="Stage 04"
      title="Content + Blueprint"
      desc="Full page architecture and copy for every section of the redesigned homepage."
      instructions="Produces two things: a layout blueprint (section-by-section architecture with grid patterns, content blocks, visual suggestions) and full copy for every section (headlines, sub-headlines, body, CTAs, microcopy). Tone: outcome-first, evidence-based, no hype. Optionally upload your existing site content — the blueprint will use it as a structural base."
      input={uploadPanel}
      status={status}
      output={output}
      onRun={handleRun}
      runLabel="Generate Blueprint + Copy →"
      onContinue={onContinue}
      nextLabel="Design Direction"
    />
  );
}
