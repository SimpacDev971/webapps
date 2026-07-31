import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Authoritative guard for the platform-wide /admin panel (create organizations,
 * create apps, create org admins). Only User.role === "superadmin" passes.
 */
export async function requireSuperAdmin() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/sign-in?callbackURL=%2Fadmin");
  }

  if (session.user.role !== "superadmin") {
    redirect("/sign-in?error=forbidden");
  }

  return { session, headers: requestHeaders };
}
