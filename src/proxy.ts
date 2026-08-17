import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PROTECTED_PREFIXES = ["/tasks", "/users", "/api/tasks", "/api/users"];
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function withSecurityHeaders(
  response: NextResponse,
  csp: string,
  isHttps: boolean
): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  // Only over an actually-HTTPS connection. Per spec, a browser should
  // ignore HSTS received over plain HTTP - but empirically (verified with
  // Playwright's WebKit, matching the bug report) Safari does not: sending
  // this unconditionally makes Safari force every subsequent request on
  // `localhost` to HTTPS, which has no TLS listener in local dev, so every
  // asset request fails with an SSL error and the page renders unstyled.
  // Gating on the request's real scheme (or `x-forwarded-proto`, set by
  // most reverse proxies/load balancers terminating TLS in front of this
  // app - see the Docker/VM deployment path in the README) avoids ever
  // sending it over a connection that isn't actually secure.
  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains"
    );
  }
  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  // `request.nextUrl.protocol` reflects the scheme Next.js's own server
  // actually received the connection on; `x-forwarded-proto` covers the
  // common case of a reverse proxy/load balancer terminating TLS in front
  // of a plain-HTTP origin (see the HSTS comment on withSecurityHeaders).
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.includes(pathname);

  if (!isProtected && !isAuthOnlyRoute) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
      isHttps
    );
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (isProtected && !session) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        csp,
        isHttps
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl), csp, isHttps);
  }

  // Already-authenticated users don't need the login/signup forms again.
  if (isAuthOnlyRoute && session) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/tasks", request.url)),
      csp,
      isHttps
    );
  }

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
    isHttps
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
