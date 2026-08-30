import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/20260811110500_notification_types_session_safety_ack.sql'
);

describe('notification types + session/safety ack migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('expands care_portal_notifications type CHECK with mood_alert and medication_missed', () => {
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS care_portal_notifications_type_check/i);
    expect(sql).toMatch(/ADD CONSTRAINT care_portal_notifications_type_check/i);
    expect(sql).toMatch(/mood_alert/);
    expect(sql).toMatch(/medication_missed/);
    expect(sql).toMatch(/lav_stemning/);
    expect(sql).toMatch(/krise/);
  });

  it('drops staff UPDATE on resident_sessions (prevents session_token_hash forgery)', () => {
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS resident_sessions_staff_revoke_own_org ON public\.resident_sessions/i
    );
  });

  it('adds lys_safety_events ack-only UPDATE trigger', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.lys_safety_events_ack_only/i);
    expect(sql).toMatch(/only acknowledged_at\/acknowledged_by may be updated/i);
    expect(sql).toMatch(/CREATE TRIGGER lys_safety_events_ack_only_trg/i);
    expect(sql).toMatch(/BEFORE UPDATE ON public\.lys_safety_events/i);
  });
});
