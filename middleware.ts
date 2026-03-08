import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth/session";

// Paths that don't require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  // iCal feed is token-protected via ?token= query param, not session cookie,
  // so calendar apps (Apple Calendar, Google Calendar) can subscribe without a session.
  "/api/calendar/ical",
  // Next.js internals
  "/_next",
  "/favicon.ico",
  "/favicon.svg",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySession(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
