import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_COOKIE = "ftc-hub-role";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(ROLE_COOKIE)?.value as
    | "mentor"
    | "student"
    | undefined;

  // Server routes (grader proxy, health, etc.) — never gate behind session cookie.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public paths — always allow (redirect to dashboard if already signed in)
  if (
    pathname.startsWith("/signin") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/create-class") ||
    pathname.startsWith("/join-class")
  ) {
    if (role === "mentor") {
      return NextResponse.redirect(new URL("/mentor/dashboard", request.url));
    }
    if (role === "student") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Mentor-only area
  if (pathname.startsWith("/mentor")) {
    if (role !== "mentor") {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    return NextResponse.next();
  }

  // Student/shared area — any authenticated session allowed
  if (!role) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
