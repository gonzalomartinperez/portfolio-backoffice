import { type NextRequest, NextResponse } from "next/server";

// The root layout cannot read search params, so the proxy forwards a validated `?locale=` as a
// request header (always set or removed here, so a client cannot inject it) for `<html lang>`.
export const localeHeader = "x-backoffice-locale";
export const nonceHeader = "x-nonce";

// Strict CSP with a per-request nonce (ADR 0015). Next reads the nonce from the request CSP
// header while rendering and stamps it on its framework scripts and inline styles. Script
// execution needs the nonce ('strict-dynamic' trusts what those scripts load). React `style`
// attributes cannot carry a nonce, so only the attribute channel allows inline styles.
export function contentSecurityPolicy(nonce: string, options: { secure: boolean; dev: boolean }) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.dev ? " 'unsafe-eval'" : ""}`,
    // The Next dev overlay injects nonce-less <style>; a nonce would disable 'unsafe-inline'.
    options.dev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// HTTPS comes from the configured public origin (or an https request URL). A caller-supplied
// X-Forwarded-Proto is not trusted: a client could otherwise force HSTS on an http origin.
function isSecure(request?: NextRequest) {
  return (
    process.env.BACKOFFICE_ORIGIN?.startsWith("https:") === true ||
    request?.nextUrl.protocol === "https:"
  );
}

export function proxy(request?: NextRequest) {
  const forwarded = new Headers(request?.headers);
  const query = request?.nextUrl.searchParams.get("locale");
  if (query === "en" || query === "es") forwarded.set(localeHeader, query);
  else forwarded.delete(localeHeader);
  const secure = isSecure(request);
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce, {
    secure,
    dev: process.env.NODE_ENV === "development",
  });
  forwarded.set(nonceHeader, nonce);
  forwarded.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set("Content-Security-Policy", policy);
  if (secure)
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Next keeps a Referrer-Policy that is already present, so the invitation landing (which carries
  // a bearer token in its URL) must get no-referrer here, not only in its handler.
  response.headers.set(
    "Referrer-Policy",
    request?.nextUrl.pathname === "/access/invitation"
      ? "no-referrer"
      : "strict-origin-when-cross-origin",
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
