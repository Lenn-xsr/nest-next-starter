/**
 * Email-domain allowlist for Google sign-in.
 *
 * Returns true only when the email's domain matches one of the allowed
 * domains. Pure helper — the allowlist itself comes from ALLOWED_GOOGLE_DOMAINS.
 */
export function isAllowedGoogleDomain(
  email: string,
  allowedDomains: string[],
): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email
    .slice(at + 1)
    .toLowerCase()
    .trim();
  if (!domain) return false;
  return allowedDomains.some((d) => d.trim().toLowerCase() === domain);
}

/** The configured allowlist. Empty means nobody can sign in (fail closed). */
export function allowedGoogleDomains(): string[] {
  return (process.env.ALLOWED_GOOGLE_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}
