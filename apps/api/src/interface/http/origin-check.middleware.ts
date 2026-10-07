import { Request, Response, NextFunction } from 'express';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Web origins allowed by CORS and by the CSRF origin check. */
export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * CSRF defense for cookie-based auth: reject state-changing requests whose
 * Origin is not an allowed web origin. Non-browser clients (no Origin header)
 * pass; this complements the SameSite flag on the auth cookies.
 */
export function originCheck(origins: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (
      STATE_CHANGING_METHODS.has(req.method) &&
      origin &&
      !origins.includes(origin)
    ) {
      res
        .status(403)
        .setHeader('Content-Type', 'application/problem+json')
        .json({
          type: 'ORIGIN_NOT_ALLOWED',
          title: 'Origin not allowed',
          status: 403,
          detail: null,
          instance: req.url,
        });
      return;
    }

    next();
  };
}
