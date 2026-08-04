import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

// Creates the "etmr" client tenant (org + app + owner login) alongside the
// existing "simpac" one. Run once with `npx tsx prisma/seed-etmr.ts`.
// Unlike prisma/seed.ts, this user is NOT promoted to platform superadmin —
// it's a regular client login, scoped to the etmr org via Member "owner".
async function main() {
  const adminEmail = process.env.SEED_ETMR_ADMIN_EMAIL ?? "trans.etm@orange.fr";
  const adminPassword = process.env.SEED_ETMR_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("Set SEED_ETMR_ADMIN_PASSWORD before running this script.");
  }

  const organization = await prisma.organization.upsert({
    where: { slug: "etmr" },
    update: {},
    create: {
      name: "ETMR",
      slug: "etmr",
    },
  });

  const app = await prisma.app.upsert({
    where: {
      clientSlug_appSlug: { clientSlug: "etmr", appSlug: "lettre-de-voiture" },
    },
    update: {},
    create: {
      organizationId: organization.id,
      clientSlug: "etmr",
      appSlug: "lettre-de-voiture",
      name: "Lettre de voiture",
      authRequired: true,
    },
  });

  let user = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!user) {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: "Admin ETMR",
        email: adminEmail,
        password: adminPassword,
      },
    });
    user = await prisma.user.findUniqueOrThrow({
      where: { id: signUpResult.user.id },
    });
    console.log(`Created user ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`User ${adminEmail} already exists, skipping creation.`);
  }

  const existingMembership = await prisma.member.findFirst({
    where: { organizationId: organization.id, userId: user.id },
  });

  if (!existingMembership) {
    await prisma.member.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      },
    });
  }

  console.log("Seed complete:", {
    organization: organization.slug,
    app: `${app.clientSlug}/${app.appSlug}`,
    adminEmail,
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
