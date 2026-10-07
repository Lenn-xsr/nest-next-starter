import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, redirectFor } from '@/lib/auth/routes';

export function middleware(request: NextRequest) {
  const target = redirectFor(
    request.nextUrl.pathname,
    request.cookies.has(ACCESS_COOKIE),
  );

  return target
    ? NextResponse.redirect(new URL(target, request.url))
    : NextResponse.next();
}

export const config = {
  // Everything except the API proxy, Next internals and static files.
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};