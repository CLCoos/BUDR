## Summary

- What user-facing problem does this PR solve?
- Why is this change needed now?

## Scope

- [ ] UI
- [ ] API
- [ ] Database migration / RLS
- [ ] AI behavior / prompts / model usage
- [ ] Docs / runbook updates

## Database & RLS Checklist (required when DB touched)

- [ ] I added/updated migration file(s) under `supabase/migrations/`
- [ ] Migration naming follows timestamp convention and intent is clear
- [ ] I documented affected tables/policies in this PR
- [ ] I validated staff/resident org scoping and RLS behavior
- [ ] I noted if `supabase db push --linked --include-all` is required post-merge
- [ ] I documented any `migration repair` or legacy caveats (if relevant)

### Migration IDs in this PR

<!-- Example: 20260428162000_lys_safety_events.sql -->

## Safety & Risk (required)

- [ ] This PR does not weaken auth/session/middleware protections
- [ ] Rate limits were reviewed for any new or changed write endpoints
- [ ] AI output remains draft/assistive where clinically required
- [ ] Potential regressions and mitigations are listed below

### Risks / Mitigations

- Risk:
- Mitigation:

## Demo vs Live Parity

- [ ] I verified expected behavior in relevant live path(s)
- [ ] I verified corresponding demo path(s), or documented intentional differences
- [ ] I documented any new divergence between demo and live

## Verification

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] Optional: `npm run test`
- [ ] Optional: `npm run eval:safety`

### Manual smoke steps

1.
2.
3.

## Docs Updated

- [ ] `CONTEXT.md` updated with date + delivered snapshot
- [ ] `README.md` updated if workflows/routes/ops changed
- [ ] Other docs updated: <!-- e.g. docs/migrations-playbook.md -->
