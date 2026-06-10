import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

// Google "G" logo SVG — official colour mark
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle, error } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Manrope', sans-serif",
    }}>
      {/* Card */}
      <div style={{
        width: 407,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-md)',
        padding: '40px 32px 44px',
        position: 'relative',
      }}>

        {/* Top: eyebrow + app name */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--text-2)',
            marginBottom: 6,
          }}>
            Sign In
          </div>
          <div style={{
            fontSize: 18, fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text)',
          }}>
            Carson
          </div>
        </div>

        {/* Middle: welcome + tagline */}
        <div style={{ marginBottom: 52 }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-2)',
            lineHeight: '40px',
          }}>
            Welcome to
          </div>
          <div style={{
            fontSize: 48, fontWeight: 700,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--text)',
            lineHeight: 1.05,
            marginBottom: 10,
          }}>
            Carson
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.4,
          }}>
            AI-powered homepage redesign tool.
          </div>
        </div>

        {/* Google sign-in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: 60,
            background: '#fff',
            border: '1px solid var(--border-md)',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            transition: 'box-shadow 0.15s, border-color 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => {
            if (!loading) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <GoogleLogo />
          <span style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#1a1a1a',
          }}>
            {loading ? 'Signing in…' : 'Continue with Google'}
          </span>
        </button>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12, fontSize: 12,
            color: 'var(--danger)',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
