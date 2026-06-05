import { useState } from 'react';
import api from '../../api/client.js';

export default function Stage06Export({ project }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/projects/${project.id}/export`);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 600 }}>
      <div style={{ marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Stage 06</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Export</h2>
        <p className="secondary-text">Render the final HTML to a standalone file and a print-ready PDF via Puppeteer.</p>
      </div>

      <div style={{ border: '1px solid var(--border-md)', padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>
          <strong style={{ color: 'var(--text)' }}>What gets exported:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li><code>site.html</code> — self-contained, fully-styled HTML file</li>
            <li><code>site.pdf</code> — A4 PDF rendered by Puppeteer with all styles and images</li>
          </ul>
        </div>

        {!done ? (
          <button className="btn btn-primary btn-lg" onClick={handleExport} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Export →'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="badge badge-do">Exported</span>
            <button className="btn btn-ghost" onClick={handleExport} disabled={loading}>Regenerate</button>
          </div>
        )}

        {error && <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      </div>

      {done && (
        <div style={{ display: 'flex', gap: 12 }}>
          <a
            className="btn btn-ghost btn-lg"
            href={`/api/projects/${project.id}/export/html`}
            download="site.html"
          >
            ↓ Download HTML
          </a>
          <a
            className="btn btn-ghost btn-lg"
            href={`/api/projects/${project.id}/export/pdf`}
            download="site.pdf"
          >
            ↓ Download PDF
          </a>
        </div>
      )}
    </div>
  );
}
