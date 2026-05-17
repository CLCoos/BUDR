# Care Portal — interaktiv DEMO

Ruten **`/care-portal-demo`** i BUDR-webappen er en **fuld interaktiv demo** af Care Portal med **simuleret indhold**.

## Hvad demoen er

- **Ikke** en rigtig patientjournal og **ikke** koblet til jeres Supabase-produktion som beboerdata.
- **Fiktive** beboere, notater, medicin, beskeder og AI-udkast — til produktvisning og uddannelse.
- Samme **UI-mønstre** som efter login, så besøgende kan forstå arbejdsgange uden adgang til rigtige data.

## Hvor det står i produktet

- Fast **DEMO-bånd** under topnavigationen på alle `/care-portal-demo/*`-sider.
- Browserfanens titel: **«Care Portal (DEMO)»** (via layout-metadata).
- Siden **«Om demoen»**: `/care-portal-demo/om-demo`.
- Velkomst-overlay på dashboard med trinvis intro (kan lukkes) + knap **«Start guidet tour (ca. 5 min.)»**.
- **Guidet tour** (7 trin): flydende knap *Guidet tour* / *Genstart tour* på `/care-portal-demo` og `/resident-demo` — navigerer gennem overblik, advarsler, beboere, 360°, vagtoverlevering, Lys og afslutning med CTA. Trin gemmes ikke i database; *Spring over* sætter kun en “gennemført”-markering i `localStorage` (`budr_care_portal_demo_guided_tour_done`).
- **WhyBox**-forklaringer (sammenklappelige) på udvalgte demo-flader: AI/godkendelse, advarsler, journal, vagtoverlevering, Lys, **Faglig støtte** (`/care-portal-demo/assistant`) og **Dataimport** (`/care-portal-demo/import`).

## Drift og miljø

- Demo-ruter kræver **ikke** staff-login.
- Pilot-simulering i live portal styres separat med `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA` (se `CONTEXT.md`).

## Ansvar

Demo må **ikke** bruges som dokumentation for myndigheder eller som klinisk beslutningsgrundlag. Al output fra AI-funktioner i demoen er **illustration**.
