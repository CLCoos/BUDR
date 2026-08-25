# BUDR — RLS- & dataadgangs-gennemgang

**Forberedt af:** Claude (CTO-rolle) for Christian Cloos
**Dato:** 17. juni 2026
**Omfang:** Alle 9 Supabase-migrationer + service-role-mønstret i API-ruterne. RLS er den reelle sikkerhedsgrænse, fordi anon-nøglen er offentlig.

---

## Hovedkonklusion

Din RLS-arkitektur er **grundlæggende sund** — bedre end forventet. Men der er **ét spørgsmål, der afgør alt**, og som jeg ikke kan svare på fra koden: **er de seneste RLS-hærdnings-migrationer faktisk kørt på produktion?**

Hvis ikke, kører tre kritiske huller stadig live. Det er din eneste reelle P0 lige nu.

---

## Hvad der er stærkt (bekræftet i koden)

- **Hver eneste tabel har RLS slået til.** Ingen tabel oprettet uden `ENABLE ROW LEVEL SECURITY`. (54 tabeller gennemgået.)
- **Ingen `USING (true)`-policies** og ingen åbne `anon`-policies tilbage efter konsolideringen.
- **Korrekt org-scoping:** personale ser kun rækker hvor `org_id` matcher deres egen (`care_staff`-opslag på `auth.uid()`).
- **Korrekt borger-selv-adgang:** borgere kan kun se/ændre egen række (`user_id = auth.uid()` / JWT `sub`).
- **Service-role-ruterne autoriserer korrekt selv.** Eksempel: `/api/lys/resident-journal` henter resident-id fra den autentificerede cookie (`getResidentId()`) og scoper **altid** forespørgslen til det id — den accepterer **aldrig** et resident-id fra klientens input. En borger kan altså ikke læse en andens journal ved at manipulere kald. Det er det rigtige mønster, når service-role omgår RLS.

## Hvad konsolideringen rettede (19.–20. maj 2026)

Migrationerne `20260519130000_fix_care_residents_rls` og `20260519140000_rls_consolidation` lukkede reelle huller, der havde været åbne:

- 🔴 `care_residents` havde `open_select USING (true)` — **alle indloggede kunne se alle borgere på tværs af organisationer.** Nu org-scoped.
- 🔴 `garden_plots` havde `anon_all_plots` — **anonyme havde fuld adgang.** Droppet.
- 🟠 `facility_contacts` havde anon-læsning. Droppet.
- 🟠 `journal_entries`, `resident_medications`, `portal_messages`/`threads` havde åbne/duplikerede policies. Erstattet med granulære org-scoped.

Dette er solidt arbejde. Men bemærk: disse huller var åbne i kodebasen indtil for ~4 uger siden.

---

## 🔴 Den ene ting der betyder alt: er det deployet?

Migrationer i repoet beskytter **intet**, før de er kørt på produktions-Supabase (`olszwyeikwbtjcoopfid`). `CONTEXT.md` nævner historiske uregelmæssigheder i migrationsrækkefølgen og migrationer, der måtte pushes manuelt. Derfor **skal** vi verificere prod-tilstanden.

**Gør dette nu (2 min) i din terminal:**

```
supabase link --project-ref olszwyeikwbtjcoopfid
supabase migration list --linked
```

Kig i output: står `20260519130000` og `20260519140000` som **anvendt på remote**?

- **Ja** → så er hullerne lukket i prod. Glimrende. Gå videre til P1 nedenfor.
- **Nej / mangler** → kør `supabase db push --linked` straks. Indtil da er borgerdata på tværs af organisationer eksponeret for enhver indlogget bruger, og haven for anonyme. Det er en reel GDPR-hændelse.

---

## Næste lag (P1, efter deploy er bekræftet)

1. **Borger-session-styrke:** Service-role-ruterne stoler på `budr_resident_id`-cookien (middleware validerer den som UUID der findes i `care_residents`, men PIN re-valideres ikke pr. kald). Bekræft at cookien kun udstedes efter rigtig PIN-login, er HttpOnly, og ikke kan forfalskes. Det er det bærende lag for borgerdata.
2. **Audit-dækning:** `create_audit_log` kaldes på borger-journal. Verificér at også personale-adgang til borgerdata logges konsekvent (tilsyn vil spørge).
3. **Test de patientkritiske grænser:** skriv RLS-tests der beviser at org A ikke kan læse org B's borgere, og at borger X ikke kan læse borger Y — så en fremtidig migration ikke genåbner hullet.

---

## CTO-anbefaling

RLS-designet er klar til pilot — **forudsat** migrationerne er kørt på prod. Verificér det først (kommandoen ovenfor), så ved vi om vi står på sikker grund. Derefter er den næste reelle forretningsblokering GDPR/datalokation (Supabase-region vs. løftet om Hetzner Tyskland), som også kræver et hurtigt dashboard-tjek.
