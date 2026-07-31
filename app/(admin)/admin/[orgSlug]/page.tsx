import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/require-org-admin";

import { CreateOrgUserForm, UserRow } from "./org-admin-forms";

export default async function OrgAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgSlug } = await params;
  const { q } = await searchParams;

  const { organization } = await requireOrgAdmin(orgSlug);

  const members = await prisma.member.findMany({
    where: {
      organizationId: organization.id,
      ...(q
        ? {
            user: {
              // MySQL's default collation (utf8mb4_*_ci) is already
              // case-insensitive, so no `mode` filter needed (Postgres-only).
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            },
          }
        : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-900 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {organization.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion des users de cette organisation. Un user créé ici a accès à
            toutes les apps de {organization.name}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nouveau user</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateOrgUserForm orgSlug={orgSlug} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="flex gap-2">
              <Input
                type="search"
                name="q"
                placeholder="Rechercher par nom ou email…"
                defaultValue={q ?? ""}
              />
              <Button type="submit" variant="outline">
                Chercher
              </Button>
            </form>

            <Separator />

            {members.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Aucun user trouvé.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      <th className="py-2 pr-4 font-medium">Nom</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Rôle org</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <UserRow
                        key={member.userId}
                        orgSlug={orgSlug}
                        user={{
                          userId: member.userId,
                          name: member.user.name,
                          email: member.user.email,
                          role: member.role,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
