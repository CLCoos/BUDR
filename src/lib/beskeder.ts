import { createClient } from '@/lib/supabase/client';

export interface MessageThread {
  id: string;
  org_id: string;
  channel: string;
  thread_type: 'intern' | 'lys';
  subject: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
  pinned: boolean;
}

export interface PortalMessage {
  id: string;
  thread_id: string;
  org_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_initials: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

export async function fetchThreads(
  orgId: string,
  threadType: 'intern' | 'lys'
): Promise<MessageThread[]> {
  const supabase = createClient();
  if (!supabase) throw new Error('Supabase client ikke tilgængeligt');
  const { data, error } = await supabase
    .from('portal_message_threads')
    .select('*')
    .eq('org_id', orgId)
    .eq('thread_type', threadType)
    .order('pinned', { ascending: false })
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(threadId: string): Promise<PortalMessage[]> {
  const supabase = createClient();
  if (!supabase) throw new Error('Supabase client ikke tilgængeligt');
  const { data, error } = await supabase
    .from('portal_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createThread(
  orgId: string,
  threadType: 'intern' | 'lys',
  channel: string,
  subject: string,
  senderName: string,
  senderId: string | null,
  firstMessage: string,
  senderInitials: string
): Promise<MessageThread> {
  const supabase = createClient();
  if (!supabase) throw new Error('Supabase client ikke tilgængeligt');
  const { data: thread, error: threadError } = await supabase
    .from('portal_message_threads')
    .insert({
      org_id: orgId,
      channel,
      thread_type: threadType,
      subject,
      created_by: senderId,
      created_by_name: senderName,
      last_message_preview: firstMessage.slice(0, 80),
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (threadError) throw threadError;

  const { error: msgError } = await supabase.from('portal_messages').insert({
    thread_id: thread.id,
    org_id: orgId,
    sender_id: senderId,
    sender_name: senderName,
    sender_initials: senderInitials,
    body: firstMessage,
  });
  if (msgError) throw msgError;
  return thread;
}

export async function sendMessage(
  threadId: string,
  orgId: string,
  senderId: string | null,
  senderName: string,
  senderInitials: string,
  body: string
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error('Supabase client ikke tilgængeligt');
  const { error: msgError } = await supabase.from('portal_messages').insert({
    thread_id: threadId,
    org_id: orgId,
    sender_id: senderId,
    sender_name: senderName,
    sender_initials: senderInitials,
    body,
  });
  if (msgError) throw msgError;

  await supabase
    .from('portal_message_threads')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 80),
    })
    .eq('id', threadId);
}
