import { Hono } from 'hono';
import { lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import { env } from '../lib/env.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const RETENTION_DAYS = 30;

export const cleanupRoute = new Hono().get('/', async (c) => {
  const authHeader = c.req.header('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    throw Errors.unauthorized();
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deleted = await db.delete(messages).where(lt(messages.createdAt, cutoff)).returning({
    id: messages.id,
  });

  logger.info('Cleanup run complete', { deletedCount: deleted.length, cutoff: cutoff.toISOString() });

  return c.json({ deletedCount: deleted.length });
});