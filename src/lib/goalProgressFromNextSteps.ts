/** Maps lys_next_steps rows (recovery schema) onto the 360° GoalProgress widget. */

export type GoalProgressStep = {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
};

export type GoalProgressItem = {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  steps: GoalProgressStep[];
};

export type NextStepLike = {
  id: string;
  title: string | null;
  description?: string | null;
  created_by_type?: string | null;
  created_at: string;
  status?: string | null;
  completed_at?: string | null;
  resident_note?: string | null;
};

export function formatGoalDateDa(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Copenhagen',
  });
}

export function createdByLabel(createdByType: string | null | undefined): string {
  if (createdByType === 'staff') return 'Personale';
  if (createdByType === 'resident') return 'Borger';
  return '—';
}

export function mapLysNextStepsToGoals(rows: NextStepLike[]): GoalProgressItem[] {
  return rows.map((row) => {
    const completed = row.status === 'fuldført';
    const detail =
      (row.description ?? '').trim() ||
      (row.resident_note ?? '').trim() ||
      (row.title ?? '').trim();
    return {
      id: row.id,
      title: (row.title ?? '').trim() || '—',
      createdBy: createdByLabel(row.created_by_type),
      createdAt: formatGoalDateDa(row.created_at),
      steps: [
        {
          id: `${row.id}-body`,
          text: detail || '—',
          completed,
          completedAt:
            completed && row.completed_at ? formatGoalDateDa(row.completed_at) : undefined,
        },
      ],
    };
  });
}
