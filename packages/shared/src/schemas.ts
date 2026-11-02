import { z } from "zod";
import { MOODS, PAPERS } from "./constants";

const title = z.string().trim().max(200).default("");
const content = z.string().trim().min(1, "Write something first").max(20000);

export const noteSchema = z.object({
  title,
  content,
  paper: z.enum(PAPERS).default("ruled"),
  mood: z.enum(MOODS).nullable().optional(),
  published: z.boolean().optional(), // true = shown on the public Wall
  pinned: z.boolean().optional(),
  fileIds: z.array(z.string().length(32)).max(10).optional(), // uploaded via POST /files first
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "3–20 letters, numbers or _")
    .nullable()
    .optional(),
  phone: z.string().trim().max(24).nullable().optional(),
});

export const letterSchema = z
  .object({
    toPhone: z.string().trim().optional(),
    toHandle: z.string().trim().toLowerCase().optional(),
    toUserId: z.number().int().positive().optional(), // used by Reply
    title,
    content,
    paper: z.enum(PAPERS).default("ruled"),
  })
  .refine((v) => v.toPhone || v.toHandle || v.toUserId, { message: "Who is this for?" });
