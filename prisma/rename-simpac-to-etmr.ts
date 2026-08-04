import { hashPassword } from "better-auth/crypto";

import { prisma } from "../lib/prisma";

// One-off migration: renames the "simpac" tenant to "etmr" in place (org,
// app, and the existing admin login) instead of seeding a brand-new tenant.
// Run once with `npx tsx prisma/rename-simpac-to-etmr.ts`, then delete this file.
async function main() {
  const newEmail = process.env.RENAME_ADMIN_EMAIL ?? "trans.etm@orange.fr";
  const newPassword = process.env.RENAME_ADMIN_PASSWORD;
  if (!newPassword) {
    throw new Error("Set RENAME_ADMIN_PASSWORD before running this script.");
  }

  const organization = await prisma.organization.update({
    where: { slug: "simpac" },
    data: { slug: "etmr", name: "ETMR" },
  });

  await prisma.app.update({
    where: {
      clientSlug_appSlug: { clientSlug: "simpac", appSlug: "lettre-de-voiture" },
    },
    data: { clientSlug: "etmr" },
  });

  const membership = await prisma.member.findFirstOrThrow({
    where: { organizationId: organization.id, role: "owner" },
    include: { user: true },
  });

  const user = await prisma.user.update({
    where: { id: membership.userId },
    data: { name: "Admin ETMR", email: newEmail },
  });

  const hashedPassword = await hashPassword(newPassword);
  await prisma.account.updateMany({
    where: { userId: user.id, providerId: "credential" },
    data: { password: hashedPassword },
  });

  console.log("Renamed simpac -> etmr:", {
    organization: organization.slug,
    app: "etmr/lettre-de-voiture",
    adminEmail: newEmail,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
