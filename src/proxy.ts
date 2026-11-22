import { type NextRequest, NextResponse } from "next/server";

// The root layout cannot read search params, so the proxy forwards a validated `?locale=` as a
// request header (always set or removed here, so a client cannot inject it) for `<html lang>`.
export const localeHeader = "x-backoffice-locale";

export function proxy(request?: NextRequest) {
  const forwarded = new Headers(request?.headers);
  const query = request?.nextUrl.searchParams.get("locale");
  if (query === "en" || query === "es") forwarded.set(localeHeader, query);
  else forwarded.delete(localeHeader);
  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
