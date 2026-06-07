import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const ROLE_COOKIE = "ftc-hub-role";

const AUTH_PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];
const AUTH_REQUIRED_PATHS = [
  "/onboarding",
  "/signin",
  "/account",
  "/join-class",
  "/create-class",
  "/link-mentor",
];

function isPathMatch(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function refreshAuthSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabase = createServerClient(url || "https://placeholder.supabase.co", key || "placeholder", {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
  return target;
}

function routeGuard(
  request: NextRequest,
  user: User | null,
  sessionResponse: NextResponse
): NextResponse {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(ROLE_COOKIE)?.value as
    | "mentor"
    | "student"
    | undefined;

  if (pathname.startsWith("/api/")) {
    return copyCookies(sessionResponse, NextResponse.next());
  }

  if (isPathMatch(pathname, AUTH_PUBLIC_PATHS)) {
    if (user) {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/onboarding", request.url))
      );
    }
    return copyCookies(sessionResponse, NextResponse.next());
  }

  if (!user && isPathMatch(pathname, AUTH_REQUIRED_PATHS)) {
    return copyCookies(
      sessionResponse,
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  if (!user && pathname === "/") {
    return copyCookies(
      sessionResponse,
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  if (user && pathname === "/") {
    if (role === "mentor") {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/mentor/dashboard", request.url))
      );
    }
    if (role === "student") {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }
    return copyCookies(
      sessionResponse,
      NextResponse.redirect(new URL("/onboarding", request.url))
    );
  }

  if (pathname.startsWith("/mentor")) {
    if (!user) {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/login", request.url))
      );
    }
    if (role !== "mentor") {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/signin", request.url))
      );
    }
    return copyCookies(sessionResponse, NextResponse.next());
  }

  if (pathname.startsWith("/challenges/answer-key")) {
    if (!user) {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/login", request.url))
      );
    }
    if (role !== "mentor") {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/challenges", request.url))
      );
    }
    return copyCookies(sessionResponse, NextResponse.next());
  }

  const isMainApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/challenges") ||
    pathname.startsWith("/playground") ||
    pathname.startsWith("/homework") ||
    pathname.startsWith("/docs");

  if (isMainApp) {
    if (!user) {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/login", request.url))
      );
    }
    if (!role) {
      return copyCookies(
        sessionResponse,
        NextResponse.redirect(new URL("/onboarding", request.url))
      );
    }
    return copyCookies(sessionResponse, NextResponse.next());
  }

  return copyCookies(sessionResponse, NextResponse.next());
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response: sessionResponse, user } = await refreshAuthSession(request);
  return routeGuard(request, user, sessionResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
