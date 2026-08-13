import { handle } from 'hono/vercel';
import { app } from '../src/app.ts';

export const runtime = 'edge';

export default handle(app);