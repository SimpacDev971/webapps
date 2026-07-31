import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Matches a stored path pattern against the current in-app path.
 * "/print" matches only "/print". "/public/*" matches "/public" and anything under it.
 */
function matchesPattern(pattern: string, path: string) {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === pattern;
}

/**
 * Authoritative auth + authorization check for a client/app page. Call this at
 * the top of every page.tsx under app/(apps)/<client>/<app>/ — not in layout.tsx,
 * since layouts aren't re-evaluated on every client-side navigation in the App
 * Router (see Next.js Data Access Layer guidance).
 *
 * Resolves whether auth is required for this exact page (AppPage override, else
 * the App default), and if so, verifies the session and organization membership.
 */
export async function requireAppAccess(
  clientSlug: string,
  appSlug: string,
  pagePath: string = "/",
) {
  // Reading headers() opts this route out of static prerendering: the DB-driven
  // auth config below must always be evaluated per-request, never cached/built once.
  const requestHeaders = await headers();

  const app = await prisma.app.findUnique({
    where: { clientSlug_appSlug: { clientSlug, appSlug } },
    include: { pages: true },
  });

  if (!app) {
    notFound();
  }

  const pageOverride = app.pages.find((page) =>
    matchesPattern(page.pathPattern, pagePath),
  );
  const authRequired = pageOverride
    ? pageOverride.authRequired
    : app.authRequired;

  if (!authRequired) {
    return { session: null, app };
  }

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    const callbackURL = `/${clientSlug}/${appSlug}${pagePath === "/" ? "" : pagePath}`;
    redirect(`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`);
  }

  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId: app.organizationId },
  });

  if (!membership) {
    redirect("/sign-in?error=forbidden");
  }

  return { session, app };
}
