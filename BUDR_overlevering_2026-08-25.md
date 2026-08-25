# BUDR — overlevering efter genstart 25. august 2026

Indsæt eller upload denne fil i starten af næste chat. Den indeholder alt fra
aftenens session.

---

## Kontekst

Christian Cloos, solo CEO i BUDR ApS. Åbnede projektet igen 25. august efter
ca. 2 måneders pause. Sidste rigtige udviklingsarbejde: 16.–17. juni 2026.

Claude fungerer som strategisk CTO: træffer tekniske beslutninger autonomt,
spørger kun ved reelle produkt/UX-valg (maks. 3 muligheder). Christian har
ingen CLI-erfaring — alle terminalkommandoer gives ét skridt ad gangen, én
kodeblok per kommando. Cursor/Claude Code-prompts skrives i direkte promptform
med eksplicit STOP-instruktion.

---

## Hvad der blev lukket 25. august

| Opgave | Resultat |
|---|---|
| `.env`-læk | **Falsk alarm.** Kun placeholders + anon-nøgle (offentlig af design). Ingen rotation. `budr-history-purge.sh` slettet — den var overflødig. |
| Prod-hærdning usporet | De to `security_hardening`-migrations fra 16. juni lå kun på Macen. Nu committet. |
| Dublet-migration | `20260617120000_security_hardening.sql` var identisk med `223627`. Slettet. |
| Staging drevet fra prod | `create_ai_briefs` (29. maj) manglede i repoet. Genskabt som `20260529124110_create_ai_briefs.sql`, idempotent. Staging pushet og i sync. |
| RLS-lint på staging | `staff can read own org` (brugte redigerbar `user_metadata`) erstattet af `organisations_staff_select_own_org` via `care_staff`-opslag. |
| Marketing løj om hosting | Sitet lovede Hetzner FSN1. Rettet til Supabase eu-north-1 Stockholm + åbenhed om Netlify og AI-underdatabehandlere. "Ingen data forlader EU" fjernet (var forkert). Committet og deployet. |
| Next.js sårbarhed | 15.1.11 → **15.5.24**. Lukkede `Authorization Bypass in Next.js Middleware` — det lag der validerer borgersessioner. Build grøn, 29/29 tests grønne, deployet. |
| STATUS.md | Fuld kortlægning genereret: 61 sider, 52 API-ruter, 54 tabeller, 24 branches. Ligger i repo-roden. |

---

## Verificerede fakta om infrastrukturen

- **Prod Supabase:** `olszwyeikwbtjcoopfid` ("BUDR 3.0"), region **eu-north-1 Stockholm**, Pro-plan. Security Advisor: 0 errors.
- **Staging Supabase:** `mxlivgnynoagulrmqipf` ("budr-staging"). I sync med prod.
- **Netlify:** budrcare.dk. `scheduled-briefs` kører — cron `0 5 * * *`, bekræftet aktiv. Behøver ikke stå i `netlify.toml`; auto-opdages.
- **Repo:** `CLCoos/BUDR`, lokalt `~/Desktop/budr-luksus`. main er ren og pushet.
- **Stack:** Next.js 15.5.24, Supabase, TypeScript, Vitest + Playwright, Sentry, GitHub Actions.
- **AI-modeller:** alle BUDR API-kald bruger `claude-haiku-4-5-20251001`.

---

## Åbne punkter, prioriteret

### A. Kommercielt blokerende

**1. Underdatabehandlerliste + DPA.** Sitet lover nu en liste. Den findes ikke.
Fem leverandører: Supabase (eu-north-1, ingen tredjelandsoverførsel), Netlify,
Anthropic, OpenAI, ElevenLabs (alle fire: SCC).
To ubesvarede spørgsmål: (a) er Whisper/ElevenLabs faktisk i drift? Dansk
udtale blev fundet uacceptabel i juni. (b) Er der zero data retention-aftale
hos Anthropic? Uden den gemmes input i 30 dage.
Selve DPA'en bør advokat-reviewes — der findes allerede en advokat-brief.

**2. VUM 2.0 er ikke i produktet.** `feature/vum-2-sprint-1` indeholder API,
`ResidentVumTab`, `src/lib/vum/*`, migration `20260518120000_vum_assessments.sql`
og demo-seed. Intet af det på main. VUM 2.0-kompatibilitet er det erklærede
differentieringspunkt over for EG Sensum m.fl.

**3. Demofejl.** Skal rettes før en forstander ser det:
- Hydration-mismatch på `/care-portal-demo` — `DemoWelcomeOverlay` renderer
  forskelligt server/klient. Løsning: `useEffect` + `mounted`-state.
- `CARE_PORTAL_DEMO_FACILITY_NAME` siger stadig "Bosted Solhaven", mens
  demodata er Sara-universet.
- Christian noterede selv æstetiske og funktionelle mangler på `/resident-demo`.

### B. Teknisk gæld, ikke akut

- **`resident_pins` mangler `CREATE TABLE`** i alle aktive migrationer. Baseline
  refererer funktioner der bruger tabellen. Prod virker, men databasen kan ikke
  genskabes fra repoet. Samme fejlklasse som `ai_briefs`.
- **Sentry mangler `global-error.js`** — React-renderfejl rapporteres ikke. Hvis
  Care Portal crasher hos en pilotkunde, opdages det ikke.
- **Forvildet `package-lock.json` i `/Users/christiancloos/`** (uden for
  projektet). Forvirrer Next.js' workspace-detektion. Skal slettes.
- **22 filer uden importreferencer** — se STATUS.md afsnit 4. Sandsynligvis dead
  code, ikke bevist.
- **15 npm-sårbarheder tilbage.** Alle i byggeværktøjer og telemetri, ikke i
  produktionskoden. Kør **aldrig** `npm audit fix --force` — den ville hive
  `@anthropic-ai/sdk` 41 minorversioner frem.
- **`/onboarding` gemmer ikke profil til Supabase** (TODO i `StepCelebration.tsx`).
- **`/care-portal-indsatsdok` og vagtplan/løn kører på localStorage**, ikke DB.
- **TODO.md er forældet** — Cal.com-linket er allerede live.
- **8 branches med arbejde der aldrig kom på main**, se STATUS.md afsnit 8.

### C. Fra due diligence 14. juni, stadig gyldigt

- Testdækning: 29 tests mod 452 kildefiler. Prioritér RLS/org-scoping, auth,
  safety-klassifikator, journal kladde→godkendt.
- Bus factor = 1. `CONTEXT.md` afbøder det, men skal holdes ved lige.
- `CONTEXT.md` refererer stadig `/api/park/*` hvor koden har `/api/lys/*`.

---

## Den vigtigste ramme

Fra Christians eget 90-dages plan, 17. august:

> **BUDR til første betalende kunde eller dokumenteret afvisning senest
> 13. november 2026. Ingen udviklingstimer uden et booket møde med en
> navngiven kontakt og en dato.**

Aftenens oprydning var en begrundet undtagelse: et system han ikke kunne
redegøre for kunne ikke sælges, og en åben autorisationsbypass i produktion
skulle lukkes. **Undtagelsen er brugt op.**

Fra 26. august gælder reglen igen. Næste skridt er ikke kode. Det er én besked
til én navngiven person om 30 minutter.

Punkt A1 (underdatabehandlerliste) kan skrives på en vagt uden at bryde reglen —
det er ikke udvikling. A2 og A3 kræver et booket møde først.

Claude skal håndhæve dette, ikke omgå det. Hvis næste session åbner med
"lad os bygge X", er det korrekte svar: er der et møde i kalenderen?

---

## Kommandoer der virker

```
cd ~/Desktop/budr-luksus
npm run dev          # localhost:3000
npm run build        # verificér før merge
npm test             # 29 tests, vitest
```

Supabase-link skifter hvilket projekt terminalen peger på:

```
supabase link --project-ref olszwyeikwbtjcoopfid   # prod
supabase link --project-ref mxlivgnynoagulrmqipf   # staging
supabase migration list --linked
```

Git-rækkefølge (blev forvekslet én gang i aften): **add → commit → checkout → merge**.

Claude Code er ikke installeret. Brug Cursor i Agent-tilstand, eller installér
med `npm install -g @anthropic-ai/claude-code`.
