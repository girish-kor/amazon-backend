/**
 * Shared error classes
 */

export class ApplicationError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 422);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends ApplicationError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500);
    this.name = 'InternalServerError';
  }
}
