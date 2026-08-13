export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(400, message, 'BAD_REQUEST', details),
  unauthorized: (message = 'Unauthorized') => new AppError(401, message, 'UNAUTHORIZED'),
  notFound: (message = 'Not found') => new AppError(404, message, 'NOT_FOUND'),
  rateLimited: (message = 'Too many requests') => new AppError(429, message, 'RATE_LIMITED'),
  internal: (message = 'Internal server error') => new AppError(500, message, 'INTERNAL_ERROR'),
};