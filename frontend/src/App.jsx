import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Project from './pages/Project.jsx';

export default function App() {
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Force light mode — app is light-only
  useEffect(() => { document.body.classList.add('light'); }, []);

  return (
    <>
      <header className="app-header">
        {currentProjectId && (
          <button className="btn btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 9 }} onClick={() => setCurrentProjectId(null)}>
            ← Back
          </button>
        )}
        <a className="app-header-logo" href="#" onClick={e => { e.preventDefault(); setCurrentProjectId(null); }}>
          CARSON
        </a>
        <div className="app-header-spacer" />
      </header>

      <main>
        {currentProjectId ? (
          <Project projectId={currentProjectId} onBack={() => setCurrentProjectId(null)} />
        ) : (
          <Dashboard onOpenProject={id => setCurrentProjectId(id)} />
        )}
      </main>
    </>
  );
}
