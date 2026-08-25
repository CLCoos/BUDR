# BUDR — Teknisk & Forretningsmæssig Gennemgang

**Forberedt til:** Christian Cloos (grundlægger/CEO)
**Dato:** 14. juni 2026
**Omfang:** Første samlede gennemgang af kodebase, produkt, sikkerhed og drift. Aldrig revideret før.
**Grundlag:** `budr-luksus`-repoet (main-branch), `CONTEXT.md`, `README.md`, `TODO.md`, git-historik og budrcare.dk.

---

## 1. Resumé til ledelsen

BUDR er et imponerende stykke arbejde for en solo-grundlægger: ~81.000 linjer TypeScript, 452 filer, et komplet driftssystem til socialpsykiatriske bosteder med to produkter (Care Portal til personale, Lys til borgere), bygget på en moderne og fornuftig stack. Den faglige kerne — CHIME-rammeværket, kladde→godkendt-journal og en **fail-safe AI-sikkerhedsklassifikator** — er gennemtænkt og ansvarligt bygget.

Men inden vi går videre er der **ét kritisk sikkerhedsproblem der skal lukkes i dag**, og en håndfuld compliance- og kvalitetshuller der er særligt vigtige, fordi I håndterer følsomme helbredsdata om en sårbar borgergruppe.

**Rettelse (17. juni 2026):** Den oprindelige rapport markerede en lækket `.env` med ægte nøgler som P0. Ved kontrol af **alle** historiske versioner af filen viste det sig, at de fire AI-nøgler kun var **placeholder-tekst** (`your-…-api-key`). Der har aldrig ligget ægte hemmeligheder i git. De eneste ægte værdier var `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY`, som er **offentlige af design**. **Ingen nøglerotation og ingen historik-rens er nødvendig.** Oprydningen (untracket `.env`, `.gitignore`, `.env.example`, fjernede dubletter) står som god forebyggende hygiejne. Den reelle sikkerhedsgrænse er **RLS** — se afsnit 5.

| Prioritet | Tema | Status |
|-----------|------|--------|
| ✅ Lukket | `.env`-hygiejne (var placeholders, ikke læk) | Færdig — untracket + gitignored |
| 🟠 P1 | GDPR/datalokation: marketing-påstande vs. faktisk infrastruktur | Skal verificeres |
| 🟠 P1 | Testdækning på en patientkritisk platform | For tynd |
| 🟠 P1 | Bus factor = 1 (én udvikler) | Strukturel risiko |
| 🟡 P2 | 17 dublerede "`route 2.ts`"-filer i repoet | Oprydning |
| 🟡 P2 | Migrations-hygiejne + dok-drift | Vedligehold |
| 🟢 | AI-sikkerhedslag, RLS-arbejde, dokumentation | Stærkt — bevar |

---

## 2. Hvad BUDR er (sådan forstår jeg virksomheden)

**Mission:** Det første danske driftssystem til socialpsykiatriske bosteder, bygget på det evidensbaserede **CHIME-rammeværk** (Connectedness, Hope, Identity, Meaning, Empowerment) og **VUM 2.0-kompatibelt**. I samler vagtoverdragelse, journal, dokumentation og recovery-arbejde i ét system — og giver borgeren en stemme i sit eget forløb.

**To indgange, ét system:**
- **Care Portal** (personale): webbaseret dashboard — 360°-borgeroverblik, vagtoverdragelse, AI-assisteret journal/dokumentation, advarselssystem, recovery-trends, VUM 2.0, tilsynsrapporter, vagtplan/løn.
- **Lys** (borger): personlig recovery-app — dagligt check-in, refleksioner i tekst/stemme, egne mål, "Haven" (gamificeret engagement). Borgeren bestemmer hvad personalet ser.

**Forretningsmodel:** 3 måneders gratis pilot (5–15 borgere på én afdeling) → tre prismodeller (Start/Vækst/Organisation). Salg via 15-min introsamtale (cal.com).

**Differentiering:** Bygget af en fagperson fra gulvet (dig). Dansk, GDPR-fokuseret, evidensbaseret. FMK/MedCom-integration på roadmap til 2027.

**Faglig integritet (vigtigt og rigtigt gjort):** Alt AI-output er **udkast** indtil menneskelig faglig godkendelse. AI'en diagnosticerer ikke, behandler ikke, beslutter ikke. Det er den rigtige holdning for jeres domæne.

---

## 3. Teknisk fundament

| Lag | Teknologi |
|-----|-----------|
| Frontend/Backend | Next.js 15 (App Router), React, TypeScript, Tailwind |
| Database/Auth | Supabase (Postgres + Auth + Edge Functions + Realtime + RLS) |
| AI | Anthropic Claude (journal-polish, faglig støtte, sikkerhedsklassifikator via Haiku); OpenAI Whisper (STT); ElevenLabs (TTS) |
| Hosting | Netlify (inkl. scheduled functions til AI-briefs) |
| Test | Vitest (unit), Playwright (e2e) |
| Projektstyring | Linear (importscripts i repo) |
| CI | GitHub Actions (`ci.yml` — kører `npm test`) |

**Størrelse:** ~81k linjer, 452 TS/TSX-filer, ~40 API-ruter, 9 aktive Supabase-migrationer. Produktions-Supabase: `olszwyeikwbtjcoopfid`. Repoet er ~3 måneder gammelt (første commit 26. marts 2026) med 274 commits — meget høj produktivitet.

---

## 4. ✅ Lukket — `.env`-hygiejne (oprindeligt fejlmarkeret som P0)

**Hvad der faktisk var tilfældet:** Den committede `.env` indeholdt i alle historiske versioner kun **placeholder-tekst** for de fire AI-nøgler (`your-…-api-key`). Ingen ægte hemmeligheder har ligget i git. `SUPABASE_SERVICE_ROLE_KEY` lå aldrig i filen. De eneste ægte værdier var `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` — offentlige af design (anon-nøglen sendes til hver browser).

**Konklusion:** Ingen nøglerotation, ingen historik-rens nødvendig.

**Hvad der blev gjort som forebyggende hygiejne (og som står ved magt):**
1. `.env` untracket (`git rm --cached`, beholdt lokalt) + tilføjet til `.gitignore`.
2. `.env.example` oprettet som sikker skabelon.
3. 17 dublerede `route 2.ts`-filer + `linear-import_1.mjs` fjernet (ægte død kode).

Dette forhindrer et *rigtigt* læk den dag ægte værdier udfyldes. Den reelle sikkerhedsgrænse for borgerdata er **RLS** — behandlet i afsnit 5.2 og i den separate RLS-gennemgang.

---

## 5. 🟠 P1 — Vigtigt før vi skalerer

### 5.1 GDPR: marketing-påstande vs. faktisk infrastruktur

budrcare.dk lover: *"Dansk hosting"*, *"Data hostes i Tyskland (Hetzner FSN1)"*, *"krypteres i hvile (AES-256) og under transport (TLS 1.3)"*, samt databehandleraftale.

Men koden deployer på **Netlify** + **Supabase**. Jeg kan ikke fra repoet bekræfte at Supabase-projektet ligger i en EU-region, eller at Netlify-data-residency matcher "Hetzner FSN1 i Tyskland". **Hvis der er uoverensstemmelse mellem hvad I lover og hvor data faktisk ligger, er det en reel GDPR- og troværdighedsrisiko** — netop på en platform til en sårbar borgergruppe.

**Handling:** Verificér Supabase-projektets region (skal være EU), afklar Netlifys databehandling/edge-lokationer, og bring privatlivspolitik + marketing i 1:1-overensstemmelse med virkeligheden. Få en DPA på plads med hver underdatabehandler (Supabase, Netlify, Anthropic, OpenAI, ElevenLabs) **inden første rigtige pilot med borgerdata**.

### 5.2 Testdækning er for tynd til domænet

~7 testfiler mod 452 kildefiler. Det positive: de tests der findes rammer rigtigt — `safetyClassifier`, `redirectSafety`, `residentSessions`, `staffOrgScope`, `uuid`. Men for et system der håndterer journaler og krisesignaler er dækningen for spinkel.

**Handling:** Prioritér tests omkring (a) RLS/org-scoping (ingen borger ser en andens data), (b) auth/middleware-grænser, (c) AI-sikkerhedsklassifikatorens eskaleringslogik, (d) journal kladde→godkendt-flowet. Mål ikke 100% — mål *de patientkritiske stier*.

### 5.3 Bus factor = 1

274 af ~310 commits er dine; resten er Cursor-agenten. Hele systemets viden ligger hos én person. `CONTEXT.md` (38 KB!) afbøder det flot, men det er stadig en strukturel risiko for kontinuitet, ferie, sygdom — og noget investorer/pilotkunders IT-afdelinger vil spørge ind til.

**Handling:** Hold `CONTEXT.md` opdateret (det er guld), overvej en runbook for deploy/incidents, og planlæg hvordan viden deles når første medudvikler kommer ind.

---

## 6. 🟡 P2 — Oprydning og hygiejne

- **17 dublerede filer sporet i git:** `route 2.ts`, `ChimeInteractive 2.tsx`, `[id] 2/`-mapper m.fl. under `src/app/api/lys/`. Det er klassiske Finder/iCloud-"… 2"-dubletter. Next.js router dem ikke (kun `route.ts`), så de er **død kode** — men de forvirrer, risikerer at divergere fra de rigtige filer, og ser uprofessionelt ud i en due-diligence. **Bør slettes.** (Jeg kan gøre det og verificere at intet importerer dem.)
- **Dublerede rod-scripts:** `linear-import.mjs` og `linear-import_1.mjs`. Behold én.
- **Migrations-hygiejne:** `CONTEXT.md` nævner en historisk dublet omkring version `20260408` og anbefalede migrationer der bør være kørt på prod (`journal_status`, `show_in_diary`). Verificér at prod er fuldt migreret.
- **Dok-drift:** `CONTEXT.md` refererer flere steder til `/api/park/*`-ruter, mens koden har `/api/lys/*`. Harmonisér så dokumentationen matcher virkeligheden.
- **`TODO.md`:** Cal.com-linket står stadig som åben placeholder (linje 13 i `InstitutionerPage.tsx`), men live-sitet bruger `cal.com/budr-care/introduktion` — luk opgaven hvis den er løst.

---

## 7. 🟢 Hvad der er stærkt (bevar dette)

- **AI-sikkerhedsklassifikatoren er forbilledlig.** `safetyClassifier.ts` fejler altid *opad* (tvivl → `elevated`/`acute`), har timeout, blokerer ikke borgerens svar, og logger fire-and-forget. Det er den rigtige ansvarlige arkitektur på den mest kritiske sti i hele produktet.
- **Kladde→godkendt-journal med RLS.** Tydelig adskillelse mellem AI-udkast og fagligt godkendt indhold; DELETE er ikke åbnet mod klienten.
- **Seriøst RLS-arbejde** på tværs af org-scoping, borger/personale-adskillelse og park-flows.
- **`CONTEXT.md`** er enestående god projektdokumentation for et solo-projekt.
- **Fornuftig, moderne stack** uden unødig kompleksitet.
- **CI kører tests** ved hver ændring.

---

## 8. Prioriteret handlingsplan

**Færdig:**
1. ~~Rotér AI-nøgler~~ — ikke nødvendigt (var placeholders, ikke ægte nøgler).
2. `.env` untracket + gitignored + `.env.example` + 17 dubletfiler fjernet. ✅

**Denne uge (P1):**
3. Verificér Supabase-region (EU) + Netlify-dataresidens; ret privatlivspolitik/marketing til virkeligheden.
4. Få DPA'er på plads med alle underdatabehandlere før rigtig borgerdata.
5. Slet de 17 dublerede filer + dublet-script (lavthængende, gør repoet review-klart).

**Denne måned (P1/P2):**
6. Byg testdækning på de patientkritiske stier (RLS, auth, safety, journal).
7. Bekræft at prod er fuldt migreret; ryd op i migrations-dubletten.
8. Harmonisér `CONTEXT.md` med faktiske `/api/lys/*`-ruter.

**Løbende:**
9. Hold `CONTEXT.md` ved lige; skriv en kort incident/deploy-runbook; planlæg vidensdeling før medudvikler #2.

---

## 9. Hvad jeg foreslår vi gør lige nu

Sig til, så **starter jeg med P0**: jeg fjerner `.env` fra git-sporing, opdaterer `.gitignore` og giver dig de præcise kommandoer til historik-rens — mens du parallelt roterer de fire nøgler i konsollerne. Derefter kan jeg tage de 17 dubletfiler i samme omgang, så repoet er rent.

Alternativt kan jeg gå direkte i dybden med ét område — fx en fuld `/engineering:code-review` af `middleware.ts` og auth-laget, eller en RLS-gennemgang af migrationerne.

*Bemærk: Jeg har på intet tidspunkt gengivet indholdet af dine hemmeligheder, og jeg rører dem ikke uden din udtrykkelige besked.*
