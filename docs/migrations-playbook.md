# Migrations Playbook (BUDR)

Kort, praktisk playbook for sikre DB-ændringer i Supabase.

## 1) Før du skriver migrationen

- Definer scope: hvilke tabeller, policies, views og API-ruter påvirkes.
- Afgør om ændringen er additive (sikker) eller breaking (kræver ekstra plan).
- Planlæg hvordan demo/live påvirkes forskelligt.

## 2) Filnavn og placering

- Nye migrationer oprettes under `supabase/migrations/`.
- Brug timestamp-navn: `YYYYMMDDHHMMSS_kort_beskrivelse.sql`.
- Én migration = ét klart formål. Undgå "kitchen sink"-filer.

## 3) RLS-standard for BUDR

- Staff-adgang skal være org-scopet.
- Resident-adgang må kun gælde egen data.
- Service-role bypass skal være eksplicit og kun på server-side ruter.
- Dokumenter policy-intention i SQL-kommentarer ved ikke-trivielle regler.

## 4) Lokal validering (minimum)

1. Kør migration lokalt.
2. Verificer centrale queries i både staff- og resident-kontekst.
3. Kør:
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`

## 5) PR-krav for DB-ændringer

- List migration-id'er i PR-beskrivelsen.
- Beskriv hvilke ruter/features der afhænger af migrationen.
- Beskriv evt. backfill/repair-behov.
- Angiv post-merge driftsskridt (fx `supabase db push --linked --include-all`).

## 6) Production rollout

1. Bekræft at repo er linked mod korrekt project ref.
2. Kør push i kontrolleret vindue.
3. Kør smoke på de ruter der bruger de nye kolonner/policies.
4. Notér resultat i `CONTEXT.md` med dato.

## 7) Legacy/repair-håndtering

- Hvis historik er ujævn (fx gamle version-konflikter), dokumentér:
  - hvad problemet var
  - hvilken `migration repair` der blev brugt
  - hvorfor det er sikkert
- Skriv altid et kort "operational note" i PR + `CONTEXT.md`.

## 8) Hurtig checklist

- [ ] Migration har tydeligt navn og afgrænset scope
- [ ] RLS/org-scope er verificeret
- [ ] Live + demo impact er dokumenteret
- [ ] Build/lint/type-check er kørt
- [ ] Driftsskridt er skrevet i PR/CONTEXT
