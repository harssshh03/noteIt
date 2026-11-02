import { Hono } from "hono";
import { getPrisma } from "../lib/db";
import type { Env } from "../lib/auth";
import { noteSelect } from "./notes";

// No login needed for anything in this file.
const pub = new Hono<Env>();

// Only expose what a stranger should see (no shareId / ids of private stuff).
const publicSelect = {
  id: true,
  title: true,
  content: true,
  paper: true,
  mood: true,
  createdAt: true,
  author: noteSelect.author,
  files: noteSelect.files,
} as const;

// GET /api/v1/wall — everything people chose to publish
pub.get("/wall", async (c) => {
  const db = getPrisma(c.env.DATABASE_URL);
  const list = await db.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: publicSelect,
  });
  return c.json({ notes: list });
});

// GET /api/v1/wall/:id
pub.get("/wall/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ msg: "Invalid id" }, 400);
  const db = getPrisma(c.env.DATABASE_URL);
  const note = await db.post.findFirst({ where: { id, published: true }, select: publicSelect });
  return note ? c.json({ note }) : c.json({ msg: "Note not found" }, 404);
});

// GET /api/v1/shared/:shareId — anyone with the private link
pub.get("/shared/:shareId", async (c) => {
  const db = getPrisma(c.env.DATABASE_URL);
  const note = await db.post.findUnique({ where: { shareId: c.req.param("shareId") }, select: publicSelect });
  return note ? c.json({ note }) : c.json({ msg: "This link isn't active anymore." }, 404);
});

export default pub;
