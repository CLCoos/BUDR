/**
 * XP for Lys-aktiviteter. Serveren bestemmer beløbet; klienten sender kun aktiviteten.
 * Kun aktiviteter, som award_xp() har en anti-spam-kolonne for, giver XP i skyen.
 */
export const LYS_XP_BY_ACTIVITY = {
  journal: 15,
  lys_chat: 10,
} as const;

export type LysXpActivity = keyof typeof LYS_XP_BY_ACTIVITY;

export function isLysXpActivity(value: unknown): value is LysXpActivity {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(LYS_XP_BY_ACTIVITY, value)
  );
}

/** Fire-and-forget fra browseren; borgeren afgøres af sessions-cookien på serveren. */
export function requestLysXp(activity: LysXpActivity): void {
  void fetch('/api/lys/xp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity }),
  }).catch(() => undefined);
}
