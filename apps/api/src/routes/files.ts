import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { getPrisma } from "../lib/db";
import { requireUser, type Env } from "../lib/auth";

const files = new Hono<Env>();

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf|text\/plain|audio\/.+|application\/(zip|msword|vnd\.openxmlformats-officedocument\..+))$/;

// GET /api/v1/files/:id — the owner, or anyone if the page is on the Wall / has a share link.
files.get("/:id", async (c) => {
  if (!c.env.FILES) return c.json({ msg: "File storage isn't set up yet." }, 501);
  const db = getPrisma(c.env.DATABASE_URL);
  const file = await db.attachment.findUnique({
    where: { id: c.req.param("id") },
    include: { post: { select: { published: true, shareId: true } }, owner: { select: { clerkId: true } } },
  });
  if (!file) return c.json({ msg: "File not found" }, 404);

  const isPublic = !!(file.post && (file.post.published || file.post.shareId));
  const isOwner = !!getAuth(c)?.userId && getAuth(c)?.userId === file.owner.clerkId;
  if (!isPublic && !isOwner) return c.json({ msg: "File not found" }, 404);

  const obj = await c.env.FILES.get(file.id);
  if (!obj) return c.json({ msg: "File not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

// Everything below needs a signed-in person.
files.use("*", requireUser);

// POST /api/v1/files  (multipart: file) → { file: { id, name, mime, size } }
files.post("/", async (c) => {
  if (!c.env.FILES) {
    return c.json({ msg: "File storage isn't set up yet — add the R2 binding \"FILES\" (see apps/api/README.md)." }, 501);
  }
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return c.json({ msg: "Pick a file to upload." }, 400);
  if (file.size === 0) return c.json({ msg: "That file is empty." }, 400);
  if (file.size > MAX_BYTES) return c.json({ msg: "Files can be up to 10 MB." }, 413);
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.test(mime)) return c.json({ msg: "That file type isn't supported yet." }, 415);

  const id = crypto.randomUUID().replace(/-/g, "");
  await c.env.FILES.put(id, file.stream(), { httpMetadata: { contentType: mime } });
  const row = await c.var.db.attachment.create({
    data: { id, name: file.name.slice(0, 200) || "file", mime, size: file.size, ownerId: c.var.userId },
    select: { id: true, name: true, mime: true, size: true },
  });
  return c.json({ file: row }, 201);
});

// DELETE /api/v1/files/:id — remove an upload you no longer want
files.delete("/:id", async (c) => {
  const row = await c.var.db.attachment.findFirst({ where: { id: c.req.param("id"), ownerId: c.var.userId } });
  if (!row) return c.json({ msg: "File not found" }, 404);
  await c.env.FILES?.delete(row.id);
  await c.var.db.attachment.delete({ where: { id: row.id } });
  return c.json({ msg: "Deleted" });
});

export default files;
