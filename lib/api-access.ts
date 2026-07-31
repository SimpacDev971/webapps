import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const API_RATE_LIMIT = { windowMs: 60_000, max: 60 };

/**
 * Auth guard for Route Handlers (app/api/**) proxying data to/from a client's
 * backend (e.g. DocuWare). Route Handlers aren't covered by requireAppAccess()
 * (that's page-only), so every API route touching client data must call this
 * itself — there is no proxy/middleware-level protection for /api routes.
 */
export async function requireApiOrgAccess(
  clientSlug: string,
  request: NextRequest,
) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`api:${clientSlug}:${ip}`, API_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      ),
    } as const;
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: clientSlug },
  });

  const membership =
    organization &&
    (await prisma.member.findFirst({
      where: { userId: session.user.id, organizationId: organization.id },
    }));

  if (!organization || !membership) {
    return {
      session,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { session, response: null } as const;
}
