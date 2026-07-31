"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/require-org-admin";

type ActionResult = { error?: string };

async function assertMemberOfOrg(userId: string, organizationId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId, organizationId },
  });
  if (!membership) {
    throw new Error("Ce user n'appartient pas à cette organisation.");
  }
}

export async function createOrgUser(
  orgSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  const { organization, headers: requestHeaders } = await requireOrgAdmin(orgSlug);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Champs manquants." };
  }

  let userId: string;
  try {
    const { user } = await auth.api.createUser({
      headers: requestHeaders,
      body: { email, password, name, role: "user" },
    });
    userId = user.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Création du user échouée.",
    };
  }

  try {
    await auth.api.addMember({
      body: { organizationId: organization.id, userId, role: "member" },
    });
  } catch (error) {
    await auth.api.removeUser({ headers: requestHeaders, body: { userId } });
    return {
      error: error instanceof Error ? error.message : "Ajout à l'organisation échoué.",
    };
  }

  return {};
}

export async function deleteOrgUser(
  orgSlug: string,
  userId: string,
): Promise<ActionResult> {
  const { organization, headers: requestHeaders } = await requireOrgAdmin(orgSlug);

  try {
    await assertMemberOfOrg(userId, organization.id);
    await auth.api.removeUser({ headers: requestHeaders, body: { userId } });
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Suppression échouée.",
    };
  }
}

export async function resetOrgUserPassword(
  orgSlug: string,
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const { organization, headers: requestHeaders } = await requireOrgAdmin(orgSlug);

  try {
    await assertMemberOfOrg(userId, organization.id);
    await auth.api.setUserPassword({
      headers: requestHeaders,
      body: { newPassword, userId },
    });
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Réinitialisation échouée.",
    };
  }
}
