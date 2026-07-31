import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ORG_ADMIN_ROLES = ["owner", "admin"];

/**
 * Authoritative guard for /admin/[orgSlug] (per-organization user management).
 * Passes for: a superadmin (platform-wide bypass), or a session whose Member
 * row on this exact organization has role "owner"/"admin". A member of a
 * DIFFERENT organization, or a plain "member" of this one, is redirected.
 */
export async function requireOrgAdmin(orgSlug: string) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect(`/sign-in?callbackURL=${encodeURIComponent(`/admin/${orgSlug}`)}`);
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!organization) {
    notFound();
  }

  if (session.user.role === "superadmin") {
    return { session, organization, headers: requestHeaders };
  }

  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId: organization.id },
  });

  if (!membership || !ORG_ADMIN_ROLES.includes(membership.role)) {
    redirect("/sign-in?error=forbidden");
  }

  return { session, organization, headers: requestHeaders };
}
