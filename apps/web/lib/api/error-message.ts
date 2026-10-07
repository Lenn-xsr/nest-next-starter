import { ApiError } from './client';

/** Friendly copy for the error codes a user can actually run into. */
const MESSAGES: Record<string, string> = {
  ADMIN_DOMAIN_NOT_ALLOWED: 'This email domain is not allowed to sign in.',
  ADMIN_USER_NOT_REGISTERED:
    'This account has not been invited yet. Ask a team member to invite you.',
  ADMIN_USER_INACTIVE: 'This account has been deactivated.',
  ADMIN_ALREADY_EXISTS: 'Someone with this email is already on the team.',
  ADMIN_LAST_ACTIVE: 'The last active team member cannot be deactivated.',
  ADMIN_SELF_DEACTIVATION: 'You cannot deactivate your own account.',
  AUTH_FAILED: 'Sign-in failed. Please try again.',
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.type] ?? error.message;
  }

  return 'Something went wrong. Please try again.';
}