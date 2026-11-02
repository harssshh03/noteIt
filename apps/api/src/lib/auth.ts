import { createMiddleware } from "hono/factory";
import { getAuth } from "@hono/clerk-auth";
import { getPrisma, type Db } from "./db";

// Just the bits of a Cloudflare R2 bucket we use (so no extra types package is needed).
export type R2Like = {
  get(key: string): Promise<{ body: ReadableStream } | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export type Env = {
  Bindings: {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
    DEFAULT_COUNTRY_CODE?: string; // e.g. "91" — used when a phone has no +code
    FILES?: R2Like; // R2 bucket for attachments (see apps/api/README.md)
  };
  Variables: {
    db: Db;
    userId: number; // OUR database id (not the Clerk id)
  };
};

/**
 * Runs on every protected route.
 *  1. Checks the Clerk session token (clerkMiddleware does the heavy lifting).
 *  2. Finds — or creates — the matching row in our User table.
 *  3. Puts `db` and `userId` on the context so routes can just use them.
 */
export const requireUser = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ msg: "Please sign in." }, 401);

  const db = getPrisma(c.env.DATABASE_URL);
  let user = await db.user.findUnique({ where: { clerkId: auth.userId } });

  if (!user) {
    // First time we see this Clerk user: pull their details from Clerk.
    const clerk = c.get("clerk");
    const cu = await clerk.users.getUser(auth.userId);
    const email = cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ?? null;
    const name = [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || null;

    // Users from the old password-based version: adopt them by email so they keep their notes.
    const legacy = email ? await db.user.findFirst({ where: { email, clerkId: null } }) : null;

    user = legacy
      ? await db.user.update({ where: { id: legacy.id }, data: { clerkId: auth.userId, name: legacy.name ?? name } })
      : await db.user.create({ data: { clerkId: auth.userId, email, name } });
  }

  c.set("db", db);
  c.set("userId", user.id);
  await next();
});
