import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "portal_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "USER" | "ADMIN";
};

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_MS / 1000}s`)
    .sign(getSecretKey());
}

async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return { userId: payload.userId, role: payload.role };
  } catch {
    // Expired, tampered, or malformed token - treat as "no session".
    return null;
  }
}

/** Issues a signed session cookie for the given user. Call after a successful login/signup. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/** Clears the session cookie. Call on logout. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Reads and verifies the session cookie for the current request. Returns null if absent/invalid. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
}

/**
 * Reads and verifies a session token directly from a raw cookie string value.
 * Used in proxy.ts, which reads cookies off the request rather than via
 * next/headers.
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  return decryptSession(token);
}

export { SESSION_COOKIE };
