# Instruktioner til AI-agenter (Claude Code, Cursor, mv.)

1. **Start her:** [`CONTEXT.md`](./CONTEXT.md) — domæne, arkitektur, **status snapshot** (seneste leverancer), demo vs. live, database, auth, miljøvariabler og kendte huller.
2. **Udviklings-kommandoer:** [`README.md`](./README.md) — bl.a. `npm run dev` (port **4028**), `npm run build`, lint.
3. **Database:** SQL under `supabase/migrations/`. Produktion linkes med `supabase link --project-ref olszwyeikwbtjcoopfid` (se CONTEXT — **commit aldrig** hemmeligheder).

Opdater **`CONTEXT.md`** efter **hver session med ændringer** (dato + snapshot). Opdater også andre relevante docs (typisk **`README.md`**) når workflows, ruter eller driftsskridt ændres.

## Cursor Cloud specific instructions

### Services overview

| Service | How to run | Notes |
|---------|-----------|-------|
| Next.js dev server | `npm run dev` | Runs on port **4028**. Marketing pages and demo portal work without external secrets. |

### Key commands (see README.md for full list)

- **Dev server:** `npm run dev` (port 4028)
- **Lint:** `npm run lint`
- **Type-check:** `npm run type-check`
- **Tests:** `npm test` (Vitest)
- **Build:** `npm run build`

### Demo mode

Set `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=true` before starting the dev server to enable the Care Portal demo with simulated data (no Supabase secrets required). Example:

```bash
NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=true npm run dev
```

Demo routes under `/care-portal-demo/*` and marketing pages (`/`, `/institutioner`, `/pilotpakke`) work fully without any API keys.

### Environment notes

- No lockfile exists in this repo — `npm install` generates `package-lock.json` on first run.
- Node 20+ is required (specified in `netlify.toml`). The VM ships with Node 22 which is compatible.
- No Docker or local Supabase setup is needed. The app connects to a hosted Supabase cloud instance.
- `.env` contains the public Supabase URL and anon key. Server-side features (AI, imports, journals) require `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` which are optional for local UI development.
- The build will succeed and the dev server will start without any secrets beyond what's in `.env`.

### Gotchas

- `npm run build` performs both TypeScript checking and ESLint; warnings are expected (relaxed rules for legacy code) but errors will fail the build.
- Middleware validates `/park-hub` routes against Supabase in production, but in dev it sets a demo resident cookie automatically so the route is viewable without a real resident session.
