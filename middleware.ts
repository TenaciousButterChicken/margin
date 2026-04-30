import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes Supabase auth cookies on every request AND gates anonymous
// access. Anyone not signed in who tries to visit a non-public path is
// bounced to /sign-in with a `next` param so post-sign-in flow can
// return them to where they were headed.
//
// Public paths (no auth required):
//   /                     - landing/home
//   /sign-in, /sign-up    - auth flow
//   /awaiting-approval    - holding pen for pending users
//   /access-denied        - rejected-user dead-end
//   /api/*                - route handlers self-gate (RLS or per-route checks)
//
// Status (pending / rejected) is enforced at the page or API-route level,
// not here. Pending users can browse so we still capture their time-on-page
// for the dashboard - their writes just no-op via RLS.

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/sign-in",
  "/sign-up",
  "/awaiting-approval",
  "/access-denied",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (!user && !isPublic(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|woff2?)$).*)"],
};
