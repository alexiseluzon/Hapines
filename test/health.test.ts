import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 8787,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    GEMINI_API_KEY: 'test-key',
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

const { app } = await import('../src/app.js');

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

describe('POST /chat', () => {
  it('rejects empty message', async () => {
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing body', async () => {
    const res = await app.request('/chat', { method: 'POST' });
    expect(res.status).toBe(400);
  });
});

describe('404 handler', () => {
  it('returns structured 404', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
