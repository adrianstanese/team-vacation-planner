// middleware.ts
// Rate limiting for /api/team endpoint — prevents brute-force ID scanning
// Uses in-memory store with IP-based tracking (resets on cold start, which is fine for edge)

import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60;  // 60 requests per minute per IP

// In-memory rate limit store (per edge instance)
const rateMap = new Map<string, { count: number; resetAt: number }>();

// Clean old entries periodically
function cleanup() {
  const now = Date.now();
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key);
  }
}

export function middleware(request: NextRequest) {
  // Only rate-limit /api/team
  if (!request.nextUrl.pathname.startsWith("/api/team")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const key = `rl:${ip}`;
  let entry = rateMap.get(key);

  // Cleanup every ~100 requests
  if (rateMap.size > 500) cleanup();

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    rateMap.set(key, entry);
  } else {
    entry.count++;
  }

  // Check if over limit
  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  response.headers.set(
    "X-RateLimit-Remaining",
    String(Math.max(0, MAX_REQUESTS - entry.count))
  );
  return response;
}

export const config = {
  matcher: "/api/team/:path*",
};
