export type LysConversationMessage = { role: 'user' | 'assistant'; content: string };

const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 8_000;
const MAX_TITLE_CHARS = 60;

/** Valider og trim beskeder fra Lys-chat før persist. */
export function sanitizeLysConversationMessages(input: unknown): LysConversationMessage[] | null {
  if (!Array.isArray(input)) return null;
  const sliced = input.slice(-MAX_MESSAGES);
  const out: LysConversationMessage[] = [];
  for (const item of sliced) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed) return null;
    out.push({ role, content: trimmed.slice(0, MAX_CONTENT_CHARS) });
  }
  return out;
}

export function titleFromLysMessages(messages: LysConversationMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return null;
  const title = firstUser.content.slice(0, MAX_TITLE_CHARS).trim();
  return title || null;
}

/**
 * Safety-events har FK til lys_conversations. Et id må kun gemmes hvis rækken
 * tilhører samme beboer — ellers droppes id (null) så insert ikke fejler eller
 * kæder en ytring til en andens samtale.
 */
export function ownedConversationIdForSafetyEvent(args: {
  conversationId: string | null;
  eventResidentId: string;
  rowResidentId: string | null;
}): string | null {
  if (!args.conversationId) return null;
  if (!args.rowResidentId) return null;
  if (args.rowResidentId !== args.eventResidentId) return null;
  return args.conversationId;
}
