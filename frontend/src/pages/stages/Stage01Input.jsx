import { useState, useEffect } from 'react';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';
import useProjectStore from '../../store/projectStore.js';

function UrlEditor({ project }) {
  const { updateProject } = useProjectStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.url);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(project.url); }, [project.url]);

  const handleSave = async () => {
    if (!value.trim() || value === project.url) { setEditing(false); return; }
    setSaving(true);
    try {
      await updateProject(project.id, { url: value.trim() });
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setValue(project.url); setEditing(false); }
  };

  return (
    <div style={{ border: '1px solid var(--border-md)', marginBottom: 24 }}>
      <div style={{ padding: '10px 16px', borderBottom: editing ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="eyebrow" style={{ flexShrink: 0 }}>Target URL</span>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {editing ? (
          <>
            <input
              className="input"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKey}
              type="url"
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" style={{ height: 32, padding: '0 12px', fontSize: 9 }} onClick={handleSave} disabled={saving}>
              {saving ? '…' : 'Save'}
            </button>
            <button className="btn btn-ghost" style={{ height: 32, padding: '0 10px', fontSize: 9 }} onClick={() => { setValue(project.url); setEditing(false); }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, fontSize: 13, color: 'var(--accent)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {project.url}
            </a>
            <button
              className="btn btn-ghost"
              style={{ height: 28, padding: '0 10px', fontSize: 9, flexShrink: 0 }}
              onClick={() => setEditing(true)}
            >
              ✎ Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Stage01Input({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
  }, [stageData]);

  const handleRun = () => {
    setStatus('running');
    setOutput('');
    streamStage(project.id, 1, {
      onChunk: (text) => setOutput(prev => prev + text),
      onDone: (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err) => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  return (
    <StageShell
      eyebrow="Stage 01"
      title="Input"
      desc="Scrape and extract structured content from the target website."
      instructions="Carson fetches the URL, strips noise from the HTML, and asks the model to extract and structure all visible content — headlines, copy, CTAs, nav, footer, and social proof. This becomes the raw material for every downstream stage."
      input={<UrlEditor project={project} />}
      status={status}
      output={output}
      onRun={handleRun}
      runLabel="Scrape & Extract →"
      onContinue={onContinue}
      nextLabel="Brand Audit"
    />
  );
}
