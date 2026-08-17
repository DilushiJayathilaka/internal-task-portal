import "server-only";

import { headers } from "next/headers";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_TRACKED_KEYS = 5000;

/**
 * Returns true if the action identified by `key` is still within its
 * allowance for the current window, incrementing its count as a side
 * effect. Returns false once `limit` has been reached within `windowMs`.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    if (attempts.size >= MAX_TRACKED_KEYS) {
      for (const [k, v] of attempts) {
        if (v.resetAt <= now) attempts.delete(k);
      }
      if (attempts.size >= MAX_TRACKED_KEYS) return false;
    }
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") ?? "unknown";
}
