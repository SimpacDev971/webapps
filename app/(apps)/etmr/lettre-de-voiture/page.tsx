import { requireAppAccess } from "@/lib/app-access";

import DocumentSelector from "./document-selector";

export default async function LettreDeVoiturePage() {
  await requireAppAccess("etmr", "lettre-de-voiture", "/");

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-6">
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-4 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">
          Lettres de voiture ETMR
        </h1>
        <DocumentSelector />
      </div>
    </main>
  );
}
