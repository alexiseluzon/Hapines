import { Hono } from 'hono';
import { z } from 'zod';
import { gemini, GEMINI_MODEL } from '../lib/gemini.js';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const chatRoute = new Hono().post('/', async (c) => {
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