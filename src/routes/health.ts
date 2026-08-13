import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export const healthRoute = new Hono().get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch {
    return c.json({ status: 'degraded', db: 'unreachable', time: new Date().toISOString() }, 503);
  }
});