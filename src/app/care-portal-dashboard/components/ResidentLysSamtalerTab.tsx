'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageCircle, Mic, X } from 'lucide-react';
import { toast } from 'sonner';
import Tooltip from '@/components/ui/Tooltip';
import { createClient } from '@/lib/supabase/client';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';
import {
  acknowledgeSafetyEvent,
  fetchSafetyEventsForResident,
  formatRelativeDa,
  type SafetyEventWithResident,
} from '@/lib/lys/safetyEventsService';

type ConversationRow = {
  id: string;
  title: string | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  updated_at: string;
  created_at: string;
};

type Props = {
  residentId: string;
};

function riskBadgeStyle(risk: 'acute' | 'elevated' | 'none'): React.CSSProperties {
  if (risk === 'acute') {
    return {
      backgroundColor: 'rgba(220,38,38,0.15)',
      color: '#fca5a5',
      border: '1px solid #dc2626',
    };
  }
  if (risk === 'elevated') {
    return {
      backgroundColor: 'rgba(245,158,11,0.14)',
      color: '#fcd34d',
      border: '1px solid #f59e0b',
    };
  }
  return {
    backgroundColor: 'var(--cp-bg3)',
    color: 'var(--cp-muted)',
    border: '1px solid var(--cp-border)',
  };
}

export default function ResidentLysSamtalerTab({ residentId }: Props) {
  const auth = useAuthenticatedUser();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [eventsByConversation, setEventsByConversation] = useState<
    Map<string, SafetyEventWithResident[]>
  >(new Map());
  const [selectedConversation, setSelectedConversation] = useState<ConversationRow | null>(null);

  const queryConversationId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('conversationId')
      : null;

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function load() {
      if (!supabase) return;
      setLoading(true);
      const [convRes, events] = await Promise.all([
        supabase
          .from('lys_conversations')
          .select('id, title, messages, updated_at, created_at')
          .eq('resident_id', residentId)
          .order('updated_at', { ascending: false }),
        fetchSafetyEventsForResident(residentId).catch(() => []),
      ]);

      if (cancelled) return;
      if (convRes.error) {
        toast.error('Kunne ikke hente Lys-samtaler.');
        setConversations([]);
        setLoading(false);
        return;
      }

      const convRows = (convRes.data ?? []) as ConversationRow[];
      setConversations(convRows);
      const grouped = new Map<string, SafetyEventWithResident[]>();
      for (const event of events) {
        if (!event.conversation_id) continue;
        const prev = grouped.get(event.conversation_id) ?? [];
        prev.push(event);
        grouped.set(event.conversation_id, prev);
      }
      setEventsByConversation(grouped);

      if (queryConversationId) {
        const fromQuery = convRows.find((c) => c.id === queryConversationId);
        if (fromQuery) setSelectedConversation(fromQuery);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [residentId, queryConversationId]);

  const selectedEvents = useMemo(() => {
    if (!selectedConversation) return [];
    return eventsByConversation.get(selectedConversation.id) ?? [];
  }, [eventsByConversation, selectedConversation]);

  const unacknowledgedSelected = useMemo(
    () =>
      selectedEvents.filter(
        (e) => !e.acknowledged_at && (e.risk_level === 'acute' || e.risk_level === 'elevated')
      ),
    [selectedEvents]
  );

  async function acknowledgeAllSelected() {
    if (auth.status !== 'authenticated' || unacknowledgedSelected.length === 0) return;
    try {
      await Promise.all(
        unacknowledgedSelected.map((event) => acknowledgeSafetyEvent(event.id, auth.staff.id))
      );
      toast.success('Safety-events markeret som set.');
      setEventsByConversation((prev) => {
        const next = new Map(prev);
        const current = next.get(selectedConversation!.id) ?? [];
        next.set(
          selectedConversation!.id,
          current.map((event) =>
            unacknowledgedSelected.some((u) => u.id === event.id)
              ? {
                  ...event,
                  acknowledged_at: new Date().toISOString(),
                  acknowledged_by: auth.staff.id,
                }
              : event
          )
        );
        return next;
      });
    } catch {
      toast.error('Kunne ikke bekræfte alle events.');
    }
  }

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--cp-border)' }}>
        <h3
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--cp-text)' }}
        >
          <Mic size={15} aria-hidden />
          Lys-samtaler
        </h3>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Henter samtaler...
        </div>
      ) : conversations.length === 0 ? (
        <div className="px-4 py-8 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Ingen Lys-samtaler endnu.
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--cp-border)' }}>
          {conversations.map((conversation) => {
            const events = eventsByConversation.get(conversation.id) ?? [];
            const alertCount = events.filter(
              (e) => e.risk_level === 'acute' || e.risk_level === 'elevated'
            ).length;
            const latestReasoning =
              events.find((event) => event.reasoning && event.reasoning.trim().length > 0)
                ?.reasoning ?? 'Ingen klassifikator-begrundelse tilgængelig.';
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setSelectedConversation(conversation)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--cp-bg3)]"
                  aria-label={`Åbn Lys-samtale fra ${formatRelativeDa(conversation.updated_at)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {conversation.title?.trim() || 'Lys-samtale'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {formatRelativeDa(conversation.updated_at)} · {conversation.messages.length}{' '}
                        beskeder
                      </p>
                    </div>
                    {alertCount > 0 ? (
                      <Tooltip content={latestReasoning}>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
                          tabIndex={0}
                          aria-label={`${alertCount} risk-flag. ${latestReasoning}`}
                        >
                          <AlertTriangle size={12} aria-hidden />
                          {alertCount} risk-flag
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedConversation ? (
        <div
          className="fixed inset-0 z-[10030] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Lys samtaledetaljer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedConversation(null);
          }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--cp-border2)', backgroundColor: 'var(--cp-bg2)' }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <h4 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                {selectedConversation.title?.trim() || 'Lys-samtale'}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedConversation(null)}
                className="rounded-md p-1"
                style={{ color: 'var(--cp-muted)' }}
                aria-label="Luk samtalevisning"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              <ul className="space-y-2">
                {selectedConversation.messages.map((message, idx) => {
                  const eventForMessage = selectedEvents.find(
                    (event) =>
                      message.role === 'user' &&
                      message.content.trim().includes(event.user_utterance.trim()) &&
                      event.risk_level !== 'none'
                  );
                  const isUser = message.role === 'user';
                  return (
                    <li key={`${selectedConversation.id}-${idx}`} className="space-y-1">
                      <div
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={
                          isUser
                            ? { backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }
                            : { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }
                        }
                      >
                        <MessageCircle size={11} aria-hidden />
                        {isUser ? 'Borger' : 'Lys'}
                      </div>
                      <div
                        className="rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
                      >
                        {message.content}
                      </div>
                      {eventForMessage ? (
                        <Tooltip content={eventForMessage.reasoning ?? 'Ingen begrundelse'}>
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={riskBadgeStyle(eventForMessage.risk_level)}
                            tabIndex={0}
                            aria-label={`Risk-flag ${eventForMessage.risk_level}, ${eventForMessage.category}. ${eventForMessage.reasoning ?? ''}`}
                          >
                            {eventForMessage.risk_level} · {eventForMessage.category}
                          </span>
                        </Tooltip>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            {unacknowledgedSelected.length > 0 && auth.status === 'authenticated' ? (
              <div
                className="flex justify-end border-t px-4 py-3"
                style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
              >
                <button
                  type="button"
                  onClick={() => void acknowledgeAllSelected()}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--cp-green)', color: '#062217' }}
                >
                  Bekræft set ({unacknowledgedSelected.length})
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
