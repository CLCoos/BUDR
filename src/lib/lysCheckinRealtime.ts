/**
 * Dashboard realtime must listen to `lys_checkin` (published table).
 * After the Lys recovery migration, `park_daily_checkin` is only a view and
 * does not emit postgres_changes events — live traffic lights / mood alerts
 * would never fire if clients still subscribed to the old table name.
 */

export const LYS_CHECKIN_REALTIME_TABLE = 'lys_checkin' as const;

export type LysCheckinRealtimeRow = {
  resident_id: string;
  mood_score: number | null;
  traffic_light: string | null;
  note: string | null;
  created_at: string;
};

/** Map a Realtime payload from lys_checkin; ignore non-daily check-ins. */
export function mapLysCheckinRealtimePayload(
  raw: Record<string, unknown> | null | undefined
): LysCheckinRealtimeRow | null {
  if (!raw || typeof raw !== 'object') return null;

  const checkinType = raw.checkin_type;
  if (typeof checkinType === 'string' && checkinType !== 'daily') {
    return null;
  }

  const residentId = raw.resident_id;
  const createdAt = raw.created_at;
  if (typeof residentId !== 'string' || !residentId.trim()) return null;
  if (typeof createdAt !== 'string' || !createdAt) return null;

  const freeText = raw.free_text;
  const noteFallback = raw.note;
  const note =
    typeof freeText === 'string'
      ? freeText
      : typeof noteFallback === 'string'
        ? noteFallback
        : freeText === null || noteFallback === null
          ? null
          : null;

  const moodScore = raw.mood_score;
  const trafficLight = raw.traffic_light;

  return {
    resident_id: residentId,
    mood_score: typeof moodScore === 'number' ? moodScore : null,
    traffic_light: typeof trafficLight === 'string' ? trafficLight : null,
    note,
    created_at: createdAt,
  };
}
