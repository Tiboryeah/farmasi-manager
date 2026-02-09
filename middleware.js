
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || "secret-key-change-in-prod";
const key = new TextEncoder().encode(SECRET_KEY);

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const session = request.cookies.get('session')?.value;

    // 1. PUBLIC PATHS: Always allow
    const publicPaths = ['/login', '/register', '/manifest.json', '/favicon.ico', '/vercel.svg'];
    const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));

    // Also allow static assets
    if (isPublicPath || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
        return NextResponse.next();
    }

    // 2. VERIFY SESSION
    let isAuthenticated = false;
    if (session) {
        try {
            await jwtVerify(session, key, { algorithms: ["HS256"] });
            isAuthenticated = true;
        } catch (e) {
            isAuthenticated = false;
        }
    }

    // 3. REDIRECTS
    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|vercel.svg|.*\\.png$|.*\\.jpg$|.*\\.webmanifest$).*)'],
};
