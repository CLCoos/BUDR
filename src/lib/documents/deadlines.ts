export type DueState = 'overskredet' | 'i_dag' | 'snart' | 'senere';

/** Hvor tæt er fristen? `today` er en YYYY-MM-DD-dato i dansk tid. */
export function dueState(dueDate: string | null, today: string, soonDays = 7): DueState | null {
  if (!dueDate) return null;
  if (dueDate < today) return 'overskredet';
  if (dueDate === today) return 'i_dag';
  const a = new Date(`${today}T12:00:00Z`).getTime();
  const b = new Date(`${dueDate}T12:00:00Z`).getTime();
  const days = Math.round((b - a) / 86400000);
  return days <= soonDays ? 'snart' : 'senere';
}

export function dueLabel(dueDate: string | null, today: string): string | null {
  if (!dueDate) return null;
  const state = dueState(dueDate, today);
  const a = new Date(`${today}T12:00:00Z`).getTime();
  const b = new Date(`${dueDate}T12:00:00Z`).getTime();
  const days = Math.round((b - a) / 86400000);
  if (state === 'overskredet')
    return days === -1 ? 'Frist var i går' : `Frist overskredet med ${-days} dage`;
  if (state === 'i_dag') return 'Frist i dag';
  if (days === 1) return 'Frist i morgen';
  return `Frist om ${days} dage`;
}
