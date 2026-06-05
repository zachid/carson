import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// SSE-based stage runner
export function streamStage(projectId, stageNum, { onChunk, onDone, onError }) {
  const controller = new AbortController();

  fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects/${projectId}/run/${stageNum}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
