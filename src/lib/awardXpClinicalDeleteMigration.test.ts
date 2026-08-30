import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LYS_CHECKIN_REALTIME_TABLE,
  mapLysCheckinRealtimePayload,
} from '@/lib/lysCheckinRealtime';

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/20260810110500_award_xp_and_clinical_delete_revoke.sql'
);

describe('award_xp + clinical DELETE revoke migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('revokes award_xp from anon/authenticated and grants service_role', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.award_xp\(uuid, text, integer\) FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.award_xp\(uuid, text, integer\) FROM anon/i);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.award_xp\(uuid, text, integer\) FROM authenticated/i
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.award_xp\(uuid, text, integer\) TO service_role/i
    );
  });

  it('drops crisis_alerts DELETE and FOR ALL org policy', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS crisis_alerts_staff_delete/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS staff_crisis_alerts_org/i);
    expect(sql).toMatch(/REVOKE DELETE ON public\.crisis_alerts FROM authenticated/i);
  });

  it('drops lys_conversations DELETE policies and revokes DELETE', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS lc_staff_delete/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS lc_resident_delete/i);
    expect(sql).toMatch(/REVOKE DELETE ON public\.lys_conversations FROM authenticated/i);
  });
});

describe('lysCheckinRealtime mapping', () => {
  it('uses lys_checkin as realtime table', () => {
    expect(LYS_CHECKIN_REALTIME_TABLE).toBe('lys_checkin');
  });

  it('maps daily lys_checkin free_text to note', () => {
    const mapped = mapLysCheckinRealtimePayload({
      resident_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      mood_score: 2,
      traffic_light: 'rød',
      free_text: 'har det svært',
      checkin_type: 'daily',
      created_at: '2026-08-10T10:00:00.000Z',
    });
    expect(mapped).toEqual({
      resident_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      mood_score: 2,
      traffic_light: 'rød',
      note: 'har det svært',
      created_at: '2026-08-10T10:00:00.000Z',
    });
  });

  it('ignores non-daily check-ins', () => {
    expect(
      mapLysCheckinRealtimePayload({
        resident_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        mood_score: 5,
        traffic_light: 'gul',
        free_text: null,
        checkin_type: 'weekly',
        created_at: '2026-08-10T10:00:00.000Z',
      })
    ).toBeNull();
  });

  it('returns null for missing resident_id', () => {
    expect(
      mapLysCheckinRealtimePayload({
        mood_score: 5,
        created_at: '2026-08-10T10:00:00.000Z',
      })
    ).toBeNull();
  });
});
