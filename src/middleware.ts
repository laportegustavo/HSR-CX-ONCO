import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const roleCookie = request.cookies.get('role');
  const isAuth = authCookie?.value === 'true';
  const role = roleCookie?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');

  // If trying to access dashboard (or any other path) without auth, redirect to login
  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If already authenticated and trying to access login page, redirect to dashboard
  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If authenticated but not admin trying to access admin path, redirect to home
  if (isAuth && isAdminPath && role !== 'Administrador' && role !== 'Médico Preceptor') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files like logos)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo-hsr.jpeg|manifest.json).*)',
  ],
};
