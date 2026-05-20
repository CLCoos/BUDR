# Audit: 360° borgerindblik (Care Portal)

**Dato:** 2026-05-19  
**Formål:** Dokumentere nuværende tilstand før demo-seed og konsolidering. Kun læsning af kode — ingen ændringer i app eller data.

---

## 1. Routing og indgang

### Live produktion (primær sti)

| Trin | Rute | Fil |
|------|------|-----|
| Beboerliste | `/resident-360-view` | `src/app/resident-360-view/page.tsx` → `ResidentOverviewGrid.tsx` |
| Klik på borger | `/resident-360-view/[residentId]?tab=<tab>` | `src/app/resident-360-view/[residentId]/page.tsx` |
| Journal på tværs | `/resident-360-view/dagbog` | `src/app/resident-360-view/dagbog/page.tsx` (egen side, ikke faner på borger) |

**Navigation fra dashboard:** `ResidentList.tsx` og `AlertPanel` linker til `/resident-360-view/{uuid}?tab=overblik` (eller `lys-samtaler`).

**Sidebar:** `PortalSidebar.tsx` — ved normal drift peger «Beboere» på `/resident-360-view` (`carePortalPilotSimulatedData()` = false).

### Pilot / simuleret data

| Rute | Fil | Adfærd |
|------|-----|--------|
| `/care-portal-resident-preview/[residentId]` | `src/app/care-portal-resident-preview/[residentId]/page.tsx` | Hvis **ikke** pilot: `redirect` til live `/resident-360-view/...`. Hvis pilot: `ResidentDemo360Client` (mock) |
| `/care-portal-residents` | `src/app/care-portal-residents/page.tsx` | **Ikke** 360° — kun leder-PIN-admin (`ResidentsOpsClient`), ikke borgerliste |

### Demo (marketing / guided tour)

| Rute | Fil |
|------|-----|
| `/care-portal-demo/residents/[residentId]` | `ResidentDemo360Client.tsx` (~1486 linjer) — mock fra `careDemoResidentDetail.ts`, **ingen Supabase** |

### Query-parametre (live)

- `?tab=` — se faner nedenfor (default `overblik`)
- `?writeJournal=1` — åbner `WriteJournalEntry` modal
- `?conversationId=` — bruges på `lys-samtaler` (client-side i `ResidentLysSamtalerTab`)

---

## 2. Live 360° — faner og komponenter

**Orkestrator:** `src/app/resident-360-view/[residentId]/page.tsx` (~538 linjer, RSC + `fetchResidentData`).

**Fælles chrome (alle faner):**

| Komponent | Sti | ~Linjer | Aktiv? | Tabeller / data |
|-----------|-----|---------|--------|-----------------|
| `PortalShell` | `@/components/PortalShell` | — | Ja | — |
| `ResidentHeader` | `components/ResidentHeader.tsx` | 272 | Ja | Props fra page (`care_residents` + `park_daily_checkin` + `plan_proposals` count) |
| `WriteJournalEntry` | `[residentId]/components/WriteJournalEntry.tsx` | 988 | Ja | **Skriver** `journal_entries`; læser `care_staff` |
| `ResidentOverflowMenu` | `[residentId]/components/ResidentOverflowMenu.tsx` | 77 | Ja | Export fra props (journal, concern, medicin, plan) |
| `ResidentExportModule` | `[residentId]/components/ResidentExportModule.tsx` | 346 | Ja (via menu) | Ingen DB — PDF/tekst fra `ResidentExportInput` |

### Faner (`ALL_TABS` i page.tsx)

| Tab (`?tab=`) | Label | Komponent | ~Linjer | Importeret fra page? | Hvad vises |
|---------------|-------|-----------|---------|----------------------|------------|
| `overblik` | Overblik | `ResidentActiveDevices` | 179 | Ja (først) | Aktive borger-sessioner via `/api/portal/resident-sessions` → `resident_sessions` |
| | | `ResidentOverblikTab` | 763 | Ja | Trafiklys/humør (check-in), medicin-tæller (localStorage), dagsplan-preview, journal i dag, bekymringsnotater, `GoalProgress`, `ShiftNotesFeed` |
| `recovery` | Recovery | `ResidentRecoveryTab` | 361 | Ja | CHIME-profil, ugentlige check-ins, `lys_next_steps`, `lys_reflection` (via `lys-queries`) |
| `medicin` | Medicin | `ResidentMedicinTab` | 526 | Ja | `resident_medications` + `medication_reminders` (CRUD) |
| `dagsplan` | Dagsplan | `DagsPlanPortal` | 513 | Ja | `daily_plans`, `plan_proposals`; mood-graf via `MoodTrendChart` |
| `plan` | Plan | `ResidentPlanTab` | 598 | Ja | `resident_plan_items`, `resident_xp`, `resident_badges`, `crisis_plans` |
| `haven` | Haven 🌿 | `ResidentHavenTab` | 176 | Ja | `garden_plots` |
| `lys-samtaler` | Lys-samtaler | `ResidentLysSamtalerTab` | 330 | Ja (dashboard) | `lys_conversations`, `lys_safety_events` |

### Underkomponenter på Overblik

| Komponent | Sti | ~Linjer | Aktiv? | Tabeller |
|-----------|-----|---------|--------|----------|
| `GoalProgress` | `components/GoalProgress.tsx` | 456 | Ja (`variant="live"`) | **`park_goals` + `park_goal_steps`** (tabeller droppet i migration — se §5) |
| `ShiftNotesFeed` | `components/ShiftNotesFeed.tsx` | 490 | Ja (`variant="live"`) | `journal_entries` (godkendt, 28 dage) |
| `JournalRowRecoveryStory` | `[residentId]/components/JournalRowRecoveryStory.tsx` | 63 | Ja | Viser `lys_recovery_stories` knyttet til journal |
| `MoodTrendChart` | `components/MoodTrendChart.tsx` | 278 | Ja (i Dagsplan) | `park_daily_checkin` (view → `lys_checkin`) |

### Server-fetch på page (delt på tværs af faner)

`fetchResidentData` læser parallelt:

- `care_residents`
- `park_daily_checkin` (seneste i dag)
- `daily_plans` (dagens dato)
- `plan_proposals` (pending)
- `journal_entries` (i dag + 90d export)
- `resident_medications`
- `care_concern_notes` (export)
- `lys_recovery_stories` (for journal med kategori «Lys journal»)
- `getRecoveryProfile` → `lys_recovery_profile`
- `getActiveNextSteps` → `lys_next_steps`
- `getReflectionHistory` → `lys_reflection`
- `getCheckinHistory` → `lys_checkin` (filtreret til `checkin_type === 'weekly'` på Recovery)

---

## 3. Død / forældet kode (ikke i live 360-flow)

| Komponent | Sti | ~Linjer | Problem |
|-----------|-----|---------|---------|
| `Resident360Client` | `components/Resident360Client.tsx` | 86 | **Ingen imports** i codebase. Lys tema, mock-data, faner `overview` / `park` / `goals` / `medication` / `notes` |
| `ParkSummary` | `components/ParkSummary.tsx` | 145 | Kun brugt af `Resident360Client` |
| `MedicationList` | `components/MedicationList.tsx` | 179 | Kun brugt af `Resident360Client` (live bruger `ResidentMedicinTab`) |

---

## 4. Demo 360 vs live — struktur

**Demo** (`ResidentDemo360Client`): én lang scroll-side med **sektions-nav** (ikke samme 7 faner som live):

`status`, `borgerapp`, `oversigt`, `assistent`, `indtjek`, `dagsplan`, `haendelser`, `skabeloner`, `aftaler`, `medicin`, `planer`, `haven`, `maal`, `journal`, `dokumenter` — alt fra `getResidentDemoDetail()`, ingen DB.

**Mapping demo `?tab=` → sektion:** `TAB_TO_SECTION` (fx `goals` → `maal`, `plan` → `planer`).

Risiko: staff der sammenligner demo og prod forventer samme faner — **konceptuelt divergerende UX**.

---

## 5. Dubletter og overlap

### Check-in / humør / trafiklys

| Sted | Kilde | Bemærkning |
|------|-------|------------|
| Header + Overblik | `park_daily_checkin` | View over `lys_checkin WHERE checkin_type = 'daily'` |
| Dagsplan | `MoodTrendChart` | Samme view, historik |
| Recovery | `lys_checkin` direkte | Ugentlige (`checkin_type = 'weekly'`) med CHIME-scores |
| `daily_checkins` | — | **Bruges ikke** i 360° (KRAP/legacy `profile_id`) |

**Overlap:** Dagligt humør vises på Overblik **og** som trend under Dagsplan; Recovery viser **anden** check-in-type (ugentlig CHIME) — ikke dublet, men forvirrende navngivning.

### Plan / mål / dagsplan

| Koncept | UI | Tabel | Rolle |
|---------|-----|-------|-------|
| **Dagsplan** | Fanen `dagsplan` + preview på Overblik | `daily_plans`, `plan_proposals` | Tidslinje **i dag**, AI-forslag godkendes af staff |
| **Plan** | Fanen `plan` | `resident_plan_items`, `crisis_plans`, XP/badges | **Gentagne** borger-planpunkter + kriseplan + gamification |
| **Mål / måltrappe** | `GoalProgress` på Overblik | `park_goals` / `park_goal_steps` | **Legacy** — tabeller droppet; erstattet af `lys_next_steps` (kun Recovery-fane) |

**Overlap:** «Plan i dag» på Overblik (`daily_plans`) vs «Planpunkter» på Plan (`resident_plan_items`) — to forskellige produkter, lignende ord. Demo har ekstra «Mål»-sektion (mock) uden live pendant efter migration.

### Journal vs bekymring vs vagtnotat-feed

| UI | Tabel | Scope |
|----|-------|-------|
| Journal i dag (Overblik) | `journal_entries` | I dag, kladde/godkendt |
| ShiftNotesFeed «Vagtnotater» | `journal_entries` | Godkendt, 28 dage — **samme tabel**, andet filter/UI |
| Bekymringsnotater (Overblik) | `care_concern_notes` | Hurtige notater fra dashboard |
| Header «Skriv vagtnotat» | Link til `/handover-workspace` | **Ikke** journal direkte |

**Overlap:** Journal vises to steder på Overblik (kompakt «i dag» + feed). Bekymring er bevidst adskilt (tekst i UI).

### Recovery-indhold

| Indhold | Recovery-fane | Overblik |
|---------|---------------|----------|
| `lys_recovery_profile` | Ja | Nej |
| `lys_reflection` | Ja | Nej |
| `lys_next_steps` | Ja | Nej |
| `lys_recovery_stories` | Nej (kun ved Lys-journal-rækker) | Ja, under journal |
| `GoalProgress` / park_goals | Nej | Ja — **tom/fejl** efter schema-migration |

### Safety / krise

| Tabel | I 360°? | Hvor ellers |
|-------|---------|-------------|
| `crisis_plans` | Ja — **Plan**-fanen (redigerbar) | — |
| `lys_safety_events` | Ja — **Lys-samtaler** | Dashboard alerts via API |
| `crisis_alerts` | **Nej** i 360° | `AlertPanel`, `/api/lys/crisis-alert` |

---

## 6. Mystiske / svage UX-elementer

1. **`display_name` vs `first_name` + `last_name`**  
   Page bruger `formatResidentName(..., 'full_name')` på detail; liste bruger org `resident_name_display_mode`. `display_name` er stadig NOT NULL i DB men kan være redundant.

2. **Medicin «givet» på Overblik**  
   Tæller fra **localStorage** (`budr_med_v1_{residentId}_{date}`), ikke `medication_reminders` eller DB — kan vise 0/3 selvom journal siger medicin givet.

3. **`GoalProgress` live**  
   Queries droppede tabeller → tom state «Ingen aktive mål» uden forklaring om migration til Recovery/`lys_next_steps`.

4. **Header «Skriv vagtnotat»**  
   Går til vagtoverlevering, ikke `WriteJournalEntry` (som hedder journal i action bar).

5. **Bekymringsnotater**  
   Link «Åbn dashboard» — kan ikke oprette fra 360.

6. **`ResidentActiveDevices`**  
   Ny sektion øverst på Overblik; kun relevant når `resident_sessions` har rækker.

7. **Voice transcript toggle**  
   Kun hvis `park_daily_checkin`/`lys_checkin` har `voice_transcript` — ellers skjult.

8. **Plan-fanen audit-log**  
   `saveCrisisPlan` logger `action: 'daily_plan.updated'` på `crisis_plans` — misvisende action-navn.

9. **Pilot `care-portal-residents`**  
   Navn lyder som beboerliste, men er PIN-værktøj for ledere.

---

## 7. Tabel-konsolidering — hvor bruges hvad?

### Check-in: `daily_checkins` vs `park_daily_checkin` vs `lys_checkin`

| Tabel/view | Brugt i 360°? | Brugt andetsteds (uddrag) |
|------------|---------------|---------------------------|
| `daily_checkins` | **Nej** | KRAP migration / `profile_id`-ejerskab |
| `park_daily_checkin` | **Ja** (view) | 360 page, liste, `MoodTrendChart`; filtrerer `lys_checkin.checkin_type = 'daily'` |
| `lys_checkin` | **Ja** (indirekte + Recovery) | API `/api/lys/daily-checkin`, `weekly-reflection`, `lys-queries` |

**Anbefaling før seed:** Skriv demo-check-ins til **`lys_checkin`** (`daily` + evt. `weekly`); view giver gratis kompatibilitet med eksisterende queries.

### Plan: `goals` vs `resident_plan_items` vs `daily_plans` vs `care_planner_entries`

| Tabel | 360°? | Andet |
|-------|-------|-------|
| `goals` | **Nej** | KRAP (`profile_id`) |
| `resident_plan_items` | **Ja** — Plan-fane | `park-hub` `LysDagTab`, `dataService` |
| `daily_plans` | **Ja** — Dagsplan + Overblik preview | Godkend via `/api/portal/approve-proposal` |
| `plan_proposals` | **Ja** | Realtime i `DagsPlanPortal` |
| `care_planner_entries` | **Nej** | `CareTeamPlannerStrip` (dashboard planner) |

### Safety: `crisis_alerts` vs `crisis_plans` vs `lys_safety_events`

| Tabel | 360°? | Andet |
|-------|-------|-------|
| `crisis_plans` | **Ja** — Plan-fane (staff redigerer) | Borger-flow i park-hub |
| `crisis_alerts` | **Nej** | Dashboard `AlertPanel`, oprettes fra Lys API |
| `lys_safety_events` | **Ja** — Lys-samtaler | `safetyEventsService`, `lys-chat` route |

### Recovery: `lys_reflection` vs `lys_recovery_stories` vs `lys_next_steps`

| Tabel | 360°? | Andet |
|-------|-------|-------|
| `lys_reflection` | **Ja** — Recovery | `/api/lys/reflection` |
| `lys_next_steps` | **Ja** — Recovery | Erstatter `park_goals`; `/api/lys/next-step` |
| `lys_recovery_stories` | **Ja** — journal-rækker (Lys journal) | `/api/lys/my-stories`, journal synthesis |
| `lys_recovery_profile` | **Ja** — Recovery | `/api/lys/resident-me` |

### Notater: `care_concern_notes` vs `journal_entries`

| Tabel | 360°? | Formål |
|-------|-------|--------|
| `journal_entries` | **Ja** (mange steder) | Formel journal, kladde/godkendt, export, ShiftNotesFeed |
| `care_concern_notes` | **Ja** (Overblik + export) | Hurtige observationer fra dashboard — **ikke** godkendelsesflow |

---

## 8. Konklusioner til seed / oprydning (kun beslutningsstøtte)

**Behold som kerne for live 360 demo-data:**

- `care_residents`, `park_daily_checkin` (via `lys_checkin` daily)
- `daily_plans` / `plan_proposals`
- `journal_entries`, `care_concern_notes`
- `resident_medications`, `medication_reminders`
- `resident_plan_items`, `crisis_plans`
- `lys_recovery_profile`, `lys_reflection`, `lys_next_steps`, `lys_conversations`, `lys_safety_events`
- `garden_plots` (Haven)
- `resident_sessions` (hvis device-demo ønskes)

**Fjern / migrér kode før eller efter seed:**

- `GoalProgress` → peg på `lys_next_steps` eller fjern fra Overblik
- `Resident360Client`, `ParkSummary`, `MedicationList` → død kode
- Overvej at samle journal-visning (i dag vs ShiftNotesFeed)

**Align demo vs live:**

- Demo har 15+ sektioner; live har 7 faner — dokumentér for testere at pilot-preview kan vise mock.

---

## 9. Fil-indeks (live 360)

```
src/app/resident-360-view/
  page.tsx                          # Liste
  [residentId]/page.tsx             # Detail + fetch
  [residentId]/components/
    ResidentOverblikTab.tsx
    ResidentRecoveryTab.tsx
    ResidentMedicinTab.tsx
    DagsPlanPortal.tsx
    ResidentPlanTab.tsx
    ResidentHavenTab.tsx
    ResidentActiveDevices.tsx
    WriteJournalEntry.tsx
    ResidentOverflowMenu.tsx
    ResidentExportModule.tsx
    JournalRowRecoveryStory.tsx
  components/
    ResidentHeader.tsx
    ResidentOverviewGrid.tsx
    GoalProgress.tsx
    ShiftNotesFeed.tsx
    MoodTrendChart.tsx
  dagbog/page.tsx                   # Separat journal-overblik

src/app/care-portal-dashboard/components/
  ResidentLysSamtalerTab.tsx        # Importeret i live detail
```
