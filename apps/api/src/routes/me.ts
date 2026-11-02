import { Hono } from "hono";
import { requireUser, type Env } from "../lib/auth";
import { normalizePhone } from "@noteit/shared";
import { profileSchema } from "@noteit/shared/schemas";

const me = new Hono<Env>();
me.use("*", requireUser);

const select = { id: true, name: true, handle: true, phone: true, email: true } as const;

// GET /api/v1/me — who am I?
me.get("/", async (c) => {
  const user = await c.var.db.user.findUnique({ where: { id: c.var.userId }, select });
  return c.json({ user });
});

// PUT /api/v1/me — update name / handle / phone
me.put("/", async (c) => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ msg: parsed.error.issues[0]?.message ?? "Invalid details" }, 400);

  const { name, handle, phone } = parsed.data;
  const data: { name?: string; handle?: string | null; phone?: string | null } = {};
  if (name !== undefined) data.name = name;
  if (handle !== undefined) data.handle = handle || null;
  if (phone !== undefined) {
    if (!phone) data.phone = null;
    else {
      const n = normalizePhone(phone, c.env.DEFAULT_COUNTRY_CODE ?? "91");
      if (!n) return c.json({ msg: "That phone number doesn't look right." }, 400);
      data.phone = n;
    }
  }

  try {
    const user = await c.var.db.user.update({ where: { id: c.var.userId }, data, select });
    return c.json({ user });
  } catch {
    // unique constraint on handle / phone
    return c.json({ msg: "That handle or phone is already taken." }, 409);
  }
});

export default me;
