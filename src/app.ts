import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './lib/env.js';
import { requestId } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRoute } from './routes/health.ts';
import { chatRoute } from './routes/chat.js';

export const app = new Hono();

app.use('*', requestId);
app.use('*', secureHeaders());
app.use('*', cors({ origin: env.CORS_ORIGIN, allowMethods: ['GET', 'POST', 'OPTIONS'] }));

app.route('/health', healthRoute);
app.route('/chat', chatRoute);

app.onError(errorHandler);
app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));