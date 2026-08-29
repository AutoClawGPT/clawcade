import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes that require auth
const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/", "/login", "/register", "/api/auth", "/api/games", "/api/agents", "/api/rewards", "/skill.md"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // For now, let all dashboard routes through (auth check happens client-side)
    // In production, verify session cookie or token here
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
