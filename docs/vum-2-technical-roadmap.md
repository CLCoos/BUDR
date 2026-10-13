# VUM 2.0 teknisk roadmap for BUDR

Strategisk dokument der mapper BUDR's eksisterende datamodel til Social- og Boligstyrelsens VUM 2.0-rammeværk. Bruges som teknisk grundlag efter marketing-rewrite og før pilot-samtaler med kommuner.

**Status (2026-05-18):** Sprint 1 påbegyndt — migration `20260518120000_vum_assessments.sql`, API, VUM-fane på beboer-360° (`?tab=vum`). Sprint 2–3 (auto-mapping, PDF) er planlagt.

---

## Hvorfor dette er kritisk vigtigt

VUM 2.0 er ikke valgfrit længere. Citat fra Komponent (KL's kommunale efteruddannelse, 2025):

> "VUM 2.0 og dokumentation i FFB er kommet for at blive. De kommunale myndighedsområder vil fremover også vurdere udførers arbejde med metoden i valg af leverandør."

Konsekvens for BUDR:

- Uden VUM 2.0-understøttelse sortlistes BUDR af kommunale indkøbere
- Med VUM 2.0-understøttelse positionerer BUDR sig som moderne alternativ til Sensum One
- VUM 2.0 har eksplicit recovery som fagligt fokusområde — det matcher CHIME

---

## VUM 2.0's struktur — 11 overtemaer

### Kategori 1: Funktioner og forhold

1. Fysiske funktioner  
2. Mentale funktioner  
3. Sociale og sundhedsmæssige forhold  

### Kategori 2: Aktivitet og deltagelse

4. Kommunikation  
5. Praktiske opgaver  
6. Egenomsorg  
7. Mobilitet  
8. Relationer til andre  
9. Samfundsliv  

### Kategori 3: Omgivelsesfaktorer

10. Personlige faktorer  
11. Omgivelsesfaktorer  

Definitioner og inspirationsspørgsmål i kode: `src/lib/vum/vumThemes.ts`.

---

## Mapping: BUDR datamodel → VUM 2.0

| BUDR-datakilde | VUM 2.0 tema(er) | Aktion |
|----------------|------------------|--------|
| `lys_recovery_profile` (CHIME-felter) | 8, 10, 5 | Direkte / hints — `src/lib/vum/lysToVumHints.ts` |
| `lys_checkin` (mood, CHIME-scores) | 2 | Aggregeret over tid (Sprint 2) |
| `lys_reflection.primary_chime_domain` | 5–10 via mapping | `chime_to_vum_mapping` + Sprint 2 job |
| `lys_next_steps` | Indsatsmål under temaer | Sprint 2 |
| `journal_entries` | 4–9 | Sprint 2 — AI-klassifikation (Haiku) |
| `lys_recovery_stories` | 10 | Sprint 2 |
| `park_daily_checkin` (view → `lys_checkin`) | 2, 10 | Sprint 2 |

**CHIME → VUM:** tabel `chime_to_vum_mapping` + `src/lib/vum/chimeToVumMapping.ts`.

---

## Implementeret (Sprint 1)

### Database

- `vum_assessments` — sagsåbning, 11× `theme_*` JSONB, `function_levels`, `goals`, opfølgning  
- `chime_to_vum_mapping` — referencevægte  
- RLS: `care_staff_can_access_resident` (samme mønster som `lys_*`)  
- Migration: `supabase/migrations/20260518120000_vum_assessments.sql`

**Schema-afvigelser fra tidlig skitse:** `organisations` (ikke `organizations`), `care_residents.user_id` (ikke `residents.id`), `care_staff.id` = auth user.

### API

- `GET/POST /api/portal/vum-assessments?resident_id=`  
- `GET/PATCH /api/portal/vum-assessments/[id]`  
- `GET …?format=json` — eksport (`src/lib/vum/exportVumAssessment.ts`)

### UI

- Beboer-360° → fane **VUM 2.0** (`ResidentVumTab.tsx`)  
- 11 tema-formularer med funktionsniveau 0–4 og inspirationsspørgsmål  
- JSON-eksport fra UI

### Demo-seed (valgfri, manuel)

- `supabase/seed/vum_demo_seed.sql` — kladde-vurdering for Sara K. (`21111111-…`)

---

## Planlagt

### Sprint 2 (uge 3–4): Automatisk mapping

- Job: `lys_reflection` → temaer via CHIME-mapping  
- Job: `lys_next_steps` → indsatsmål  
- AI: journal → temaer (Haiku)  
- Vis hints i VUM-fane fra `lysToVumHints`

### Sprint 3 (uge 5–6): Eksport og rapporter

- PDF til socialtilsyn (Socialstyrelsens layout)  
- Opfølgningsrapport med tidssammenligning  
- Afklaring af Sensum/Nexus import-format

---

## Kommerciel USP (når Sprint 2–3 er live)

Tilføj på `/institutioner` når auto-afledning virker i pilot:

> I dokumenterer recovery-arbejdet i BUDR. Systemet genererer automatisk VUM 2.0-rapporter på baggrund af jeres daglige journal og borgerens refleksioner — ikke som separat skabelon, men som afledning af praksis.

Sensum/Planner4You: VUM som skabelon. BUDR: VUM som afledning af recovery-arbejde.

---

## Drift

1. Kør migration på Supabase: `supabase db push --linked` (efter review)  
2. Valgfrit: kør `supabase/seed/vum_demo_seed.sql` i SQL Editor mod demo-org  
3. Test: `/resident-360-view/21111111-1111-1111-1111-111111111111?tab=vum` (Sara demo)
