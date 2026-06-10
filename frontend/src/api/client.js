import axios from 'axios';
import { auth } from '../firebase.js';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every request automatically
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// SSE-based stage runner — also attaches auth token
export async function streamStage(projectId, stageNum, { onChunk, onDone, onError, body = {} }) {
  const controller = new AbortController();

  // Get a fresh token for the SSE request
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects/${projectId}/run/${stageNum}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.text();
      onError?.(new Error(err));
      return;
    }

    const reader = res.body.getReader();
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
          if (evt.type === 'done') onDone?.(evt.fullText);
          if (evt.type === 'error') onError?.(new Error(evt.message));
        } catch {}
      }
    }
  }).catch(err => {
    if (err.name !== 'AbortError') onError?.(err);
  });

  return () => controller.abort();
}
