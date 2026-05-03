# Release Checklist (BUDR)

Brug denne ved hver lille release-train (fx man/ons/fre) eller hotfix.

## 1) Scope og risiko

- [ ] Hvilke brugerflows påvirkes?
- [ ] Er der DB-migration i releasen?
- [ ] Er der AI-ændringer (prompt/model/klassifikation)?
- [ ] Er der middleware/auth/session påvirkning?

## 2) Kvalitetsporte

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] `npm run test` (hvis relevant)
- [ ] `npm run eval:safety` (hvis Lys safety/AI berørt)

## 3) Drift og konfiguration

- [ ] Nye env vars er dokumenteret
- [ ] Netlify env vars er sat i korrekt miljø
- [ ] Migration push-plan er klar (hvis relevant)
- [ ] Eventuelle feature flags er sat korrekt

## 4) Smoke (5-10 min)

- [ ] Staff login + dashboard
- [ ] `resident-360-view` nøglefaner
- [ ] `/park-hub` basale resident-flows
- [ ] Berørte API-ruter returnerer forventet status
- [ ] Demo/live parity tjekket for berørt feature

## 5) Release note (kort)

Brug denne skabelon:

```md
## Ændret
- ...

## DB påvirkning
- Migrationer: ...
- Driftsskridt: ...

## Risiko
- ...

## Smoke udført
- ...
```

## 6) Efter release

- [ ] Overvåg errors/logs de første 30-60 min
- [ ] Opdater `CONTEXT.md` med dato + kort leverance
- [ ] Luk/ajourfør relevante TODO-punkter
