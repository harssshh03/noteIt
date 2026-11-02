# noteIt — a pocket diary (Turborepo)

```
apps/web         React + Vite + Tailwind + Clerk   (the website)
apps/api         Hono on Cloudflare Workers + Prisma (the backend)
packages/shared  Code both sides use: phone cleanup, paper/mood lists, zod schemas
```

## First-time setup
1. `pnpm install`   (once, from this root folder)
2. **Clerk**: dashboard.clerk.com → new app → copy publishable (`pk_test_…`) + secret (`sk_test_…`) keys.
3. **Database**: Postgres (Neon/Supabase) + Prisma Accelerate (console.prisma.io) → you get a `prisma://…` URL.
4. `apps/api`: copy `.dev.vars.example` → `.dev.vars`, fill the 4 values (use the **prisma://** URL).
5. `apps/web`: copy `.env.example` → `.env`, fill the 2 values.
6. Migrate once, with the **direct** Postgres URL:
   `DATABASE_URL="postgresql://…" pnpm db:migrate` then `pnpm db:generate`
7. `pnpm dev` → web http://localhost:5173 · api http://localhost:8787

## Everyday commands (run from the root)
| Command | Does |
|---|---|
| `pnpm dev` | runs web + api together |
| `pnpm build` / `pnpm typecheck` | checks everything, cached |
| `pnpm db:migrate` | applies DB migrations |
| `pnpm deploy:api` | deploys the Worker (set secrets first: `wrangler secret put …`) |

## Where to change things
| Want to change… | Look at |
|---|---|
| Colours, paper, fonts | `apps/web/src/index.css` (top block) |
| Landing page | `apps/web/src/pages/Landing.tsx` |
| Writing page | `apps/web/src/components/diary/Editor.tsx` |
| Voice composer | `apps/web/src/components/ui/voice-composer.tsx` |
| Send (noteIt/WhatsApp/SMS) | `apps/web/src/components/diary/SendSheet.tsx`, `lib/share.ts` |
| API routes | `apps/api/src/routes/*.ts` |
| Login check | `apps/api/src/lib/auth.ts` |
| Rules shared by both (validation, paper types) | `packages/shared/src` |
| Database | `apps/api/prisma/schema.prisma` |

Deploying: web → Vercel/Cloudflare Pages (root dir `apps/web`, env vars as in `.env.example`). Add your web domain to `allowedOrigins` in `apps/api/src/index.ts`.
Old password users: signing in with Clerk using the same email re-attaches their old notes.
