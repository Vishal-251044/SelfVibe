/**
 * Route guard (Next.js 16 "proxy", formerly middleware). Runs before a page
 * renders and redirects based on the session hint cookies, so protected pages
 * never flash for signed-out visitors.
 *
 * This is a fast first check only. The cookies it reads grant nothing: the
 * client guards (AuthGuard / StaffGuard) confirm the session with the API, and
 * the API checks every request itself.
 */
import { NextResponse } from "next/server";
import { PROTECTED_APP_PATHS, SESSION_HINT_COOKIES } from "@/utils/constants";

const AUTH_PAGES = ["/login", "/signup"];
const ADMIN_LOGIN = "/admin/login";

/**
 * Whether a path is a page or a sub-page of one of the given roots.
 * @param {string} pathname
 * @param {string[]} roots
 * @returns {boolean}
 */
function matchesAny(pathname, roots) {
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

/**
 * Redirect to a path, remembering where the visitor wanted to go.
 * @param {import("next/server").NextRequest} request
 * @param {string} destination
 * @param {boolean} [keepNext=false] - Add ?next=<original path>
 * @returns {NextResponse}
 */
function redirectTo(request, destination, keepNext = false) {
  const url = new URL(destination, request.url);
  if (keepNext) url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

/**
 * @param {import("next/server").NextRequest} request
 * @returns {NextResponse}
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasUserSession = request.cookies.has(SESSION_HINT_COOKIES.user);
  const hasStaffSession = request.cookies.has(SESSION_HINT_COOKIES.staff);

  // Owner / Admin Console
  if (pathname === ADMIN_LOGIN) {
    return hasStaffSession ? redirectTo(request, "/admin") : NextResponse.next();
  }
  if (matchesAny(pathname, ["/admin"])) {
    return hasStaffSession ? NextResponse.next() : redirectTo(request, ADMIN_LOGIN);
  }

  // Listener app
  if (matchesAny(pathname, PROTECTED_APP_PATHS) && !hasUserSession) {
    return redirectTo(request, "/login", true);
  }
  if (AUTH_PAGES.includes(pathname) && hasUserSession) {
    return redirectTo(request, "/home");
  }

  return NextResponse.next();
}

export const config = {
  // Only page routes that need a decision (never /api, static files or images)
  matcher: [
    "/login",
    "/signup",
    "/home/:path*",
    "/search/:path*",
    "/library/:path*",
    "/playlist/:path*",
    "/artist/:path*",
    "/studio/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
