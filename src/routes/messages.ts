import { Hono } from 'hono';
import { asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';

export const messagesRoute = new Hono().get('/', async (c) => {
  const rows = await db.select().from(messages).orderBy(asc(messages.createdAt)).limit(100);
  return c.json({ messages: rows });
});