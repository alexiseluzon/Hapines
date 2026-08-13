import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId' as never) as string | undefined;

  if (err instanceof AppError) {
    logger.warn(err.message, { code: err.code, requestId });
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.statusCode as 400 | 401 | 404 | 429 | 500
    );
  }

  if (err instanceof ZodError) {
    logger.warn('Validation failed', { issues: err.issues, requestId });
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.issues } },
      400
    );
  }

  logger.error(err.message, { stack: err.stack, requestId });
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, 500);
};