'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { HeartHandshake, House, MessageCircle, Plus, Send, Users, X } from 'lucide-react';
import {
  fetchThreads,
  fetchMessages,
  createThread,
  sendMessage,
  MessageThread,
  PortalMessage,
} from '@/lib/beskeder';
import { createClient } from '@/lib/supabase/client';

type Tab = 'intern' | 'lys';
type Scope = 'team' | 'house';
type HouseKey = 'A' | 'B' | 'C' | 'D' | 'TLS';

function channelBadge(t: MessageThread): string {
  if (t.channel && t.channel !== 'alle' && t.channel !== 'team' && t.channel !== 'lys')
    return `Hus ${t.channel}`;
  return 'Internt';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay)
    return `I dag ${d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'I går';
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export default function BeskederClient() {
  const [tab, setTab] = useState<Tab>('intern');

  // Live data
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [orgId, setOrgId] = useState<string>('default-org');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Personale');
  const [userInitials, setUserInitials] = useState<string>('P');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTab, setComposeTab] = useState<Tab>('intern');
  const [composeScope, setComposeScope] = useState<Scope>('team');
  const [composeHouse, setComposeHouse] = useState<HouseKey>('A');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const loadThreadsList = async (org: string, type: Tab) => {
    setLoadingThreads(true);
    try {
      const data = await fetchThreads(org, type);
      setThreads(data);
    } catch (e) {
      console.error('fetchThreads fejl:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  // Auth + initial load
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const name =
          (user.user_metadata?.full_name as string | undefined) || user.email || 'Personale';
        setUserName(name);
        setUserInitials(
          name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        );
        const org = (user.user_metadata?.org_id as string | undefined) || 'default-org';
        setOrgId(org);
        await loadThreadsList(org, 'intern');
      } else {
        await loadThreadsList('default-org', 'intern');
      }
    };
    void init();
  }, []);

  // Reload when tab changes
  useEffect(() => {
    void loadThreadsList(orgId, tab);
    setActiveId(null);
    setMessages([]);
  }, [tab, orgId]);

  // Realtime subscription for active thread
  useEffect(() => {
    if (!activeId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_messages',
          filter: `thread_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as PortalMessage]);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId]);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  const selectThread = async (thread: MessageThread) => {
    setActiveId(thread.id);
    setLoadingMessages(true);
    try {
      const msgs = await fetchMessages(thread.id);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendInThread = async () => {
    if (!draft.trim() || !active) return;
    const body = draft.trim();
    setDraft('');
    await sendMessage(active.id, orgId, userId, userName, userInitials, body);
    void loadThreadsList(orgId, tab);
  };

  const createNewThread = async () => {
    if (!composeTitle.trim() || !composeBody.trim()) return;
    const channel = composeScope === 'house' ? composeHouse : composeTab === 'lys' ? 'lys' : 'alle';
    const thread = await createThread(
      orgId,
      composeTab,
      channel,
      composeTitle.trim(),
      userName,
      userId,
      composeBody.trim(),
      userInitials
    );
    await loadThreadsList(orgId, composeTab);
    setTab(composeTab);
    setActiveId(thread.id);
    const msgs = await fetchMessages(thread.id);
    setMessages(msgs);
    setComposeOpen(false);
    setComposeTitle('');
    setComposeBody('');
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
          >
            Beskeder
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
            Internt team, hus-kanaler og signaler fra Lys. Klik en tråd for fuld kontekst.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--cp-green)' }}
        >
          <Plus size={14} /> Ny besked
        </button>
      </div>

      {/* ── Tab-bar ─────────────────────────────────────────── */}
      <div
        className="mt-5 flex rounded-xl border p-1"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <button
          type="button"
          onClick={() => setTab('intern')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium"
          style={
            tab === 'intern'
              ? { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }
              : { color: 'var(--cp-muted)' }
          }
        >
          <Users size={16} /> Internt
        </button>
        <button
          type="button"
          onClick={() => setTab('lys')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium"
          style={
            tab === 'lys'
              ? { backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }
              : { color: 'var(--cp-muted)' }
          }
        >
          <HeartHandshake size={16} /> Fra Lys
        </button>
      </div>

      {/* ── Thread-liste + Chat-panel ────────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* Tråd-liste */}
        <section
          className="rounded-xl border"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <div className="max-h-[68vh] overflow-y-auto p-2">
            {loadingThreads ? (
              <div style={{ padding: '20px', color: 'var(--cp-muted)', fontSize: '0.875rem' }}>
                Henter tråde…
              </div>
            ) : threads.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--cp-muted)',
                  fontSize: '0.875rem',
                }}
              >
                Ingen beskeder endnu. Opret den første tråd.
              </div>
            ) : (
              threads.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void selectThread(t)}
                    className="mb-2 w-full rounded-lg border px-3 py-2.5 text-left"
                    style={{
                      borderColor: isActive ? 'var(--cp-green)' : 'var(--cp-border)',
                      backgroundColor: isActive ? 'var(--cp-green-dim)' : 'var(--cp-bg3)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {t.subject}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {t.last_message_preview ?? '—'}
                    </p>
                    <div
                      className="mt-1.5 flex items-center gap-2 text-[11px]"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      <span>{channelBadge(t)}</span>
                      <span>·</span>
                      <span>{fmtTime(t.last_message_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Chat-panel */}
        <section
          className="rounded-xl border"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          {!active ? (
            <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
              {threads.length > 0
                ? 'Vælg en tråd for at se beskeder.'
                : 'Ingen tråde i denne kategori.'}
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-3" style={{ borderColor: 'var(--cp-border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                  {active.subject}
                </h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {channelBadge(active)} · Oprettet af {active.created_by_name ?? 'Ukendt'}
                </p>
              </div>
              <div className="max-h-[48vh] overflow-y-auto px-4 py-3">
                {loadingMessages ? (
                  <div style={{ padding: '20px', color: 'var(--cp-muted)', fontSize: '0.875rem' }}>
                    Henter beskeder…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => {
                      const mine = m.sender_id === userId;
                      return (
                        <div
                          key={m.id}
                          className="rounded-lg border px-3 py-2"
                          style={{
                            borderColor: mine ? 'rgba(45,212,160,0.35)' : 'var(--cp-border)',
                            backgroundColor: mine ? 'rgba(45,212,160,0.08)' : 'var(--cp-bg3)',
                          }}
                        >
                          <div
                            className="flex items-center gap-2 text-xs"
                            style={{ color: 'var(--cp-muted2)' }}
                          >
                            <span style={{ color: 'var(--cp-text)' }}>{m.sender_name}</span>
                            <span>·</span>
                            <span>{fmtTime(m.created_at)}</span>
                          </div>
                          <p
                            className="mt-1 text-sm leading-relaxed"
                            style={{ color: 'var(--cp-muted)' }}
                          >
                            {m.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t p-3" style={{ borderColor: 'var(--cp-border)' }}>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void sendInThread();
                    }}
                    rows={2}
                    placeholder="Skriv besked…"
                    className="w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: 'var(--cp-border)',
                      backgroundColor: 'var(--cp-bg3)',
                      color: 'var(--cp-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendInThread()}
                    disabled={!draft.trim()}
                    className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: 'var(--cp-green)' }}
                  >
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Compose modal ───────────────────────────────────── */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setComposeOpen(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-xl border p-4"
            style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                Ny besked
              </h3>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded p-1"
                style={{ color: 'var(--cp-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                Kanal
                <select
                  value={composeTab}
                  onChange={(e) => setComposeTab(e.target.value as Tab)}
                  className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
                  style={{
                    borderColor: 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg3)',
                    color: 'var(--cp-text)',
                  }}
                >
                  <option value="intern">Internt</option>
                  <option value="lys">Fra Lys / opfølgning</option>
                </select>
              </label>

              <label className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                Modtagere
                <select
                  value={composeScope}
                  onChange={(e) => setComposeScope(e.target.value as Scope)}
                  className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
                  style={{
                    borderColor: 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg3)',
                    color: 'var(--cp-text)',
                  }}
                >
                  <option value="team">Hele teamet</option>
                  <option value="house">Specifikt hus</option>
                </select>
              </label>
            </div>

            {composeScope === 'house' && (
              <label className="mt-3 block text-xs" style={{ color: 'var(--cp-muted)' }}>
                Hus
                <select
                  value={composeHouse}
                  onChange={(e) => setComposeHouse(e.target.value as HouseKey)}
                  className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
                  style={{
                    borderColor: 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg3)',
                    color: 'var(--cp-text)',
                  }}
                >
                  <option value="A">Hus A</option>
                  <option value="B">Hus B</option>
                  <option value="C">Hus C</option>
                  <option value="D">Hus D</option>
                  <option value="TLS">TLS</option>
                </select>
              </label>
            )}

            <label className="mt-3 block text-xs" style={{ color: 'var(--cp-muted)' }}>
              Emne
              <input
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                  color: 'var(--cp-text)',
                }}
                placeholder={composeScope === 'house' ? `Hus ${composeHouse} - info` : 'Kort emne'}
              />
            </label>

            <label className="mt-3 block text-xs" style={{ color: 'var(--cp-muted)' }}>
              Besked
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                  color: 'var(--cp-text)',
                }}
                placeholder="Skriv din besked…"
              />
            </label>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                {composeScope === 'house'
                  ? `Sendes til alle tilknyttet Hus ${composeHouse}.`
                  : 'Sendes til hele personalegruppen.'}
              </p>
              <button
                type="button"
                onClick={() => void createNewThread()}
                disabled={!composeTitle.trim() || !composeBody.trim()}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--cp-green)' }}
              >
                <Send size={14} /> Send besked
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Legende ─────────────────────────────────────────── */}
      <div
        className="mt-7 grid grid-cols-2 gap-2 text-[11px]"
        style={{ color: 'var(--cp-muted2)' }}
      >
        <span className="inline-flex items-center gap-1">
          <Users size={12} /> Internt team
        </span>
        <span className="inline-flex items-center gap-1">
          <House size={12} /> Hus-kanaler
        </span>
        <span className="inline-flex items-center gap-1">
          <HeartHandshake size={12} /> Signaler fra Lys
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={12} /> Klikbar tråd + svar
        </span>
      </div>
    </div>
  );
}
