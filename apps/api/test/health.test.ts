import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 8787,
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
    GEMINI_API_KEY: 'test-key',
    UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    CORS_ORIGIN: 'http://localhost:5173',
    CRON_SECRET: 'test-cron-secret',
  },
}));

const executeMock = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const findManyMock = vi.fn().mockResolvedValue([]);
const deleteReturningMock = vi.fn().mockResolvedValue([]);
const deleteMock = vi.fn().mockReturnValue({
  where: vi.fn().mockReturnValue({ returning: deleteReturningMock }),
});

vi.mock('../src/db/index.js', () => ({
  db: {
    execute: executeMock,
    insert: insertMock,
    delete: deleteMock,
    query: {
      messages: { findMany: findManyMock },
    },
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
  redis: { ping: vi.fn().mockResolvedValue('PONG') },
}));

const generateContentMock = vi.fn().mockResolvedValue({ text: 'Thanks for sharing that.' });

vi.mock('../src/lib/gemini.js', () => ({
  gemini: { models: { generateContent: generateContentMock } },
  GEMINI_MODEL: 'gemini-3.6-flash',
}));

const { app } = await import('../src/app.js');

beforeEach(() => {
  findManyMock.mockClear().mockResolvedValue([]);
  generateContentMock.mockClear().mockResolvedValue({ text: 'Thanks for sharing that.' });
  deleteReturningMock.mockClear().mockResolvedValue([]);
});

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

  it('returns a reply and a sessionId on success', async () => {
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How are you?' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('Thanks for sharing that.');
    expect(typeof body.sessionId).toBe('string');
  });

  it('generates a new sessionId when none is provided', async () => {
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' }),
    });
    const body = await res.json();
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    // No existing session -> no history lookup performed.
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('loads prior history for an existing session and forwards it to Gemini', async () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';
    findManyMock.mockResolvedValueOnce([
      { role: 'user', content: 'I had a rough morning' },
      { role: 'assistant', content: 'Sorry to hear that. Want to talk about it?' },
    ]);

    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'It got better later', sessionId }),
    });

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledTimes(1);

    const call = generateContentMock.mock.calls[0][0];
    // System prompt is always attached.
    expect(call.config.systemInstruction).toContain('Hapines');
    // History + new message are all forwarded, in order, with roles mapped correctly.
    expect(call.contents).toEqual([
      { role: 'user', parts: [{ text: 'I had a rough morning' }] },
      { role: 'model', parts: [{ text: 'Sorry to hear that. Want to talk about it?' }] },
      { role: 'user', parts: [{ text: 'It got better later' }] },
    ]);
  });

  it('returns 500 when the Gemini call fails', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('upstream timeout'));

    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toMatch(/temporarily unavailable/i);
  });
});

describe('GET /internal/cleanup', () => {
  it('rejects requests without a valid bearer token', async () => {
    const res = await app.request('/internal/cleanup');
    expect(res.status).toBe(401);
  });

  it('rejects requests with the wrong token', async () => {
    const res = await app.request('/internal/cleanup', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    expect(res.status).toBe(401);
  });

  it('deletes old messages and reports the count when authorized', async () => {
    deleteReturningMock.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);

    const res = await app.request('/internal/cleanup', {
      headers: { authorization: 'Bearer test-cron-secret' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedCount).toBe(2);
    expect(deleteMock).toHaveBeenCalled();
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