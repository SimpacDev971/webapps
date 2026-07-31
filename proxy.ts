import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth enforcement (session + per-app/per-page config) lives in requireAppAccess(),
// called from each page.tsx — not here. Proxy runs on every request including
// prefetches, so it intentionally avoids DB-backed checks (see Next.js Data Access
// Layer guidance). This file is currently just an extension point for future
// rewrites/redirects (e.g. custom domains per client) — it exists mainly so the
// matcher excludes system paths from any future proxy logic.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
