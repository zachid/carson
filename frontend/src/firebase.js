import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const apiKey     = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId  = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId      = import.meta.env.VITE_FIREBASE_APP_ID;

// True when all required env vars are present
export const firebaseConfigured = !!(apiKey && authDomain && projectId && appId);

let auth;
let googleProvider;

if (firebaseConfigured) {
  const app = initializeApp({ apiKey, authDomain, projectId, appId });
  auth          = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
} else {
  // Stub — avoids crashes when env vars aren't set yet
  auth          = null;
  googleProvider = null;
}

export { auth, googleProvider };
