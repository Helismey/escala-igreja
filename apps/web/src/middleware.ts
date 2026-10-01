import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/redefinir-senha',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((path) => pathname === path) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/confirmar') ||
    pathname.startsWith('/api/confirmar') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/calendario') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.js');
  const sessionCookie = request.cookies.get('escala_sess');

  // Se não estiver logado e tentar acessar rota protegida, redireciona para login
  if (!isPublic && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se já estiver logado e tentar acessar login ou cadastro, redireciona para a home
  if (sessionCookie && (pathname === '/login' || pathname === '/cadastro')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
