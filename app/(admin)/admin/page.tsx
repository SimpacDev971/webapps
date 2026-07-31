import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

import {
  CreateAppForm,
  CreateOrgAdminForm,
  CreateOrganizationForm,
} from "./admin-forms";

export default async function SuperAdminPage() {
  await requireSuperAdmin();

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      apps: { orderBy: { appSlug: "asc" } },
      _count: { select: { members: true } },
    },
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-900 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Panel super admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Créer des organisations (clients), leurs apps, et leur premier
            administrateur.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nouvelle organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateOrganizationForm />
          </CardContent>
        </Card>

        {organizations.map((organization) => (
          <Card key={organization.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {organization.name}{" "}
                  <span className="font-normal text-zinc-400">
                    ({organization.slug})
                  </span>
                </span>
                <Link
                  href={`/admin/${organization.slug}`}
                  className="text-sm font-normal text-blue-600 hover:underline dark:text-blue-400"
                >
                  Gérer les users →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {organization._count.members} user(s) ·{" "}
                {organization.apps.length} app(s)
                {organization.apps.length > 0 && (
                  <>
                    {" "}
                    :{" "}
                    {organization.apps
                      .map((app) => `${app.clientSlug}/${app.appSlug}`)
                      .join(", ")}
                  </>
                )}
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ajouter une app
                </p>
                <CreateAppForm organizationId={organization.id} />
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Créer l&apos;admin de cette organisation
                </p>
                <CreateOrgAdminForm organizationId={organization.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
