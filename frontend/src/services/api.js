// API service helper connecting React frontend to Express backend endpoints

const getApiBase = () => {
  let base = (import.meta.env.VITE_API_BASE_URL || 'https://sourcify-mgde.onrender.com/api').trim().replace(/\/$/, '');
  if (base.startsWith('http') && !base.endsWith('/api')) {
    base += '/api';
  }
  return base;
};
const API_BASE = getApiBase();

async function request(path, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  };

  const res = await fetch(API_BASE + path, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // Auth
  checkAuth: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (name, email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Settings
  updateProfile: (name) => request('/auth/profile', { method: 'PUT', body: JSON.stringify({ name }) }),
  updatePassword: (currentPassword, newPassword) => request('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  // Sessions
  getSessions: () => request('/sessions'),
  createSession: (title) => request('/sessions', { method: 'POST', body: JSON.stringify({ title }) }),
  selectSession: (id) => request(`/sessions/${id}/select`, { method: 'POST' }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),

  // Sources
  getSources: () => request('/sources'),
  ingestSource: (type, url) => request('/sources', { method: 'POST', body: JSON.stringify({ type, url }) }),
  deleteSource: (id) => request(`/sources/${id}`, { method: 'DELETE' }),

  // Reports & Contradictions
  generateReport: () => request('/report', { method: 'POST' }),
  checkContradictions: () => request('/contradictions', { method: 'POST' }),

  // SSE Chat Streaming
  async streamChat(prompt, { onMeta, onToken, onError, onDone }) {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start chat streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            const rawData = line.slice(6);
            try {
              const data = JSON.parse(rawData);
              if (currentEvent === 'meta') {
                if (onMeta) onMeta(data);
              } else if (currentEvent === 'token') {
                if (onToken) onToken(data.text);
              } else if (currentEvent === 'done') {
                if (onDone) onDone(data);
              } else if (currentEvent === 'error') {
                if (onError) onError(new Error(data.message));
              }
            } catch (e) {
              console.error('SSE parse error:', e);
            }
            currentEvent = null;
          }
        }
      }
    } catch (err) {
      if (onError) onError(err);
    }
  },
};
