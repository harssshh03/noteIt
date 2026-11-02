import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";

import type { Env } from "./lib/auth";
import me from "./routes/me";
import notes from "./routes/notes";
import letters from "./routes/letters";
import pub from "./routes/public";
import files from "./routes/files";

const app = new Hono<Env>();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://noteit.harssh.xyz",
  "https://harrsh.xyz",
  "https://note-it.vercel.app",
];

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : ""),
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Fail loudly (and helpfully) if a secret is missing, instead of a vague 500.
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  const missing = ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"].filter(
    (k) => !(c.env as Record<string, unknown>)?.[k]
  );
  if (missing.length) {
    console.error(`Missing ${missing.join(", ")} — create apps/api/.dev.vars (copy .dev.vars.example) and restart.`);
    return c.json({ msg: `Server is missing ${missing.join(", ")}. Add it to apps/api/.dev.vars and restart the API.` }, 500);
  }
  return next();
});

// Reads the Clerk token from the Authorization header on every request.
// (Routes decide if login is required — see requireUser in lib/auth.ts)
app.use("*", clerkMiddleware());

app.route("/api/v1/me", me);
app.route("/api/v1/notes", notes);
app.route("/api/v1/letters", letters);
app.route("/api/v1/files", files);
app.route("/api/v1", pub); // /wall, /wall/:id, /shared/:shareId

app.get("/", (c) => c.text("noteIt API is up ✎"));

export default app;
