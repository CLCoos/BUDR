'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FagsystemNote, FagsystemTransfer } from './format';

export const FAGSYSTEM_HEADER_PREF = 'budr.fagsystem.withHeader';

function isMissingTable(code?: string): boolean {
  return code === 'PGRST205' || code === '42P01';
}

/** Kopierer tekst; virker også i browsere uden Clipboard API (fx ældre iPad i HTTP). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export async function loadTransfers(
  supabase: SupabaseClient,
  ids: string[]
): Promise<{ map: Map<string, FagsystemTransfer>; available: boolean }> {
  const map = new Map<string, FagsystemTransfer>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('journal_fagsystem_transfers')
      .select('journal_entry_id, transferred_by_name, transferred_at')
      .in('journal_entry_id', ids.slice(i, i + 200));
    if (error) return { map, available: !isMissingTable(error.code) };
    for (const r of (data ?? []) as FagsystemTransfer[]) map.set(r.journal_entry_id, r);
  }
  return { map, available: true };
}

/** Markerer notaterne som overført i eget navn. Allerede markerede springes over. */
export async function markTransferred(
  supabase: SupabaseClient,
  args: { orgId: string; staffId: string; staffName: string; notes: FagsystemNote[] }
): Promise<{ ok: boolean; rows: FagsystemTransfer[] }> {
  if (args.notes.length === 0) return { ok: true, rows: [] };
  const { data, error } = await supabase
    .from('journal_fagsystem_transfers')
    .upsert(
      args.notes.map((n) => ({
        journal_entry_id: n.id,
        org_id: args.orgId,
        resident_id: n.resident_id,
        transferred_by: args.staffId,
        transferred_by_name: args.staffName,
      })),
      { onConflict: 'journal_entry_id', ignoreDuplicates: true }
    )
    .select('journal_entry_id, transferred_by_name, transferred_at');
  if (error) return { ok: false, rows: [] };
  return { ok: true, rows: (data ?? []) as FagsystemTransfer[] };
}

export async function undoTransferred(supabase: SupabaseClient, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase
    .from('journal_fagsystem_transfers')
    .delete()
    .in('journal_entry_id', ids);
  return !error;
}

export function readHeaderPref(): boolean {
  try {
    return window.localStorage.getItem(FAGSYSTEM_HEADER_PREF) !== '0';
  } catch {
    return true;
  }
}

export function writeHeaderPref(v: boolean): void {
  try {
    window.localStorage.setItem(FAGSYSTEM_HEADER_PREF, v ? '1' : '0');
  } catch {
    /* privat vindue: valget huskes bare ikke */
  }
}
