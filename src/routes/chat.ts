import { Hono } from 'hono';
import { z } from 'zod';
import { gemini, GEMINI_MODEL } from '../lib/gemini.js';
import { Errors } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const chatRoute = new Hono().post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) throw Errors.badRequest('Invalid JSON body');

  const { message } = chatSchema.parse(body);

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: message,
    });

    const text = response.text ?? '';

    return c.json({ reply: text });
  } catch (err) {
    logger.error('Gemini API call failed', { error: (err as Error).message });
    throw Errors.internal('AI service temporarily unavailable');
  }
});