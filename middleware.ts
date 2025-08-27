import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Add PWA-related headers for all responses
  const response = NextResponse.next();
  
  // Ensure proper headers for PWA navigation
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle PWA-specific routing - avoid redirects that break standalone mode
  if (pathname === '/') {
    // For PWA, we'll let the client-side navigation handle this
    // Server-side redirects can break the PWA standalone mode
    const response = NextResponse.rewrite(new URL('/login', request.url));
    response.headers.set('X-PWA-Rewrite', 'true');
    return response;
  }
  
  // Ensure certain paths are accessible within PWA context
  const pwaProtectedPaths = ['/login', '/student/attendance', '/student'];
  if (pwaProtectedPaths.includes(pathname)) {
    // Add headers to ensure PWA navigation works properly
    response.headers.set('X-PWA-Protected', 'true');
    // Don't add aggressive cache control that might interfere with PWA navigation
    response.headers.set('Cache-Control', 'private, no-cache');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - workbox-* (workbox files)
     * - manifest.json (PWA manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|workbox-.*|manifest.json).*)',
  ],
};
