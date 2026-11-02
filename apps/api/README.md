```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

---
## noteIt setup notes

**Secrets** — create `apps/api/.dev.vars` (copy `.dev.vars.example`). Plain UTF-8, one `KEY="value"` per line, then restart `pnpm dev`.

**File uploads (the + button)** — files are stored in Cloudflare R2. Add this to your `wrangler.jsonc`:

```jsonc
"r2_buckets": [{ "binding": "FILES", "bucket_name": "noteit-files" }]
```

`wrangler dev` simulates R2 locally, so nothing else is needed to try it. For production run `npx wrangler r2 bucket create noteit-files` once.
Then apply the new migration: `DATABASE_URL="postgresql://…" pnpm db:migrate && pnpm db:generate`.
