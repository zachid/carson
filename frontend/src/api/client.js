import axios from 'axios';
import { auth, firebaseConfigured } from '../firebase.js';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every axios request automatically
api.interceptors.request.use(async (config) => {
  if (firebaseConfigured && auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken(/* forceRefresh */ false);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn('[auth] getIdToken failed:', err.message);
      // Token unrecoverable — sign out so the user sees the login screen
      try { await auth.signOut(); } catch {}
    }
  }
  return config;
});

export default api;

// SSE-based stage runner
// Returns the abort function synchronously (same API as before)
export function streamStage(projectId, stageNum, { onChunk, onDone, onError, body = {} }) {
  const controller = new AbortController();

  // Kick off async work without making the outer function async
  (async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (firebaseConfigured && auth?.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/projects/${projectId}/run/${stageNum}`,
        { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal }
      );

      if (!res.ok) {
        const err = await res.text();
        onError?.(new Error(err));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'chunk') onChunk?.(evt.text);
            if (evt.type === 'done')  onDone?.(evt.fullText);
            if (evt.type === 'error') onError?.(new Error(evt.message));
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err);
    }
  })();

  return () => controller.abort();
}
