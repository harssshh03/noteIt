import { Hono } from "hono";
import { requireUser, type Env } from "../lib/auth";
import { normalizePhone } from "@noteit/shared";
import { letterSchema } from "@noteit/shared/schemas";

const letters = new Hono<Env>();
letters.use("*", requireUser);

const person = { select: { id: true, name: true, handle: true } } as const;
const letterSelect = {
  id: true,
  title: true,
  content: true,
  paper: true,
  readAt: true,
  createdAt: true,
  sender: person,
  recipient: person,
} as const;

const parseId = (v: string) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

// GET /api/v1/letters/inbox
letters.get("/inbox", async (c) => {
  const list = await c.var.db.letter.findMany({
    where: { recipientId: c.var.userId, recipientDeleted: false },
    orderBy: { createdAt: "desc" },
    select: letterSelect,
  });
  return c.json({ letters: list, unread: list.filter((l: { readAt: Date | null }) => !l.readAt).length });
});

// GET /api/v1/letters/unread — tiny call for the badge in the sidebar
letters.get("/unread", async (c) => {
  const unread = await c.var.db.letter.count({
    where: { recipientId: c.var.userId, recipientDeleted: false, readAt: null },
  });
  return c.json({ unread });
});

// GET /api/v1/letters/sent
letters.get("/sent", async (c) => {
  const list = await c.var.db.letter.findMany({
    where: { senderId: c.var.userId },
    orderBy: { createdAt: "desc" },
    select: letterSelect,
  });
  return c.json({ letters: list });
});

// GET /api/v1/letters/find?phone=...  or  ?handle=...  — "is this person on noteIt?"
letters.get("/find", async (c) => {
  const phone = c.req.query("phone");
  const handle = c.req.query("handle")?.trim().toLowerCase().replace(/^@/, "");

  const where = phone
    ? { phone: normalizePhone(phone, c.env.DEFAULT_COUNTRY_CODE ?? "91") ?? "__none__" }
    : handle
      ? { handle }
      : null;
  if (!where) return c.json({ msg: "Give a phone or a handle" }, 400);

  const user = await c.var.db.user.findFirst({ where, select: { id: true, name: true, handle: true } });
  return user ? c.json({ user }) : c.json({ msg: "Not on noteIt yet" }, 404);
});

// POST /api/v1/letters — send a letter to another noteIt user
letters.post("/", async (c) => {
  const parsed = letterSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ msg: parsed.error.issues[0]?.message ?? "Invalid letter" }, 400);
  const { toPhone, toHandle, toUserId, ...body } = parsed.data;

  const where = toUserId
    ? { id: toUserId }
    : toPhone
      ? { phone: normalizePhone(toPhone, c.env.DEFAULT_COUNTRY_CODE ?? "91") ?? "__none__" }
      : { handle: (toHandle ?? "").replace(/^@/, "") };

  const to = await c.var.db.user.findFirst({ where, select: { id: true } });
  if (!to) return c.json({ msg: "They're not on noteIt yet — share it on WhatsApp instead." }, 404);
  if (to.id === c.var.userId) return c.json({ msg: "That's you! Keep it in your notebook." }, 400);

  const letter = await c.var.db.letter.create({
    data: { ...body, senderId: c.var.userId, recipientId: to.id },
    select: letterSelect,
  });
  return c.json({ letter }, 201);
});

// PUT /api/v1/letters/:id/read
letters.put("/:id/read", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ msg: "Invalid id" }, 400);
  await c.var.db.letter.updateMany({
    where: { id, recipientId: c.var.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return c.json({ msg: "ok" });
});

// DELETE /api/v1/letters/:id — removes it from MY inbox only (sender keeps their copy)
letters.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ msg: "Invalid id" }, 400);
  const { count } = await c.var.db.letter.updateMany({
    where: { id, recipientId: c.var.userId },
    data: { recipientDeleted: true },
  });
  return count ? c.json({ msg: "Deleted" }) : c.json({ msg: "Letter not found" }, 404);
});

export default letters;
