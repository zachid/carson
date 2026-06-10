import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';
import api from '../../api/client.js';
import {
  IconEdit, IconClose, IconCheck, IconDownload, IconUpload,
  IconRefresh, IconNext,
} from '../../components/Icons.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitBlueprint(md) {
  if (!md) return { layout: '', copy: '' };

  const patterns = [
    /^-{1,3}\s*PART\s+TWO[:\s]+COPY/im,
    /^#{1,3}\s+PART\s+TWO[:\s]+COPY/im,
    /^\*{1,2}PART\s+TWO[:\s]+COPY\*{1,2}/im,
    /^PART\s+TWO[:\s]+COPY\s*$/im,
    /^#\s+REVISED COPY\s*$/im,
    /^#{1,2}\s+2[\.\)]\s+(copy|revised copy)/im,
  ];

  function stripLayoutPreamble(raw) {
    const re = /^[^\n]*(?:PART\s+ONE[:\s]+)?LAYOUT\s+BLUEPRINT[^\n]*/im;
    const m = raw.match(re);
    if (m) return raw.slice(raw.indexOf(m[0]) + m[0].length).trim();
    return raw.trim();
  }

  for (const re of patterns) {
    const match = md.match(re);
    if (match) {
      const idx = md.indexOf(match[0]);
      return {
        layout: stripLayoutPreamble(md.slice(0, idx)),
        copy:   md.slice(idx + match[0].length).trim(),
      };
    }
  }

  return { layout: stripLayoutPreamble(md), copy: '' };
}

function parseSections(md) {
  if (!md) return [];
  const parts = md.split(/(?=^#{1,3}\s)/m).map(s => s.trim()).filter(Boolean);
  return parts.length > 1
    ? parts.map((text, idx) => ({ idx, text }))
    : [{ idx: 0, text: md.trim() }];
}

function reconstructOutput(layout, copySections) {
  const newCopy = copySections.map(s => s.text).join('\n\n');
  const parts = [];
  if (layout) parts.push(`# LAYOUT BLUEPRINT\n\n${layout}`);
  parts.push(`-- PART TWO: COPY\n\n${newCopy}`);
  return parts.join('\n\n');
}

function downloadMd(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Stage04Content({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  const [outputTab, setOutputTab] = useState(0); // 0 = copy, 1 = layout

  const [siteContent,  setSiteContent]  = useState('');
  const [siteFileName, setSiteFileName] = useState('');
  const [parsing,      setParsing]      = useState(false);
  const [parseError,   setParseError]   = useState('');

  const [inputCollapsed, setInputCollapsed] = useState(stageData?.status === 'done');

  const [editSection,   setEditSection]   = useState('');
  const [editRequest,   setEditRequest]   = useState('');
  const [editStreaming, setEditStreaming]  = useState(false);

  const [sectionEdits, setSectionEdits] = useState({});

  const fileInputRef  = useRef(null);
  const editLayoutRef = useRef(null);
  const editCopyRef   = useRef(null);

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
    if (stageData?.status === 'done') setInputCollapsed(true);
  }, [stageData]);

  useEffect(() => {
    if (status === 'done') setInputCollapsed(true);
    if (status === 'running') setSectionEdits({});
  }, [status]);

  useEffect(() => {
    if (editSection === 'layout') setTimeout(() => editLayoutRef.current?.focus(), 60);
    if (editSection === 'copy')   setTimeout(() => editCopyRef.current?.focus(),   60);
  }, [editSection]);

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    setParseError(''); setSiteFileName(file.name);
    const name = file.name.toLowerCase();
    if (name.endsWith('.md') || name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (ev) => setSiteContent(ev.target.result || '');
      reader.onerror = () => setParseError('Could not read file.');
      reader.readAsText(file);
    } else {
      setParsing(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post('/parse-content', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSiteContent(data.text || '');
      } catch (err) {
        setParseError(err.response?.data?.error || 'Could not parse file.');
        setSiteFileName('');
      } finally { setParsing(false); }
    }
  };

  const clearContent = () => { setSiteContent(''); setSiteFileName(''); setParseError(''); };

  // ── Generation ───────────────────────────────────────────────────────────────
  const handleRun = () => {
    setStatus('running'); setOutput(''); setEditSection(''); setEditRequest(''); setSectionEdits({});
    streamStage(project.id, 4, {
      body: siteContent ? { siteContent } : {},
      onChunk: (text) => setOutput(prev => prev + text),
      onDone:  (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err)  => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  // ── Global AI revision ───────────────────────────────────────────────────────
  const handleEditSubmit = (section) => {
    if (!editRequest.trim() || editStreaming) return;
    setEditStreaming(true); setSectionEdits({});
    setOutput('');
    streamStage(project.id, 4, {
      body: { editRequest: editRequest.trim(), currentOutput: output, editSection: section },
      onChunk: (text) => setOutput(prev => prev + text),
      onDone:  (full) => {
        setOutput(full); setEditStreaming(false);
        setEditRequest(''); setEditSection('');
        onComplete?.();
      },
      onError: (err) => {
        setEditStreaming(false);
        setOutput(prev => prev || `Error: ${err.message}`);
      },
    });
  };

  // ── Per-section inline edit ──────────────────────────────────────────────────
  const openSectionEdit = (idx, text) => {
    setSectionEdits(prev => ({ ...prev, [idx]: { draft: text, saving: false } }));
  };

  const closeSectionEdit = (idx) => {
    setSectionEdits(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const handleSaveSectionEdit = async (idx) => {
    const draft = sectionEdits[idx]?.draft;
    if (draft === undefined) return;
    setSectionEdits(prev => ({ ...prev, [idx]: { ...prev[idx], saving: true } }));

    const { layout: layoutContent, copy: copyContent } = splitBlueprint(output);
    const sections = parseSections(copyContent);
    sections[idx] = { ...sections[idx], text: draft };
    const newOutput = reconstructOutput(layoutContent, sections);

    setOutput(newOutput);
    closeSectionEdit(idx);

    try {
      await api.patch(`/projects/${project.id}/stages/4/output`, { output: newOutput });
    } catch {}
  };

  // ── Collapsed bar ────────────────────────────────────────────────────────────
  const collapsedBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-3)', flexShrink: 0 }}>Reference</span>
      <span style={{ fontSize: 11, color: siteContent ? 'var(--text-2)' : 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {siteContent ? siteFileName || 'Content loaded' : 'None'}
      </span>
      {siteContent && <span className="badge badge-do" style={{ fontSize: 8, flexShrink: 0 }}>Loaded</span>}
      <button
        className="btn btn-ghost"
        style={{ fontSize: 10, flexShrink: 0, height: 26, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        onClick={handleRun}
        disabled={status === 'running'}
      >
        <IconRefresh size={11} /> {status === 'running' ? 'Running…' : 'Regenerate'}
      </button>
      <button
        onClick={() => setInputCollapsed(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0 2px', display: 'flex', alignItems: 'center' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );

  // ── Full upload panel ────────────────────────────────────────────────────────
  const fullUploadPanel = (
    <div style={{ border: '1px solid var(--border-md)', background: 'var(--bg-card)' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Site Content Reference — optional</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {siteContent && (
            <button
              onClick={clearContent}
              style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconClose size={10} /> Remove
            </button>
          )}
          {status === 'done' && (
            <button
              onClick={() => setInputCollapsed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0 2px', display: 'flex', alignItems: 'center' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {!siteContent ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ cursor: 'pointer' }}>
                <span className="btn btn-ghost" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
                  <IconUpload size={13} /> Upload PDF · DOC · MD
                </span>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.md,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
              {parsing && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Parsing…</span>}
            </div>
            {parseError && <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>{parseError}</div>}
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>Upload your existing site copy or content brief — the blueprint will use it as a structural base.</div>
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{siteFileName}</span>
              <span className="badge badge-do" style={{ fontSize: 9 }}>Loaded</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', background: 'var(--bg)', padding: '10px 12px', border: '1px solid var(--border)', maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {siteContent.slice(0, 600)}{siteContent.length > 600 ? '\n…' : ''}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>{siteContent.length.toLocaleString()} characters loaded</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Global edit panel ────────────────────────────────────────────────────────
  const renderGlobalEditPanel = (section) => {
    const ref = section === 'layout' ? editLayoutRef : editCopyRef;
    const isActive = editSection === section;
    const isStreaming = editStreaming && editSection === section;
    if (!isActive) return null;
    const placeholder = section === 'layout'
      ? 'Describe layout changes — e.g. add a testimonials section, change hero to full-width…'
      : 'Describe copy changes — e.g. make the hero shorter, rewrite benefits in second person…';
    const label = section === 'layout' ? 'Update Layout' : 'Update Copy';
    return (
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '14px 20px 16px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            ref={ref} value={editRequest}
            onChange={e => setEditRequest(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEditSubmit(section); }}
            placeholder={placeholder} disabled={isStreaming}
            style={{ flex: 1, height: 72, resize: 'none', background: 'var(--bg-card)', border: '1px solid var(--border-md)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.55, padding: '10px 12px', outline: 'none', transition: 'border-color 0.12s' }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-md)'; }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 11, height: 36, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => handleEditSubmit(section)}
              disabled={!editRequest.trim() || isStreaming}
            >
              {isStreaming
                ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Updating…</>
                : <>{label} <IconNext size={12} /></>}
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 10, height: 28, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              onClick={() => { setEditSection(''); setEditRequest(''); }}
              disabled={isStreaming}
            >
              <IconClose size={11} /> Cancel
            </button>
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>⌘↵ to submit</div>
      </div>
    );
  };

  // ── Copy sections renderer ───────────────────────────────────────────────────
  const renderCopySections = (content) => {
    if (!content) return (
      <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
        No copy content yet — regenerate to populate.
      </div>
    );

    const sections = parseSections(content);
    return sections.map(({ idx, text }) => {
      const isEditing = !!sectionEdits[idx];
      const draft     = sectionEdits[idx]?.draft ?? text;
      const saving    = sectionEdits[idx]?.saving ?? false;

      return (
        <div key={idx} style={{ borderBottom: '1px solid var(--border)', padding: '20px 0', position: 'relative' }}>
          {/* Section actions */}
          <div style={{ position: 'absolute', top: 20, right: 0 }}>
            {!isEditing ? (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 9, height: 24, padding: '0 10px', opacity: 0.7, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => openSectionEdit(idx, text)}
                disabled={!!editSection || editStreaming}
              >
                <IconEdit size={11} /> Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 5 }}>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 9, height: 24, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => handleSaveSectionEdit(idx)}
                  disabled={saving}
                >
                  {saving
                    ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Saving…</>
                    : <><IconCheck size={11} /> Save</>}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 9, height: 24, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => closeSectionEdit(idx)}
                  disabled={saving}
                >
                  <IconClose size={11} /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Section content */}
          {isEditing ? (
            <textarea
              value={draft}
              onChange={e => setSectionEdits(prev => ({ ...prev, [idx]: { ...prev[idx], draft: e.target.value } }))}
              autoFocus
              style={{ width: '100%', minHeight: 180, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.65, background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '12px 14px', outline: 'none' }}
            />
          ) : (
            <div className="section-content" style={{ paddingRight: 80 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    });
  };

  // ── Streaming view ───────────────────────────────────────────────────────────
  const streamingView = status === 'running' && (
    <div style={{ border: '1px solid var(--border-md)', marginBottom: 24 }}>
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ animation: 'pulse 1s infinite', fontSize: 10 }}>●</span>
        <span className="eyebrow">Generating blueprint…</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>{output.length.toLocaleString()} chars</span>
      </div>
      <textarea readOnly value={output} style={{ width: '100%', height: 360, padding: 20, background: 'var(--bg)', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7, border: 'none', resize: 'none' }} />
    </div>
  );

  // ── Tabbed output ────────────────────────────────────────────────────────────
  const { layout: layoutContent, copy: copyContent } = splitBlueprint(output);
  const tabs = [
    { key: 'copy',   label: 'New Copy',    content: copyContent   },
    { key: 'layout', label: 'Site Layout', content: layoutContent },
  ];
  const activeContent = tabs[outputTab].content;
  const activeKey     = tabs[outputTab].key;
  const projectSlug   = project?.name?.replace(/\s+/g, '-').toLowerCase() || 'blueprint';

  const tabbedOutput = status === 'done' && output && (
    <div style={{ border: '1px solid var(--border-md)', marginBottom: 24 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => { setOutputTab(i); setEditSection(''); setEditRequest(''); setSectionEdits({}); }}
              style={{
                padding: '7px 18px',
                background: outputTab === i ? 'var(--accent)' : 'transparent',
                border: `1px solid ${outputTab === i ? 'var(--accent)' : 'var(--border-md)'}`,
                color: outputTab === i ? '#fff' : 'var(--text-3)',
                fontWeight: outputTab === i ? 700 : 500,
                fontSize: 12, cursor: 'pointer', letterSpacing: '0.03em', transition: 'all 0.12s',
              }}
            >{tab.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            style={{ height: 28, padding: '0 12px', fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 5, color: editSection === activeKey ? 'var(--accent)' : undefined, borderColor: editSection === activeKey ? 'var(--accent)' : undefined }}
            onClick={() => { editSection === activeKey ? (setEditSection(''), setEditRequest('')) : (setEditSection(activeKey), setEditRequest('')); }}
            disabled={editStreaming}
          >
            {editSection === activeKey
              ? <><IconClose size={11} /> Close</>
              : <><IconEdit  size={11} /> Global Edit</>}
          </button>
          <button
            className="btn btn-ghost"
            style={{ height: 28, padding: '0 10px', fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onClick={() => downloadMd(activeContent, `${projectSlug}-${activeKey}.md`)}
          >
            <IconDownload size={11} /> Download
          </button>
        </div>
      </div>

      {editSection && <div style={{ height: 1, background: 'var(--border)' }} />}
      {renderGlobalEditPanel(activeKey)}

      {editStreaming && editSection === activeKey && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ animation: 'pulse 1s infinite', fontSize: 10 }}>●</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Updating blueprint…</span>
        </div>
      )}

      {!editSection && (
        <div className="markdown-output" style={{ padding: '20px 24px' }}>
          {activeContent && (
            <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border-md)' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>
                {project?.name || 'Project'} — Homepage Redesign
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, letterSpacing: '0.02em' }}>
                {activeKey === 'copy' ? 'Revised site copy and content' : 'Revised layout and page structure'}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '6px 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {activeKey === 'copy' ? 'Part One: Revised Site Content' : 'Part Two: Layout Blueprint'}
              </p>
            </div>
          )}

          {activeKey === 'copy'
            ? renderCopySections(activeContent)
            : activeContent
              ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeContent}</ReactMarkdown>
              : <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No layout content yet — regenerate to populate both tabs.</div>
          }
        </div>
      )}

      {editSection && !editStreaming && (
        <div className="markdown-output" style={{ padding: '20px 24px', opacity: 0.3, pointerEvents: 'none' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeContent || ''}</ReactMarkdown>
        </div>
      )}
    </div>
  );

  return (
    <StageShell
      eyebrow="Stage 04"
      title="Content + Blueprint"
      desc="Full page architecture and copy for every section of the redesigned homepage."
      instructions="Produces two things: a layout blueprint (section-by-section architecture with grid patterns, content blocks, visual suggestions) and full copy for every section (headlines, sub-headlines, body, CTAs, microcopy). Tone: outcome-first, evidence-based, no hype. Optionally upload your existing site content — the blueprint will use it as a structural base."
      input={inputCollapsed ? collapsedBar : fullUploadPanel}
      status={status}
      output={null}
      onRun={inputCollapsed ? undefined : handleRun}
      runLabel="Generate Blueprint + Copy"
    >
      {streamingView}
      {tabbedOutput}
      {status === 'error' && (
        <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444' }}>
          {output}
        </div>
      )}
      {status === 'done' && onContinue && (
        <div style={{ marginTop: 8 }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={onContinue}
          >
            Continue to Design Direction <IconNext size={14} />
          </button>
        </div>
      )}
    </StageShell>
  );
}
