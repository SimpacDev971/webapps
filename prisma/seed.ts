import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@simpac.fr";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const organization = await prisma.organization.upsert({
    where: { slug: "simpac" },
    update: {},
    create: {
      name: "Simpac",
      slug: "simpac",
    },
  });

  const app = await prisma.app.upsert({
    where: {
      clientSlug_appSlug: { clientSlug: "simpac", appSlug: "lettre-de-voiture" },
    },
    update: {},
    create: {
      organizationId: organization.id,
      clientSlug: "simpac",
      appSlug: "lettre-de-voiture",
      name: "Lettre de voiture",
      authRequired: true,
    },
  });

  let user = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!user) {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: "Admin Simpac",
        email: adminEmail,
        password: adminPassword,
      },
    });
    user = await prisma.user.findUniqueOrThrow({
      where: { id: signUpResult.user.id },
    });
    console.log(`Created admin user ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`Admin user ${adminEmail} already exists, skipping creation.`);
  }

  // The seeded admin is always the platform superadmin, whether just created
  // or pre-existing (e.g. after a schema change that introduced User.role).
  if (user.role !== "superadmin") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "superadmin" },
    });
    console.log(`Promoted ${adminEmail} to superadmin.`);
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
