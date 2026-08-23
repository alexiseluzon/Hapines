import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'assistant']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    role: roleEnum('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_session_id_idx').on(table.sessionId),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;