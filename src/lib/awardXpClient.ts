/** Client helper: award XP via cookie-bound Route Handler (not public RPC). */
export async function requestAwardXp(activity: string, xp: number): Promise<void> {
  try {
    await fetch('/api/lys/award-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ activity, xp }),
    });
  } catch {
    /* best-effort gamification */
  }
}
