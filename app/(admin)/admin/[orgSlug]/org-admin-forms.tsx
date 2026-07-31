"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createOrgUser, deleteOrgUser, resetOrgUserPassword } from "./actions";

export function CreateOrgUserForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("password", password);
    const result = await createOrgUser(orgSlug, formData);

    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`User "${email}" créé.`);
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="user-name">Nom</Label>
        <Input
          id="user-name"
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          value={email}
          required
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="user-password">Mot de passe initial</Label>
        <Input
          id="user-password"
          type="text"
          value={password}
          required
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le user"}
      </Button>
    </form>
  );
}

type OrgUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export function UserRow({ orgSlug, user }: { orgSlug: string; user: OrgUser }) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Supprimer définitivement "${user.email}" ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setPending(true);
    const result = await deleteOrgUser(orgSlug, user.userId);
    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`User "${user.email}" supprimé.`);
    router.refresh();
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await resetOrgUserPassword(orgSlug, user.userId, newPassword);
    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Mot de passe de "${user.email}" réinitialisé.`);
    setNewPassword("");
    setResetting(false);
  }

  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-700">
      <td className="py-2 pr-4">{user.name}</td>
      <td className="py-2 pr-4">{user.email}</td>
      <td className="py-2 pr-4 text-zinc-500 dark:text-zinc-400">{user.role}</td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setResetting((value) => !value)}
          >
            Reset mdp
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={handleDelete}
          >
            Supprimer
          </Button>
        </div>
        {resetting && (
          <form
            onSubmit={handleResetSubmit}
            className="mt-2 flex items-center gap-2"
          >
            <Input
              type="text"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              required
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-8 w-48"
            />
            <Button type="submit" size="sm" disabled={pending}>
              Valider
            </Button>
          </form>
        )}
      </td>
    </tr>
  );
}
