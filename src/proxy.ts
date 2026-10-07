import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages that need a logged-in user. Role checks (admin, editor) happen in the page layouts. */
const PROTECTED_PREFIXES = ["/my", "/account", "/admin"];
/** Pages that make no sense once logged in. */
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || !URL.canParse(url)) {
    // Supabase not configured (or misconfigured) — never take the whole site down for it.
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Refreshes the session cookie when needed and verifies the token's signature
    // locally (no round trip to Supabase Auth). Do not add logic between
    // createServerClient and getClaims(), or sessions may be dropped at random.
    const { data } = await supabase.auth.getClaims();
    const user = data?.claims ?? null;

    const { pathname } = request.nextUrl;

    if (!user && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user && AUTH_PAGES.includes(pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/my";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  } catch (error) {
    // A broken auth check must not turn every page into a 500; pages re-check access themselves.
    console.error("proxy: session check failed", error);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and files with an extension (images, csv, ics, fonts …).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[A-Za-z0-9]{1,8}$).*)",
  ],
};
