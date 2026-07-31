import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { admin } from "better-auth/plugins/admin";
import { adminAc, userAc, defaultStatements } from "better-auth/plugins/admin/access";
import { createAccessControl } from "better-auth/plugins/access";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/prisma";

// Org admins need just enough *global* admin-plugin permission to create/delete/
// reset-password their own org's users (auth.api.createUser/removeUser/setUserPassword
// are inherently global operations in Better Auth, not org-scoped). Deliberately NOT
// the full adminAc bundle (no ban/impersonate/set-role/set-email/list) — actual
// per-organization scoping is enforced by our own requireOrgAdmin() check before any
// of these are ever called, this role only bounds the blast radius if that check were
// somehow bypassed or these endpoints called directly.
const orgAdminAc = createAccessControl(defaultStatements).newRole({
  user: ["create", "delete", "set-password"],
});

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Built-in per-IP limiter, in-memory (fine for our single-process VPS deploy).
  // Ships with strict defaults for /sign-in, /sign-up, etc. (3 req/10s) — enabled
  // by default only in production; forced on here so it's also exercised in dev.
  rateLimit: {
    enabled: true,
  },
  plugins: [
    organization(),
    // Platform-wide "superadmin" role, gated by user.role — not org-scoped.
    // Used only as a server-side primitive (createUser/removeUser/setUserPassword)
    // from our own org-scoped admin panel actions; see lib/require-org-admin.ts.
    admin({
      defaultRole: "user",
      adminRoles: ["superadmin", "orgadmin"],
      roles: { superadmin: adminAc, orgadmin: orgAdminAc, user: userAc },
    }),
    // Must stay last: writes Set-Cookie headers via next/headers in Server Actions/Route Handlers.
    nextCookies(),
  ],
});
