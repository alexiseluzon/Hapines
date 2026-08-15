import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env.js';

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

// 10 requests per minute per IP — generous for a demo, tight enough to
// stop a script from burning through the free Gemini quota in seconds.
export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1 m'),
  prefix: 'ratelimit:chat',
});