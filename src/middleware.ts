import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes that require auth
const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/", "/login", "/register", "/games", "/api", "/skill.md"];

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
    // Auth check happens client-side via localStorage
    // Dashboard layout redirects to /login if no authToken
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
