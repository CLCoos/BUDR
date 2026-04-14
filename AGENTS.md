# Instruktioner til AI-agenter (Claude Code, Cursor, mv.)

1. **Start her:** [`CONTEXT.md`](./CONTEXT.md) — domæne, arkitektur, **status snapshot** (seneste leverancer), demo vs. live, database, auth, miljøvariabler og kendte huller.
2. **Udviklings-kommandoer:** [`README.md`](./README.md) — bl.a. `npm run dev` (port **4028**), `npm run build`, lint.
3. **Database:** SQL under `supabase/migrations/`. Produktion linkes med `supabase link --project-ref olszwyeikwbtjcoopfid` (se CONTEXT — **commit aldrig** hemmeligheder).

Opdater **`CONTEXT.md`** efter **hver session med ændringer** (dato + snapshot). Opdater også andre relevante docs (typisk **`README.md`**) når workflows, ruter eller driftsskridt ændres.
