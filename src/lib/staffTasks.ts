/** Staff Care Portal tasks. Live rows live in `care_staff_tasks`. */

export const TASK_STATUSES = ['åben', 'igangsat', 'afsluttet'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['lav', 'mellem', 'høj'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TITLE_MAX = 500;
export const TASK_ASSIGNEE_MAX = 6;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export type StaffTaskRow = {
  id: string;
  resident_id: string;
  title: string;
  deadline: string;
  assigned_to: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
};

export type StaffTaskInsertInput = {
  orgId: string;
  createdBy: string | null;
  residentId: string;
  title: string;
  deadlineYmd: string;
  assignedTo: string;
  priority: TaskPriority;
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function isDeadlineYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !YMD_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function normalizeAssignee(raw: string): string {
  return raw.trim().toUpperCase().slice(0, TASK_ASSIGNEE_MAX);
}

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  const compact = name.trim().replace(/[^A-Za-zÆØÅæøå]/g, '');
  return compact.slice(0, 2).toUpperCase() || '?';
}

export function deadlineDayLabelFromYmd(
  deadlineYmd: string,
  todayYmd: string
): 'overdue' | 'today' | 'future' {
  if (deadlineYmd < todayYmd) return 'overdue';
  if (deadlineYmd === todayYmd) return 'today';
  return 'future';
}

export function isDeadlineOnOrBefore(deadlineYmd: string, todayYmd: string): boolean {
  return deadlineYmd <= todayYmd;
}

/** Stable Date for UI labels — noon UTC so Copenhagen civil date matches `deadline` date. */
export function deadlineYmdToDate(ymd: string): Date {
  if (!isDeadlineYmd(ymd)) return new Date();
  return new Date(`${ymd}T12:00:00.000Z`);
}

export function requiredStaffTaskFieldsMissing(input: {
  residentId: string;
  title: string;
  deadlineYmd: string;
  assignedTo: string;
  priority: string;
}): string[] {
  const missing: string[] = [];
  if (!input.residentId.trim()) missing.push('residentId');
  if (!input.title.trim()) missing.push('title');
  if (!isDeadlineYmd(input.deadlineYmd)) missing.push('deadline');
  if (!normalizeAssignee(input.assignedTo)) missing.push('assignedTo');
  if (!isTaskPriority(input.priority)) missing.push('priority');
  return missing;
}

export function canSaveStaffTask(input: {
  residentId: string;
  title: string;
  deadlineYmd: string;
  assignedTo: string;
  priority: string;
}): boolean {
  return requiredStaffTaskFieldsMissing(input).length === 0;
}

export function buildStaffTaskInsertRow(input: StaffTaskInsertInput): Record<string, unknown> {
  return {
    org_id: input.orgId,
    created_by: input.createdBy,
    resident_id: input.residentId,
    title: input.title.trim().slice(0, TASK_TITLE_MAX),
    deadline: input.deadlineYmd,
    assigned_to: normalizeAssignee(input.assignedTo),
    status: 'åben',
    priority: input.priority,
  };
}

export function parseStaffTaskRow(row: Record<string, unknown>): StaffTaskRow | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const residentId = typeof row.resident_id === 'string' ? row.resident_id : null;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  const deadline = typeof row.deadline === 'string' ? row.deadline.slice(0, 10) : '';
  const assignedTo = typeof row.assigned_to === 'string' ? row.assigned_to : '';
  if (!id || !residentId || !title || !isDeadlineYmd(deadline)) return null;
  if (!isTaskStatus(row.status) || !isTaskPriority(row.priority)) return null;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
  return {
    id,
    resident_id: residentId,
    title,
    deadline,
    assigned_to: assignedTo,
    status: row.status,
    priority: row.priority,
    created_at: createdAt,
  };
}
