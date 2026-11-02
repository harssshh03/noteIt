import { Hono } from "hono";
import { requireUser, type Env } from "../lib/auth";
import { noteSchema } from "@noteit/shared/schemas";

const notes = new Hono<Env>();
notes.use("*", requireUser);

export const noteSelect = {
  id: true,
  title: true,
  content: true,
  paper: true,
  mood: true,
  pinned: true,
  published: true,
  shareId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true, handle: true } },
  files: { select: { id: true, name: true, mime: true, size: true }, orderBy: { createdAt: "asc" } },
} as const;

const parseId = (v: string) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** Only files this person uploaded can be attached. Returns the Prisma `files` clause (or undefined). */
async function fileLinks(c: { var: Env["Variables"] }, ids: string[] | undefined, mode: "connect" | "set") {
  if (!ids) return undefined;
  const mine = await c.var.db.attachment.count({ where: { id: { in: ids }, ownerId: c.var.userId } });
  if (mine !== ids.length) throw new Error("bad-files");
  return { [mode]: ids.map((id) => ({ id })) } as { connect: { id: string }[] } | { set: { id: string }[] };
}

// GET /api/v1/notes — my notebook (pinned first, then newest)
notes.get("/", async (c) => {
  const list = await c.var.db.post.findMany({
    where: { authorId: c.var.userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: noteSelect,
  });
  return c.json({ notes: list });
});

// GET /api/v1/notes/:id
notes.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ msg: "Invalid note id" }, 400);
  const note = await c.var.db.post.findFirst({ where: { id, authorId: c.var.userId }, select: noteSelect });
  return note ? c.json({ note }) : c.json({ msg: "Note not found" }, 404);
});

// POST /api/v1/notes
notes.post("/", async (c) => {
  const parsed = noteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ msg: parsed.error.issues[0]?.message ?? "Invalid note" }, 400);

  const { fileIds, ...fields } = parsed.data;
  let files;
  try { files = await fileLinks(c, fileIds, "connect"); } catch { return c.json({ msg: "One of those files can't be attached." }, 400); }

  const note = await c.var.db.post.create({
    data: { ...fields, authorId: c.var.userId, ...(files && { files }) },
    select: noteSelect,
  });
  return c.json({ note }, 201);
});

// PUT /api/v1/notes/:id
notes.put("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ msg: "Invalid note id" }, 400);

  const parsed = noteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ msg: parsed.error.issues[0]?.message ?? "Invalid note" }, 400);

  const owned = await c.var.db.post.findFirst({ where: { id, authorId: c.var.userId }, select: { id: true } });
  if (!owned) return c.json({ msg: "Note not found" }, 404);

  const { fileIds, ...fields } = parsed.data;
  let files;
  try { files = await fileLinks(c, fileIds, "set"); } catch { return c.json({ msg: "One of those files can't be attached." }, 400); }

  const note = await c.var.db.post.update({ where: { id }, data: { ...fields, ...(files && { files }) }, select: noteSelect });
  return c.json({ note });
});

// POST /api/v1/notes/:id/share  { enabled: boolean } — turn the public link on/off
notes.post("/:id/share", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ msg: "Invalid note id" }, 400);
  const { enabled } = (await c.req.json().catch(() => ({}))) as { enabled?: boolean };

  const owned = await c.var.db.post.findFirst({ where: { id, authorId: c.var.userId }, select: { id: true, shareId: true } });
  if (!owned) return c.json({ msg: "Note not found" }, 404);

  const shareId = enabled ? owned.shareId ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : null;
  const note = await c.var.db.post.update({ where: { id }, data: { shareId }, select: noteSelect });
  return c.json({ note });
});

// DELETE /api/v1/notes/:id
notes.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ msg: "Invalid note id" }, 400);
  const attached = await c.var.db.attachment.findMany({ where: { postId: id, ownerId: c.var.userId }, select: { id: true } });
  await c.var.db.attachment.deleteMany({ where: { postId: id, ownerId: c.var.userId } });
  if (c.env.FILES) await Promise.all(attached.map((f: { id: string }) => c.env.FILES!.delete(f.id)));
  const { count } = await c.var.db.post.deleteMany({ where: { id, authorId: c.var.userId } });
  return count ? c.json({ msg: "Deleted" }) : c.json({ msg: "Note not found" }, 404);
});

export default notes;
