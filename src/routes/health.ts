import { Hono } from 'hono';
import { query } from '../lib/db.js';

export const healthRoute = new Hono().get('/', async (c) => {
  try {
    await query('SELECT 1');
    return c.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch {
    return c.json({ status: 'degraded', db: 'unreachable', time: new Date().toISOString() }, 503);
  }
});