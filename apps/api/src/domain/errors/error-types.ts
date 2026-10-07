import { HttpStatus } from '@nestjs/common';

export interface ErrorType {
  type: string;
  title: string;
  status: number;
}

const defineError = (
  type: string,
  title: string,
  status: number,
): ErrorType => ({
  type,
  title,
  status,
});

export const ErrorTypes = {
  AUTH_TOKEN_MISSING: defineError(
    'AUTH_TOKEN_MISSING',
    'Authentication token not provided',
    HttpStatus.UNAUTHORIZED,
  ),
  AUTH_FAILED: defineError(
    'AUTH_FAILED',
    'Authentication failed',
    HttpStatus.UNAUTHORIZED,
  ),
  AUTH_UNAUTHENTICATED: defineError(
    'AUTH_UNAUTHENTICATED',
    'User not authenticated',
    HttpStatus.UNAUTHORIZED,
  ),
  AUTH_REFRESH_FAILED: defineError(
    'AUTH_REFRESH_FAILED',
    'Failed to refresh tokens',
    HttpStatus.UNAUTHORIZED,
  ),

  ADMIN_DOMAIN_NOT_ALLOWED: defineError(
    'ADMIN_DOMAIN_NOT_ALLOWED',
    'This account is not allowed to sign in',
    HttpStatus.FORBIDDEN,
  ),
  ADMIN_USER_NOT_REGISTERED: defineError(
    'ADMIN_USER_NOT_REGISTERED',
    'This account has not been invited',
    HttpStatus.FORBIDDEN,
  ),
  ADMIN_USER_INACTIVE: defineError(
    'ADMIN_USER_INACTIVE',
    'This account is inactive',
    HttpStatus.FORBIDDEN,
  ),

  SESSION_NOT_FOUND: defineError(
    'SESSION_NOT_FOUND',
    'Session not found',
    HttpStatus.NOT_FOUND,
  ),
  ADMIN_NOT_FOUND: defineError(
    'ADMIN_NOT_FOUND',
    'Admin not found',
    HttpStatus.NOT_FOUND,
  ),

  ADMIN_ALREADY_EXISTS: defineError(
    'ADMIN_ALREADY_EXISTS',
    'An admin with this email already exists',
    HttpStatus.CONFLICT,
  ),
  ADMIN_LAST_ACTIVE: defineError(
    'ADMIN_LAST_ACTIVE',
    'Cannot deactivate the last active admin',
    HttpStatus.BAD_REQUEST,
  ),
  ADMIN_SELF_DEACTIVATION: defineError(
    'ADMIN_SELF_DEACTIVATION',
    'You cannot deactivate your own account',
    HttpStatus.BAD_REQUEST,
  ),

  INTERNAL_ERROR: defineError(
    'INTERNAL_ERROR',
    'Internal server error',
    HttpStatus.INTERNAL_SERVER_ERROR,
  ),
} as const;
