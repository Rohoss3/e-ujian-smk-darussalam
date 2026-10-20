import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "smk-eujian-super-secret-jwt-token-2026-vocational";
const TOKEN_COOKIE_NAME = "smk_eujian_token";

interface JwtPayload {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "GURU" | "SISWA" | "PENGAWAS";
  exp?: number;
}

// Edge-compatible JWT verification using Web Crypto API
async function verifyJwtInEdge(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Base64url to Uint8Array for signature
    const sigStr = atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBytes[i] = sigStr.charCodeAt(i);
    }

    const enc = new TextEncoder();
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!isValid) return null;

    // Decode payload
    const payloadJson = decodeURIComponent(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(payloadJson) as JwtPayload;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected route prefixes
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/guru") ||
    pathname.startsWith("/siswa") ||
    pathname.startsWith("/pengawas") ||
    pathname.startsWith("/ujian");

  if (!isProtected) {
    const res = NextResponse.next();
    return applySecurityHeaders(res);
  }

  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;

  // Determine fallback login URL based on route
  const getLoginRedirect = () => {
    if (pathname.startsWith("/admin")) return new URL("/login/admin", req.url);
    if (pathname.startsWith("/guru")) return new URL("/login/guru", req.url);
    if (pathname.startsWith("/pengawas")) return new URL("/login/pengawas", req.url);
    if (pathname.startsWith("/siswa") || pathname.startsWith("/ujian")) return new URL("/login/siswa", req.url);
    return new URL("/login", req.url);
  };

  if (!token) {
    const response = NextResponse.redirect(getLoginRedirect());
    return applySecurityHeaders(response);
  }

  const user = await verifyJwtInEdge(token, JWT_SECRET);
  if (!user) {
    const redirectUrl = getLoginRedirect();
    redirectUrl.searchParams.set("expired", "1");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(TOKEN_COOKIE_NAME);
    return applySecurityHeaders(response);
  }

  // Role-based Access Control
  if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
    const target = user.role === "GURU" ? "/guru" : user.role === "PENGAWAS" ? "/pengawas" : "/siswa";
    return applySecurityHeaders(NextResponse.redirect(new URL(target, req.url)));
  }

  if (pathname.startsWith("/guru") && user.role !== "GURU" && user.role !== "ADMIN") {
    const target = user.role === "PENGAWAS" ? "/pengawas" : "/siswa";
    return applySecurityHeaders(NextResponse.redirect(new URL(target, req.url)));
  }

  if (pathname.startsWith("/pengawas") && user.role !== "PENGAWAS" && user.role !== "ADMIN") {
    const target = user.role === "GURU" ? "/guru" : "/siswa";
    return applySecurityHeaders(NextResponse.redirect(new URL(target, req.url)));
  }

  if (pathname.startsWith("/siswa") && user.role !== "SISWA" && user.role !== "ADMIN") {
    const target = user.role === "GURU" ? "/guru" : "/pengawas";
    return applySecurityHeaders(NextResponse.redirect(new URL(target, req.url)));
  }

  if (pathname.startsWith("/ujian") && user.role !== "SISWA" && user.role !== "ADMIN") {
    return applySecurityHeaders(NextResponse.redirect(new URL("/login/siswa", req.url)));
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)).*)",
  ],
};
