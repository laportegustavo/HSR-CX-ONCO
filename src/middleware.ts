import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const roleCookie = request.cookies.get('role');
  const isSuperAdminCookie = request.cookies.get('isSuperAdmin');
  const isAuth = authCookie?.value === 'true';
  const role = roleCookie?.value;
  const isSuperAdmin = isSuperAdminCookie?.value === 'true';
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isSuperPath = request.nextUrl.pathname.startsWith('/admin/super');

  // If trying to access dashboard (or any other path) without auth, redirect to login
  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If already authenticated and trying to access login page, redirect to dashboard
  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // SuperAdmin fallback (allow role 'Administrador' if cookie is missing for now)
  if (isSuperPath && !isSuperAdmin && role !== 'Administrador') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If authenticated but not admin trying to access admin path, redirect to home
  if (isAuth && isAdminPath && !isSuperAdmin && role !== 'Administrador') {
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
    '/((?!api|_next/static|_next/image|favicon.ico|santa-casa-logo.png|logo-hsr.jpeg|manifest.json).*)',
  ],
};
