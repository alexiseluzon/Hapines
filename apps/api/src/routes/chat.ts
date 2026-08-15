import { Hono } from 'hono';
import { z } from 'zod';
import { gemini, GEMINI_MODEL } from '../lib/gemini.js';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { chatRateLimit } from '../lib/ratelimit.js';

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const chatRoute = new Hono().post('/', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const { success, limit, remaining, reset } = await chatRateLimit.limit(ip);
  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(remaining));

  if (!success) {
    const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    c.header('Retry-After', String(retryAfterSeconds));
    throw Errors.rateLimited(`Too many requests. Try again in ${retryAfterSeconds}s.`);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) throw Errors.badRequest('Invalid JSON body');

  const { message } = chatSchema.parse(body);

  await db.insert(messages).values({ role: 'user', content: message });

  let reply: string;
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: message,
    });
    reply = response.text ?? '';
  } catch (err) {
    logger.error('Gemini API call failed', { error: (err as Error).message });
    throw Errors.internal('AI service temporarily unavailable');
  }

  await db.insert(messages).values({ role: 'assistant', content: reply });

  return c.json({ reply });
});