# Simpac WebApps

Plateforme unique hébergeant les applications web clients, sous la forme
`BASE_URL/<client>/<app>`. L'authentification (Better Auth) est activable ou
non par client, par app, et par page — configurée en base plutôt que dans le
code.

Stack : Next.js (App Router) · React · Tailwind · shadcn/ui · Better Auth ·
Prisma · PostgreSQL.

## Démarrage local

Pas de base de données locale : même en dev, `DATABASE_URL` pointe vers un
Postgres distant (cloud). Le plus rapide pour tester sans rien installer :

```bash
npx create-db --ttl 24h
```

Ça crée une base Postgres temporaire (Prisma Postgres) et affiche une
`connectionString` à coller dans `DATABASE_URL` (`.env`). Pour une base
durable, utiliser plutôt un vrai fournisseur (Neon, Supabase, ou le Postgres
de l'hébergement Plesk cible — voir [Déploiement](#déploiement-plesk)).

1. Copier `.env.example` vers `.env` (ou générer `.env` via `create-db`
   ci-dessus), ajuster `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`, et renseigner
   les identifiants DocuWare (`DW_*`, voir plus bas) si vous testez
   `simpac/lettre-de-voiture`.
2. Installer les dépendances et pousser le schéma :

   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

   Le seed crée l'organisation `simpac`, un utilisateur admin
   (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, défaut
   `admin@simpac.fr` / `ChangeMe123!`), et l'app `simpac/lettre-de-voiture`
   (protégée).

3. Lancer le serveur de dev :

   ```bash
   npm run dev
   ```

4. Tester : [http://localhost:3000/simpac/lettre-de-voiture](http://localhost:3000/simpac/lettre-de-voiture)
   redirige vers `/sign-in` si non connecté ; se connecter avec le compte
   admin seedé pour y accéder.

## App `simpac/lettre-de-voiture`

Interface de sélection de demandes de livraison DocuWare, génération de
lettres de voiture pré-remplies (formulaire DocuWare embarqué en iframe) et
calcul de distance entre communes de Guadeloupe.

- `lib/docuware.ts` — client REST DocuWare (auth par mot de passe, token mis
  en cache en mémoire ~50 min). **Ne contient aucun identifiant en dur** :
  toutes les valeurs viennent de `DW_PLATFORM_URL`, `DW_USERNAME`,
  `DW_PASSWORD`, `DW_ARMOIRE_TRANSPORT` (obligatoires, l'app lève une erreur
  explicite si l'une manque plutôt que de retomber sur une valeur par
  défaut).
- `lib/distances.ts` — table statique des distances entre communes
  (aucune donnée sensible).
- `app/api/simpac/lettre-de-voiture/{documents,document,distances}/route.ts`
  — routes proxy vers DocuWare, protégées par `requireApiOrgAccess("simpac")`
  (`lib/api-access.ts`). Important : ces routes ne sont **pas** couvertes par
  `requireAppAccess()` (qui ne protège que les pages) — toute nouvelle route
  API exposant des données client doit appeler ce guard elle-même.
- `app/(apps)/simpac/lettre-de-voiture/document-selector.tsx` — composant
  client, aucune donnée sensible côté navigateur (les appels DocuWare
  passent par les routes API ci-dessus, jamais directement depuis le
  navigateur).

## Ajouter un nouveau client / une nouvelle app

1. Créer le dossier de routes `app/(apps)/<client>/<app>/` avec ses
   `page.tsx`. Chaque page doit appeler `requireAppAccess(clientSlug, appSlug,
   pagePath)` (voir `lib/app-access.ts`) en tout premier — c'est ce qui
   applique la config d'auth stockée en base. Ne pas mettre cet appel dans un
   `layout.tsx` : les layouts ne se ré-exécutent pas à chaque navigation
   côté client dans l'App Router, seules les pages le font de façon fiable.
2. Créer l'organisation (client) et l'app en base — via `prisma/seed.ts`
   (à dupliquer/étendre) ou directement via `npx prisma studio`. Pour
   qu'une page précise déroge à la config globale de l'app (ex: une page
   d'impression publique dans une app par ailleurs protégée), ajouter une
   ligne `AppPage` avec son `pathPattern` (`/print`, ou `/public/*` pour un
   préfixe) et son `authRequired`.
3. Ajouter les `Member` nécessaires pour donner accès aux bonnes personnes
   si l'app est protégée.
4. Si l'app expose des routes API (`app/api/<client>/<app>/.../route.ts`)
   vers un système tiers (comme DocuWare pour `lettre-de-voiture`), protéger
   chacune explicitement avec un guard équivalent à `requireApiOrgAccess`
   (`lib/api-access.ts`) — les routes API ne passent pas par
   `requireAppAccess()`.

Pas d'UI d'admin pour l'instant (gestion via Prisma Studio / scripts) — à
prévoir plus tard si le rythme de création augmente.

## Commandes utiles

| Commande            | Effet                                             |
| -------------------- | -------------------------------------------------- |
| `npm run dev`         | Serveur de développement                           |
| `npm run build`       | Build de production                                |
| `npm run db:push`     | Applique le schéma Prisma à la base (sans migration) |
| `npm run db:migrate`  | Crée/applique une migration Prisma versionnée       |
| `npm run db:seed`     | Rejoue `prisma/seed.ts`                            |
| `npm run db:studio`   | Ouvre Prisma Studio                                |

## Déploiement (Plesk)

Cible : hébergement Plesk avec l'extension Node.js (Phusion Passenger), sur
un serveur classique (pas de fonctions serverless) — donc pas de config
`output: "standalone"` ni de contraintes edge runtime à gérer, contrairement
à un déploiement Vercel.

1. Dans Plesk (extension Node.js) : définir la racine de l'application sur ce
   dossier, la commande de build sur `npm run build`, et la commande de
   démarrage sur `npm start` (= `next start`, sert sur le port fourni par
   Plesk via la variable `PORT`).
2. Configurer les variables d'environnement dans l'interface Plesk :
   `DATABASE_URL` (Postgres cloud — soit le Postgres fourni par
   l'hébergement Plesk lui-même, soit un fournisseur externe type Neon/
   Supabase), `BETTER_AUTH_SECRET` (générer avec `openssl rand -base64 32`),
   `BETTER_AUTH_URL` (URL publique de prod).
3. Après le premier déploiement, exécuter une fois `npm run db:push` (ou
   `db:migrate deploy` si vous passez aux migrations versionnées) et
   `npm run db:seed` avec `DATABASE_URL` pointé sur la base de prod.
4. Passenger route déjà tout le trafic HTTP(S) vers l'app Node — pas de proxy
   inverse supplémentaire à écrire pour le routing `/<client>/<app>`, c'est
   Next.js qui s'en charge nativement.

## Notes techniques

- **`proxy.ts`** (pas `middleware.ts` — renommé en Next.js 16) ne fait que du
  passthrough avec un matcher excluant les chemins système. Il ne doit pas
  contenir de logique d'auth basée sur la base de données : Proxy tourne sur
  chaque requête, y compris les prefetch, et Next.js recommande d'y garder
  uniquement des vérifications de cookie. La vérification réelle (session +
  appartenance à l'organisation + config `authRequired` par page) vit dans
  `requireAppAccess()`, appelée depuis chaque `page.tsx`.
- **Client = Organization** (plugin `organization` de Better Auth). Un
  `Member` donne accès à toutes les apps du client correspondant.
- Le client Prisma est généré dans `lib/generated/prisma` (nouveau générateur
  `prisma-client` de Prisma 6+), pas dans `node_modules/@prisma/client`.
