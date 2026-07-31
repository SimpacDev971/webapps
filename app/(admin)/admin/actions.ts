"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

type ActionResult = { error?: string };

export async function createOrganization(formData: FormData): Promise<ActionResult> {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!name || !slug) {
    return { error: "Nom et slug requis." };
  }

  try {
    await prisma.organization.create({ data: { name, slug } });
    return {};
  } catch {
    return { error: "Ce slug est déjà utilisé." };
  }
}

export async function createApp(formData: FormData): Promise<ActionResult> {
  await requireSuperAdmin();

  const organizationId = String(formData.get("organizationId") ?? "");
  const appSlug = String(formData.get("appSlug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const authRequired = formData.get("authRequired") === "on";

  if (!organizationId || !appSlug || !name) {
    return { error: "Champs manquants." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) {
    return { error: "Organisation introuvable." };
  }

  try {
    await prisma.app.create({
      data: {
        organizationId,
        clientSlug: organization.slug,
        appSlug,
        name,
        authRequired,
      },
    });
    return {};
  } catch {
    return { error: "Cette app existe déjà pour cette organisation." };
  }
}

export async function createOrgAdmin(formData: FormData): Promise<ActionResult> {
  const { headers: requestHeaders } = await requireSuperAdmin();

  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!organizationId || !name || !email || !password) {
    return { error: "Champs manquants." };
  }

  let userId: string;
  try {
    const { user } = await auth.api.createUser({
      headers: requestHeaders,
      body: { email, password, name, role: "orgadmin" },
    });
    userId = user.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Création du user échouée.",
    };
  }

  try {
    await auth.api.addMember({
      body: { organizationId, userId, role: "admin" },
    });
  } catch (error) {
    await auth.api.removeUser({ headers: requestHeaders, body: { userId } });
    return {
      error: error instanceof Error ? error.message : "Ajout à l'organisation échoué.",
    };
  }

  return {};
}
