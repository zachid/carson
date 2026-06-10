import { useEffect, useState } from 'react';
import useProjectStore from '../store/projectStore.js';

const STAGE_LABELS = ['Input', 'Audit', 'Analysis', 'Blueprint', 'Direction', 'Design', 'Export'];

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), url.trim());
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="card-name" style={{ fontSize: 15 }}>New Project</span>
          <button className="btn btn-ghost" style={{ height: 28, padding: '0 8px' }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label className="input-label">Project Name</label>
              <input
                className="input"
                placeholder="Acme Corp Redesign"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="input-label">Website URL</label>
              <input
                className="input"
                placeholder="https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                type="url"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name || !url}>
              {loading ? 'Creating…' : 'Create Project →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick, onDelete }) {
  const stage = project.stage || 1;
  const label = STAGE_LABELS[Math.min(stage - 1, STAGE_LABELS.length - 1)] || 'Input';
  const date = new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div className="card-band" />
      <div className="card-body">
        <div className="card-name truncate" style={{ marginBottom: 6 }}>{project.name}</div>
        <div className="secondary-text truncate" style={{ fontSize: 12 }}>{project.url}</div>
      </div>
      <div className="card-footer flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-new">{label}</span>
          <span className="mono">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost"
            style={{ height: 26, padding: '0 8px', fontSize: 9 }}
            onClick={e => { e.stopPropagation(); onClick(); }}
          >
            Open →
          </button>
          <button
            className="btn btn-danger"
            style={{ height: 26, padding: '0 8px', fontSize: 9 }}
            onClick={e => { e.stopPropagation(); onDelete(); }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onOpenProject }) {
  const { projects, loading, error, fetchProjects, createProject, deleteProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await deleteProject(id);
  };

  return (
    <div style={{ padding: '48px 48px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 40 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Projects</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Rebrand your Webpage
          </h1>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: 24, padding: '12px 16px',
          background: 'var(--bg-card)', border: '1px solid var(--danger)',
          fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span>Could not load projects: <strong>{error}</strong></span>
          <button className="btn btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 11 }} onClick={fetchProjects}>
            Retry
          </button>
        </div>
      )}

      {loading && projects.length === 0 ? (
        <div className="secondary-text">Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border-md)', border: '1px solid var(--border-md)' }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => onOpenProject(p.id)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
          <div
            className="card"
            style={{ cursor: 'pointer', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-md)', background: 'transparent' }}
            onClick={() => setShowModal(true)}
          >
            <span style={{ fontSize: 24, color: 'var(--text-3)', marginBottom: 8 }}>+</span>
            <span className="secondary-text" style={{ fontSize: 12 }}>New Project</span>
          </div>
        </div>
      )}

      {projects.length === 0 && !loading && (
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <div className="secondary-text" style={{ marginBottom: 16 }}>No projects yet. Start by creating one.</div>
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={createProject}
        />
      )}
    </div>
  );
}
