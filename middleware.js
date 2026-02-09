
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || "secret-key-change-in-prod";
const key = new TextEncoder().encode(SECRET_KEY);

export async function middleware(request) {
    const session = request.cookies.get('session')?.value;
    const path = request.nextUrl.pathname;

    // Paths that don't need authentication
    if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/_next') || path.startsWith('/static') || path === '/favicon.ico' || path === '/manifest.json') {
        return NextResponse.next();
    }

    // Verify session
    let isAuthenticated = false;
    if (session) {
        try {
            await jwtVerify(session, key, { algorithms: ["HS256"] });
            isAuthenticated = true;
        } catch (e) {
            isAuthenticated = false;
        }
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api, _next/static, _next/image, favicon.ico, login, register, manifest.json
         */
        '/((?!api|_next/static|_next/image|favicon.ico|login|register|manifest.json).*)',
    ],
};
