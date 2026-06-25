import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require an active (approved) session
const PROTECTED_ROUTES = ["/dashboard", "/task", "/profile", "/admin"];

// Routes only for SPTs
const ADMIN_ROUTES = ["/admin"];

// Routes that logged-in users should not see
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

// Status-gated routes (must be logged in, but don't need active status)
const PENDING_ROUTE = "/pending-approval";
const DECLINED_ROUTE = "/access-declined";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CSRF PROTECTION CHECK ──
  const isApiRoute = pathname.startsWith("/api/");
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);
  const isExcluded = pathname === "/api/auth/login" || pathname === "/api/auth/signup";

  if (isApiRoute && isStateChanging && !isExcluded) {
    const cookieToken = request.cookies.get("csrf-token")?.value;
    const headerToken = request.headers.get("x-csrf-token");

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }
  }

  // Create a response to pass along — needed so @supabase/ssr can set/refresh cookies
  const response = NextResponse.next({ request });

  // Helper to attach CSRF cookie to responses if missing in the request
  const withCsrf = (res: NextResponse) => {
    if (!request.cookies.has("csrf-token")) {
      const csrfToken = crypto.randomUUID();
      res.cookies.set("csrf-token", csrfToken, {
        httpOnly: false, // Must be readable by client JS
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  };

  // Build a server-side Supabase client that reads from/writes to cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          });
        },
      },
    },
  );

  // Refresh session from the cookie (required by @supabase/ssr)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtectedRoute = PROTECTED_ROUTES.some((r) =>
    pathname.startsWith(r),
  );
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((r) =>
    pathname.startsWith(r),
  );
  const isStatusGatedRoute =
    pathname.startsWith(PENDING_ROUTE) || pathname.startsWith(DECLINED_ROUTE);

  // ── 1. No session → redirect to /login for all protected routes ────────────
  if (!session && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return withCsrf(NextResponse.redirect(loginUrl));
  }

  // ── 2. No session → redirect /pending-approval and /access-declined to /login
  if (!session && isStatusGatedRoute) {
    return withCsrf(NextResponse.redirect(new URL("/login", request.url)));
  }

  // ── 3. Logged in → redirect away from /login and /signup ──────────────────
  if (session && isAuthOnlyRoute) {
    return withCsrf(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  // ── 4. Session exists → fetch user profile for status + role checks ────────
  if (session && (isProtectedRoute || isStatusGatedRoute)) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", session.user.id)
      .maybeSingle();

    // ── 4a. No profile yet (race condition on first signup) → let it through
    if (!userProfile) {
      return withCsrf(response);
    }

    const { role, status } = userProfile;

    // ── 4b. Pending user → must be on /pending-approval only
    if (status === "pending" && !pathname.startsWith(PENDING_ROUTE)) {
      return withCsrf(NextResponse.redirect(new URL(PENDING_ROUTE, request.url)));
    }

    // ── 4c. Declined user → must be on /access-declined only
    if (
      (status === "declined" || status === "blacklisted") &&
      !pathname.startsWith(DECLINED_ROUTE)
    ) {
      return withCsrf(NextResponse.redirect(new URL(DECLINED_ROUTE, request.url)));
    }

    // ── 4d. Active user on status pages → redirect to dashboard
    if (status === "active" && isStatusGatedRoute) {
      return withCsrf(NextResponse.redirect(new URL("/dashboard", request.url)));
    }

    // ── 4e. Admin route → must be SPT
    if (isAdminRoute && role !== "SPT") {
      return withCsrf(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
  }

  return withCsrf(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (Next.js image optimisation)
     * - favicon.ico
     * - Public assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
