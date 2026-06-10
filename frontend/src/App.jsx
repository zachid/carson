import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Project from './pages/Project.jsx';

// ── User avatar + sign-out ────────────────────────────────────────────────────
function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: '1px solid var(--border-md)',
          cursor: 'pointer', padding: '4px 10px 4px 6px', height: 32,
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
      >
        {/* Avatar */}
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || ''}
            style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName || user.email}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.4 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-md)',
            minWidth: 200, padding: '6px 0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {user.displayName || 'User'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{user.email}</div>
            </div>
            <button
              onClick={() => { signOut(); setOpen(false); }}
              style={{
                width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Inner app (shown only when authenticated) ─────────────────────────────────
function AppInner() {
  const { user, loading } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Force light mode
  useEffect(() => { document.body.classList.add('light'); }, []);

  // Splash while Firebase resolves auth state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          Loading…
        </div>
      </div>
    );
  }

  // Not signed in → show login screen
  if (!user) return <Login />;

  // Signed in → show app
  return (
    <>
      <header className="app-header">
        {currentProjectId && (
          <button
            className="btn btn-ghost"
            style={{ height: 28, padding: '0 10px', fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 4 }}
            onClick={() => setCurrentProjectId(null)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
        )}
        <a className="app-header-logo" href="#" onClick={e => { e.preventDefault(); setCurrentProjectId(null); }}>
          CARSON
        </a>
        <div className="app-header-spacer" />
        <UserMenu />
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

// ── Root export (wraps with AuthProvider) ─────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
