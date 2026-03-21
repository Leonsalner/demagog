import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit-store";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix: string;
}

const RATE_LIMIT_SEARCH = Number(process.env.RATE_LIMIT_SEARCH) || 60;
const RATE_LIMIT_DETECT = Number(process.env.RATE_LIMIT_DETECT) || 30;
const RATE_LIMIT_ENRICH = Number(process.env.RATE_LIMIT_ENRICH) || 10;

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/search": { limit: RATE_LIMIT_SEARCH, windowMs: 60_000, keyPrefix: "search" },
  "/api/detect": { limit: RATE_LIMIT_DETECT, windowMs: 60_000, keyPrefix: "detect" },
  "/api/sources/enrich": { limit: RATE_LIMIT_ENRICH, windowMs: 60_000, keyPrefix: "enrich" },
};

export async function proxy(request: NextRequest) {
  const path = new URL(request.url).pathname;
  const config = RATE_LIMITS[path];

  if (!config) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const key = `ratelimit:${config.keyPrefix}:${ip}`;
  const result = checkRateLimit(key, config.limit, config.windowMs);

  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: "Too many requests. Please wait before retrying.",
        retry_after: retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(result.reset / 1000)));
  return response;
}

export const config = {
  matcher: ["/api/search", "/api/detect", "/api/sources/enrich"],
};
