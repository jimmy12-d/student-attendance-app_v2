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
  
  // Define route protection patterns
  const adminRoutes = ['/dashboard', '/admin'];
  const teacherRoutes = ['/teacher'];
  const studentRoutes = ['/student'];
  const publicRoutes = ['/login', '/'];
  
  // Check if the current path matches any protected route
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isTeacherRoute = teacherRoutes.some(route => pathname.startsWith(route));
  const isStudentRoute = studentRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  
  // For protected routes, add headers to indicate role requirement
  // The actual authentication will be handled client-side
  if (isAdminRoute) {
    response.headers.set('X-Required-Role', 'admin');
    response.headers.set('X-Protected-Route', 'true');
  } else if (isTeacherRoute) {
    response.headers.set('X-Required-Role', 'teacher');
    response.headers.set('X-Protected-Route', 'true');
  } else if (isStudentRoute) {
    response.headers.set('X-Required-Role', 'student');
    response.headers.set('X-Protected-Route', 'true');
  }
  
  // Handle PWA-specific routing - avoid redirects that break standalone mode
  if (pathname === '/') {
    // For PWA, we'll let the client-side navigation handle this
    // Server-side redirects can break the PWA standalone mode
    const response = NextResponse.rewrite(new URL('/login', request.url));
    response.headers.set('X-PWA-Rewrite', 'true');
    return response;
  }
  
  // Ensure certain paths are accessible within PWA context
  const pwaProtectedPaths = ['/login', '/student/attendance', '/student', '/teacher', '/dashboard'];
  if (pwaProtectedPaths.includes(pathname) || pwaProtectedPaths.some(path => pathname.startsWith(path))) {
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
