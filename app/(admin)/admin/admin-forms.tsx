"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createApp, createOrgAdmin, createOrganization } from "./actions";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    const result = await createOrganization(formData);

    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`Organisation "${name}" créée.`);
    setName("");
    setSlug("");
    setSlugTouched(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="org-name">Nom du client</Label>
        <Input
          id="org-name"
          value={name}
          required
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            if (!slugTouched) setSlug(slugify(value));
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-slug">Slug (URL)</Label>
        <Input
          id="org-slug"
          value={slug}
          required
          pattern="[a-z0-9-]+"
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer l'organisation"}
      </Button>
    </form>
  );
}

export function CreateAppForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [appSlug, setAppSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [authRequired, setAuthRequired] = useState(true);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData();
    formData.set("organizationId", organizationId);
    formData.set("name", name);
    formData.set("appSlug", appSlug);
    if (authRequired) formData.set("authRequired", "on");
    const result = await createApp(formData);

    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`App "${name}" créée.`);
    setName("");
    setAppSlug("");
    setSlugTouched(false);
    setAuthRequired(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`app-name-${organizationId}`}>Nom de l&apos;app</Label>
        <Input
          id={`app-name-${organizationId}`}
          value={name}
          required
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            if (!slugTouched) setAppSlug(slugify(value));
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`app-slug-${organizationId}`}>Slug (URL)</Label>
        <Input
          id={`app-slug-${organizationId}`}
          value={appSlug}
          required
          pattern="[a-z0-9-]+"
          onChange={(event) => {
            setSlugTouched(true);
            setAppSlug(event.target.value);
          }}
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={authRequired}
          onChange={(event) => setAuthRequired(event.target.checked)}
        />
        Auth requise
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Ajouter l'app"}
      </Button>
    </form>
  );
}

export function CreateOrgAdminForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData();
    formData.set("organizationId", organizationId);
    formData.set("name", name);
    formData.set("email", email);
    formData.set("password", password);
    const result = await createOrgAdmin(formData);

    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`Admin "${email}" créé.`);
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`admin-name-${organizationId}`}>Nom</Label>
        <Input
          id={`admin-name-${organizationId}`}
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`admin-email-${organizationId}`}>Email</Label>
        <Input
          id={`admin-email-${organizationId}`}
          type="email"
          value={email}
          required
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`admin-password-${organizationId}`}>Mot de passe initial</Label>
        <Input
          id={`admin-password-${organizationId}`}
          type="text"
          value={password}
          required
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer l'admin"}
      </Button>
    </form>
  );
}
