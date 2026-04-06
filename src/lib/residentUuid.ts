/** Beboer-ID i cookie der kan gemmes i Supabase (uuid) — ikke demo- eller gæste-præfiks. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isResidentUuidForCloud(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id.trim());
}
