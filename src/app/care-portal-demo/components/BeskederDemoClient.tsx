'use client';

import React, { useMemo, useState } from 'react';
import { HeartHandshake, House, MessageCircle, Plus, Send, Users, X } from 'lucide-react';

type Tab = 'intern' | 'lys';
type Scope = 'team' | 'house';
type HouseKey = 'A' | 'B' | 'C' | 'D' | 'TLS';

type Thread = {
  id: string;
  tab: Tab;
  scope: Scope;
  house?: HouseKey;
  title: string;
  participants: string[];
  lastTime: string;
  unread?: number;
  preview: string;
  messages: Array<{
    id: string;
    author: string;
    at: string;
    text: string;
    mine?: boolean;
  }>;
};

const THREADS_SEED: Thread[] = [
  {
    id: 'team-vagtleder',
    tab: 'intern',
    scope: 'team',
    title: 'Vagtleder - Mikkel H.',
    participants: ['Mikkel H.', 'Christian C.', 'Sosu-team'],
    lastTime: 'I dag 08:12',
    unread: 1,
    preview: 'Husk faellesmoede kl. 13 - kort status paa medicinaendringer.',
    messages: [
      {
        id: 'm1',
        author: 'Mikkel H.',
        at: 'I dag 08:12',
        text: 'Husk faellesmoede kl. 13. Vi tager kort status paa medicinaendringer og aftenvagt-overlevering.',
      },
      {
        id: 'm2',
        author: 'Dig',
        at: 'I dag 08:20',
        text: 'Jeg er med. Jeg tager opdatering paa Hus B med.',
        mine: true,
      },
    ],
  },
  {
    id: 'house-b-faelles',
    tab: 'intern',
    scope: 'house',
    house: 'B',
    title: 'Hus B - Faelleskanal',
    participants: ['Team Hus B'],
    lastTime: 'I dag 07:55',
    preview: 'Praktisk besked til alle i Hus B om medicinrunde og aftensmad.',
    messages: [
      {
        id: 'm1',
        author: 'Administration',
        at: 'I dag 07:55',
        text: 'Til alle i Hus B: medicinrunden starter 17:30 i dag pga. laegebesoeg. Noter afvigelser i journal samme aften.',
      },
      {
        id: 'm2',
        author: 'Hanne B.',
        at: 'I dag 08:03',
        text: 'Jeg tager vaerelse B-03 og B-05. Hvem tager B-01/B-02?',
      },
    ],
  },
  {
    id: 'admin-info',
    tab: 'intern',
    scope: 'team',
    title: 'Administration',
    participants: ['Administration', 'Alt personale'],
    lastTime: 'I gaar',
    preview: 'Nye retningslinjer for dokumentation i CosDoc er lagt i den delte mappe.',
    messages: [
      {
        id: 'm1',
        author: 'Administration',
        at: 'I gaar 15:22',
        text: 'Nye retningslinjer for dokumentation i CosDoc er lagt i den delte mappe. Gennemlaes inden naeste vagt.',
      },
    ],
  },
  {
    id: 'lys-finn',
    tab: 'lys',
    scope: 'team',
    title: 'Lys: Finn L.',
    participants: ['Finn L.', 'Kontaktpersoner'],
    lastTime: 'I dag 07:45',
    unread: 1,
    preview: 'Jeg vil gerne tale med Sara om i gaar aftes - jeg blev bange da det larmede.',
    messages: [
      {
        id: 'm1',
        author: 'Lys signal',
        at: 'I dag 07:45',
        text: 'Finn L. oensker kontakt med Sara K. hurtigst muligt. Tema: uro i aftentimerne.',
      },
      {
        id: 'm2',
        author: 'Dig',
        at: 'I dag 08:05',
        text: 'Jeg tager forste opfoelgning nu og skriver kort note i overblikket bagefter.',
        mine: true,
      },
    ],
  },
  {
    id: 'lys-kirsten',
    tab: 'lys',
    scope: 'house',
    house: 'A',
    title: 'Lys: Kirsten R. (Hus A)',
    participants: ['Kirsten R.', 'Team Hus A'],
    lastTime: 'I gaar 21:10',
    preview: 'Kort stemningscheck 4/10. Oensker ikke samtale i dag, blot kvittering.',
    messages: [
      {
        id: 'm1',
        author: 'Lys signal',
        at: 'I gaar 21:10',
        text: 'Kirsten R. kvitterer for dagen og beder om rolig opfoelgning i morgen formiddag.',
      },
    ],
  },
];

function channelBadge(t: Thread): string {
  if (t.scope === 'house') return `Hus ${t.house}`;
  return 'Internt';
}

export default function BeskederDemoClient() {
  const [tab, setTab] = useState<Tab>('intern');
  const [threads, setThreads] = useState<Thread[]>(THREADS_SEED);
  const [activeId, setActiveId] = useState<string>(THREADS_SEED[0]!.id);
  const [draft, setDraft] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTab, setComposeTab] = useState<Tab>('intern');
  const [composeScope, setComposeScope] = useState<Scope>('team');
  const [composeHouse, setComposeHouse] = useState<HouseKey>('A');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const visible = useMemo(() => threads.filter((t) => t.tab === tab), [threads, tab]);

  const active = useMemo(() => {
    const x = visible.find((t) => t.id === activeId);
    return x ?? visible[0] ?? null;
  }, [visible, activeId]);

  const selectThread = (id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  const sendInThread = () => {
    if (!active || !draft.trim()) return;
    const now = 'Nu';
    const next = {
      id: `m-${Date.now()}`,
      author: 'Dig',
      at: now,
      text: draft.trim(),
      mine: true,
    };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              preview: draft.trim(),
              lastTime: now,
              messages: [...t.messages, next],
            }
          : t
      )
    );
    setDraft('');
  };

  const createThread = () => {
    if (!composeTitle.trim() || !composeBody.trim()) return;
    const id = `new-${Date.now()}`;
    const now = 'Nu';
    const thread: Thread = {
      id,
      tab: composeTab,
      scope: composeScope,
      house: composeScope === 'house' ? composeHouse : undefined,
      title: composeTitle.trim(),
      participants: composeScope === 'house' ? [`Team Hus ${composeHouse}`] : ['Internt team'],
      lastTime: now,
      preview: composeBody.trim(),
      messages: [
        {
          id: `m-${Date.now()}`,
          author: 'Dig',
          at: now,
          text: composeBody.trim(),
          mine: true,
        },
      ],
    };

    setThreads((prev) => [thread, ...prev]);
    setTab(composeTab);
    setActiveId(id);
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
            Internt team, hus-kanaler og signaler fra Lys. Klik en traad for fuld kontekst.
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

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <section
          className="rounded-xl border"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <div className="max-h-[68vh] overflow-y-auto p-2">
            {visible.map((t) => {
              const activeThread = t.id === active?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectThread(t.id)}
                  className="mb-2 w-full rounded-lg border px-3 py-2.5 text-left"
                  style={{
                    borderColor: activeThread ? 'var(--cp-green)' : 'var(--cp-border)',
                    backgroundColor: activeThread ? 'var(--cp-green-dim)' : 'var(--cp-bg3)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      {t.title}
                    </p>
                    {t.unread ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
                      >
                        {t.unread}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {t.preview}
                  </p>
                  <div
                    className="mt-1.5 flex items-center gap-2 text-[11px]"
                    style={{ color: 'var(--cp-muted2)' }}
                  >
                    <span>{channelBadge(t)}</span>
                    <span>·</span>
                    <span>{t.lastTime}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-xl border"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          {!active ? (
            <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
              Ingen traade i denne kategori.
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-3" style={{ borderColor: 'var(--cp-border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                  {active.title}
                </h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {channelBadge(active)} · Deltagere: {active.participants.join(', ')}
                </p>
              </div>
              <div className="max-h-[48vh] overflow-y-auto px-4 py-3">
                <div className="space-y-2">
                  {active.messages.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-lg border px-3 py-2"
                      style={{
                        borderColor: m.mine ? 'rgba(45,212,160,0.35)' : 'var(--cp-border)',
                        backgroundColor: m.mine ? 'rgba(45,212,160,0.08)' : 'var(--cp-bg3)',
                      }}
                    >
                      <div
                        className="flex items-center gap-2 text-xs"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        <span style={{ color: 'var(--cp-text)' }}>{m.author}</span>
                        <span>·</span>
                        <span>{m.at}</span>
                      </div>
                      <p
                        className="mt-1 text-sm leading-relaxed"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        {m.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t p-3" style={{ borderColor: 'var(--cp-border)' }}>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="Skriv besked..."
                    className="w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: 'var(--cp-border)',
                      backgroundColor: 'var(--cp-bg3)',
                      color: 'var(--cp-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendInThread}
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

      {composeOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
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
                  <option value="lys">Fra Lys / opfoelgning</option>
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
                placeholder="Skriv din besked..."
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
                onClick={createThread}
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
          <MessageCircle size={12} /> Klikbar traad + svar
        </span>
      </div>
    </div>
  );
}
