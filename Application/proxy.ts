import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Redirect if not loggedin
export function proxy(request: NextRequest) {
  const sessionid = request.cookies.get("sessionid");
  const pathname = request.nextUrl.pathname;

  const isLoginPage = pathname === "/login";
  const isPublic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/api");

  if (!sessionid && !isLoginPage && !isPublic) {
    console.log("Redirecting to /login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (sessionid && isLoginPage) {
    const homeUrl = new URL("/home", request.url)
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}