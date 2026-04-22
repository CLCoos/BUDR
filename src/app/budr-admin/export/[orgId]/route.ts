import JSZip from 'jszip';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type JsonRow = Record<string, unknown>;

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toCsv(rows: JsonRow[]): string {
  if (rows.length === 0) return 'id\n';
  const keys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => csvEscape(row[k])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
): Promise<Response> {
  const { orgId } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return new Response('Server ikke konfigureret', { status: 503 });
  }
  const adminClient = admin;

  const { data: org, error: orgErr } = await adminClient
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  if (orgErr) return new Response(orgErr.message, { status: 500 });
  if (!org) return new Response('Organisation ikke fundet', { status: 404 });

  const { data: residents, error: residentsErr } = await adminClient
    .from('care_residents')
    .select('user_id')
    .eq('org_id', orgId);
  if (residentsErr) return new Response(residentsErr.message, { status: 500 });
  const residentIds = (residents ?? [])
    .map((r) => (typeof r.user_id === 'string' ? r.user_id : null))
    .filter((v): v is string => !!v);

  const { data: columnRows, error: columnErr } = await adminClient
    .schema('information_schema')
    .from('columns')
    .select('table_name,column_name')
    .eq('table_schema', 'public')
    .in('column_name', ['org_id', 'resident_id']);
  if (columnErr) return new Response(columnErr.message, { status: 500 });

  const tableColumns = new Map<string, Set<string>>();
  for (const row of columnRows ?? []) {
    const tableName = typeof row.table_name === 'string' ? row.table_name : null;
    const columnName = typeof row.column_name === 'string' ? row.column_name : null;
    if (!tableName || !columnName) continue;
    if (!tableColumns.has(tableName)) tableColumns.set(tableName, new Set<string>());
    tableColumns.get(tableName)?.add(columnName);
  }

  const zip = new JSZip();
  zip.file('organisations.csv', toCsv([org as JsonRow]));

  async function fetchTableRows(
    table: string,
    mode: 'audit' | 'org' | 'resident',
    residentIdList: string[]
  ): Promise<JsonRow[]> {
    const pageSize = 1000;
    const out: JsonRow[] = [];
    let from = 0;
    while (true) {
      let query = adminClient.from(table).select('*');
      if (mode === 'audit') {
        query = query.eq('actor_org_id', orgId);
      } else if (mode === 'org') {
        query = query.eq('org_id', orgId);
      } else {
        query = query.in('resident_id', residentIdList);
      }
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      const rows = (data ?? []) as JsonRow[];
      out.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return out;
  }

  const tables = Array.from(tableColumns.keys())
    .filter((name) => name !== 'organisations')
    .sort();

  for (const table of tables) {
    const cols = tableColumns.get(table) ?? new Set<string>();
    let rows: JsonRow[] = [];

    if (table === 'audit_logs') {
      rows = await fetchTableRows(table, 'audit', residentIds);
    } else if (cols.has('org_id')) {
      rows = await fetchTableRows(table, 'org', residentIds);
    } else if (cols.has('resident_id')) {
      if (residentIds.length === 0) rows = [];
      else rows = await fetchTableRows(table, 'resident', residentIds);
    }

    if (rows.length > 0) {
      zip.file(`${table}.csv`, toCsv(rows));
    }
  }

  zip.file(
    '_export_info.json',
    JSON.stringify(
      {
        org_id: orgId,
        exported_at: new Date().toISOString(),
        note: 'Første version: deaktivering + manuel sletning efter aftale.',
      },
      null,
      2
    )
  );

  const buf = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  const slug = typeof org.slug === 'string' ? org.slug : orgId;
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="budr-export-${slug}-${new Date().toISOString().slice(0, 10)}.zip"`,
      'cache-control': 'no-store',
    },
  });
}
