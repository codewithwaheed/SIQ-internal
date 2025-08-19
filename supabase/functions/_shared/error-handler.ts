// Standardized Error Handling for Edge Functions
// Provides uniform error shapes and security-conscious error responses

export interface StandardError {
  error: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Standard HTTP status codes for consistent responses
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes for frontend handling
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
} as const;

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_ERROR,
  code?: string,
  details?: Record<string, any>,
): Response {
  const error: StandardError = {
    error: message,
    status,
    code,
    details,
  };

  // Security: Don't expose sensitive information in production
  if (Deno.env.get('ENVIRONMENT') === 'production') {
    // Sanitize error messages for production
    if (status === HTTP_STATUS.INTERNAL_ERROR) {
      error.error = 'An internal error occurred. Please try again later.';
      delete error.details;
    }
  }

  console.error('[ERROR_HANDLER]', {
    message,
    status,
    code,
    details,
    timestamp: new Date().toISOString(),
  });

  return new Response(JSON.stringify(error), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

/**
 * Creates a validation error response
 */
export function createValidationError(validationErrors: ValidationError[]): Response {
  return createErrorResponse(
    'Validation failed',
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ERROR_CODES.VALIDATION_FAILED,
    { validationErrors },
  );
}

/**
 * Creates an authentication error response
 */
export function createAuthError(message: string = 'Authentication required'): Response {
  return createErrorResponse(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
}

/**
 * Creates a permission denied error response
 */
export function createPermissionError(message: string = 'Permission denied'): Response {
  return createErrorResponse(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.PERMISSION_DENIED);
}

/**
 * Creates a rate limit error response
 */
export function createRateLimitError(retryAfter: number, remainingRequests: number = 0): Response {
  const response = createErrorResponse(
    'Rate limit exceeded. Please try again later.',
    HTTP_STATUS.TOO_MANY_REQUESTS,
    ERROR_CODES.RATE_LIMITED,
    { retryAfter, remainingRequests },
  );

  // Add rate limit headers
  response.headers.set('Retry-After', retryAfter.toString());
  response.headers.set('X-RateLimit-Remaining', remainingRequests.toString());

  return response;
}

/**
 * Creates a not found error response
 */
export function createNotFoundError(resource: string = 'Resource'): Response {
  return createErrorResponse(`${resource} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
}

/**
 * Creates a database error response
 */
export function createDatabaseError(operation: string = 'Database operation'): Response {
  return createErrorResponse(
    `${operation} failed`,
    HTTP_STATUS.INTERNAL_ERROR,
    ERROR_CODES.DATABASE_ERROR,
  );
}

/**
 * Wraps edge function execution with standardized error handling
 */
export async function withErrorHandler<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[ERROR_HANDLER] ${context || 'Operation'} failed:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Re-throw to let the caller handle with appropriate response
    throw error;
  }
}

/**
 * Validates JWT role and org_id at function entry
 */
export function validateRequest(
  user: any,
  requiredRole?: string,
  orgId?: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!user) {
    errors.push({ field: 'user', message: 'User authentication required' });
    return errors;
  }

  if (!user.id) {
    errors.push({ field: 'user.id', message: 'Valid user ID required' });
  }

  if (requiredRole && user.role !== requiredRole) {
    errors.push({
      field: 'user.role',
      message: `Role '${requiredRole}' required, got '${user.role || 'none'}'`,
    });
  }

  if (orgId && user.org_id !== orgId) {
    errors.push({
      field: 'user.org_id',
      message: 'User does not belong to the required organization',
    });
  }

  return errors;
}

/**
 * Logs function entry and exit for debugging
 */
export function logFunctionExecution(functionName: string, userId?: string, startTime?: number) {
  const duration = startTime ? Date.now() - startTime : 0;

  console.log(`[${functionName}]`, {
    userId,
    duration: duration > 0 ? `${duration}ms` : 'started',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validates input parameters
 */
export function validateInput(data: any, requiredFields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  }

  return errors;
}
