import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider, firebaseConfigured } from '../firebase.js';

const AuthContext = createContext(null);

// ── Shown when VITE_FIREBASE_* env vars are missing ───────────────────────────
function MissingConfigScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: "'Manrope', sans-serif", padding: 24,
    }}>
      <div style={{
        width: 440, background: 'var(--bg-card)', border: '1px solid var(--border-md)',
        padding: '36px 32px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: 12 }}>
          Setup required
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 20 }}>
          Firebase not configured
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 24 }}>
          Create <code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 6px', border: '1px solid var(--border-md)' }}>frontend/.env.local</code> with your Firebase web app credentials:
        </p>
        <pre style={{
          fontSize: 11, lineHeight: 1.8, background: 'var(--bg)',
          border: '1px solid var(--border-md)', padding: '14px 16px',
          color: 'var(--text-2)', fontFamily: 'monospace', whiteSpace: 'pre-wrap',
          marginBottom: 20,
        }}>{`VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=carson-app-cf3f7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=carson-app-cf3f7
VITE_FIREBASE_APP_ID=1:123...`}</pre>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Find these in <strong>Firebase Console → Project Settings → Your Apps → Web app config</strong>.
          Then restart the dev server.
        </p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!firebaseConfigured) { setLoading(false); return; }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!firebaseConfigured) return;
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Sign-in failed. Please try again.');
        console.error(err);
      }
    }
  };

  const signOut = () => firebaseConfigured && firebaseSignOut(auth);

  // Show setup guide instead of crashing when env vars are missing
  if (!firebaseConfigured) return <MissingConfigScreen />;

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
