import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 8787,
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
    GEMINI_API_KEY: 'test-key',
    UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

const executeMock = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const selectMock = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  }),
});

vi.mock('../src/db/index.js', () => ({
  db: {
    execute: executeMock,
    insert: insertMock,
    select: selectMock,
  },
}));

const limitMock = vi.fn().mockResolvedValue({
  success: true,
  limit: 10,
  remaining: 9,
  reset: Date.now() + 60_000,
});

vi.mock('../src/lib/ratelimit.js', () => ({
  chatRateLimit: { limit: limitMock },
}));

const { app } = await import('../src/app.js');

describe('GET /health', () => {
  it('returns ok status when db is reachable', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });

  it('returns 503 when db is unreachable', async () => {
    executeMock.mockRejectedValueOnce(new Error('connection refused'));

    const res = await app.request('/health');
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
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

  it('returns 429 when rate limit exceeded', async () => {
    limitMock.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});

describe('GET /messages', () => {
  it('returns an array of messages', async () => {
    const res = await app.request('/messages');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.messages)).toBe(true);
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