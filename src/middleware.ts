import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Performance headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Cache static assets aggressively
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache API responses with appropriate strategy
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const isDataAPI =
      request.nextUrl.pathname.includes('/dashboard') ||
      request.nextUrl.pathname.includes('/reports') ||
      request.nextUrl.pathname.includes('/team');

    if (isDataAPI) {
      // Short cache for dynamic data
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    } else {
      // No cache for mutations and auth
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }

  // Cache pages appropriately
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  }

  // Preload critical resources
  if (request.nextUrl.pathname === '/') {
    response.headers.set('Link', '</api/dashboard>; rel=prefetch, </api/users>; rel=prefetch');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
