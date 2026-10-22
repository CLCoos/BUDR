import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseBudrFollowUpsBlock } from '@/lib/portalStaffAssistantFollowUps';
import { claudeApiKey, claudeMessagesFetch } from '@/lib/ai/claudeTransport';
import { clipText, residentAliasMap } from '@/lib/ai/aliases';
import type { ResidentNameRow } from '@/lib/assistant/names';
import { buildStaffAssistantSystem } from '@/lib/assistant/staffAssistantPrompt';

export async function POST(req: NextRequest) {
  // Verify staff auth
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  // Kun portalpersonale, og kun egne beboere: konteksten hentes med den indloggedes
  // klient, så RLS afgrænser til eget bosted (før: service role = alle bosteder).
  const { data: staffRow } = await supabase
    .from('care_staff')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!staffRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Borgerne hedder "Borger 1", "Borger 2" … for AI'en; svaret får initialer (GDPR).
  const { data: residents } = await supabase
    .from('care_residents')
    .select('user_id, first_name, last_name, display_name, nickname, onboarding_data')
    .order('display_name');
  const residentRows = (residents ?? []) as Array<
    ResidentNameRow & { onboarding_data: Record<string, string> | null }
  >;
  const aliases = residentAliasMap(residentRows);
  const aliasOf = new Map(residentRows.map((r, i) => [r.user_id, aliases.alias(i)]));

  // Godkendte journalnotater fra de seneste 7 dage (højst 15) som baggrund.
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: journal } = await supabase
    .from('journal_entries')
    .select('resident_id, entry_text, category, created_at')
    .eq('journal_status', 'godkendt')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(15);

  // Kontaktpersoners navne sendes ikke; kun relationen.
  const residentLines = residentRows.map((r) => {
    const od = r.onboarding_data;
    const parts = [`• ${aliasOf.get(r.user_id)} (beboer-id: ${r.user_id})`];
    if (od?.move_in_date) parts.push(`indflyttet ${od.move_in_date}`);
    if (od?.primary_contact) {
      parts.push(
        `har en primær kontakt${od.primary_contact_relation ? ` (${od.primary_contact_relation})` : ''}`
      );
    }
    return parts.join(', ');
  });

  const journalLines = (journal ?? []).map((j) => {
    const date = new Date(j.created_at as string).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Copenhagen',
    });
    const who = aliasOf.get(j.resident_id as string) ?? 'En borger';
    const text = aliases.hide(clipText(j.entry_text, 160));
    return `[${date}] ${who}, ${j.category as string}: ${text}`;
  });

  const system = buildStaffAssistantSystem({
    residentLines,
    journalLines,
    residentTabs: 'overblik, medicin, dagsplan, plan eller haven',
  });
  const aiMessages = messages
    .slice(-12)
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: aliases.hide(typeof m.content === 'string' ? m.content.slice(0, 2000).trim() : ''),
    }))
    .filter((m) => m.content.length > 0);
  while (aiMessages[0]?.role === 'assistant') aiMessages.shift();
  if (aiMessages.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  // Call Anthropic API directly (same pattern as lys-chat which works on Netlify)
  const res = await claudeMessagesFetch(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      temperature: 0.3,
      system,
      messages: aiMessages,
    },
    { apiKey: key }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[staff-assistant] anthropic error:', res.status, err);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find((c) => c.type === 'text');
  const text = block?.text ? aliases.restore(block.text.trim()) : '';

  if (!text) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  const { text: cleanText, followUps } = parseBudrFollowUpsBlock(text);

  return NextResponse.json({
    text: cleanText || text.replace(/<budr_followups>[\s\S]*?<\/budr_followups>/gi, '').trim(),
    followUps,
  });
}
