'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  Clock,
  CheckCheck,
  Send,
  Smile,
  Star,
  Users,
  MessageCircle,
} from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

interface Contact {
  id: string;
  name: string;
  emoji: string;
  role: string;
  color: string;
  bg: string;
  lastSeen?: string;
}

interface SentMessage {
  text: string;
  timestamp: Date;
  read: boolean;
}

const contacts: Contact[] = [
  {
    id: 'c1',
    name: 'Mor',
    emoji: '👩',
    role: 'Familie',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
    lastSeen: 'I dag',
  },
  {
    id: 'c2',
    name: 'Bedste ven',
    emoji: '🧑',
    role: 'Ven',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    lastSeen: 'I går',
  },
  {
    id: 'c3',
    name: 'Terapeut',
    emoji: '🩺',
    role: 'Professionel',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    lastSeen: 'Mandag',
  },
  {
    id: 'c4',
    name: 'Søster',
    emoji: '👧',
    role: 'Familie',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    lastSeen: 'I dag',
  },
  {
    id: 'c5',
    name: 'Kollega',
    emoji: '🧑‍💼',
    role: 'Arbejde',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    lastSeen: 'Tirsdag',
  },
];

const quickMessages = [
  { id: 'm1', label: 'Tænker på dig 💛', emoji: '💛' },
  { id: 'm2', label: 'Tak for din støtte 🙏', emoji: '🙏' },
  { id: 'm3', label: 'Jeg har det bedre i dag ✨', emoji: '✨' },
  { id: 'm4', label: 'Kan vi snakkes ved? 💬', emoji: '💬' },
  { id: 'm5', label: 'Du er fantastisk 🌟', emoji: '🌟' },
  { id: 'm6', label: 'Har brug for lidt støtte 🤗', emoji: '🤗' },
];

const encouragements = [
  { id: 'e1', text: 'Du klarer det! 💪', emoji: '💪' },
  { id: 'e2', text: 'Jeg er stolt af dig! 🌟', emoji: '🌟' },
  { id: 'e3', text: 'Du er stærkere end du tror! ✨', emoji: '✨' },
  { id: 'e4', text: 'Ét skridt ad gangen! 🐾', emoji: '🐾' },
  { id: 'e5', text: 'Du er ikke alene! 💙', emoji: '💙' },
  { id: 'e6', text: 'Fremgang, ikke perfektion! 🌱', emoji: '🌱' },
];

const reactionOptions = ['❤️', '👍', '😊', '✨', '💪', '🙏'];

type ActiveTab = 'kontakter' | 'opmuntring' | 'beskeder';

function formatTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Lige nu';
  if (diffMin < 60) return `${diffMin} min siden`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} t siden`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysSocialTab({ tokens, accent }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('kontakter');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageHistory, setMessageHistory] = useState<Record<string, SentMessage[]>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Opmuntring state
  const [opmuntringTarget, setOpmuntringTarget] = useState<Contact | null>(null);
  const [pendingEnc, setPendingEnc] = useState<(typeof encouragements)[0] | null>(null);
  const [sentEncs, setSentEncs] = useState<Set<string>>(new Set());
  const [encReactions, setEncReactions] = useState<Record<string, string[]>>({});
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);

  // Beskeder state
  const [beskederContact, setBeskederContact] = useState<Contact | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  const sendMessage = (contactId: string, text: string) => {
    const msg: SentMessage = { text, timestamp: new Date(), read: false };
    setMessageHistory((prev) => ({ ...prev, [contactId]: [...(prev[contactId] ?? []), msg] }));
    setTimeout(() => {
      setMessageHistory((prev) => {
        const msgs = [...(prev[contactId] ?? [])];
        const i = msgs.findLastIndex((m) => m.text === text && !m.read);
        if (i !== -1) msgs[i] = { ...msgs[i], read: true };
        return { ...prev, [contactId]: msgs };
      });
    }, 3000);
    showToast('Besked sendt! 💬');
  };

  const sendCustom = () => {
    if (!customMessage.trim() || !selectedContact) return;
    sendMessage(selectedContact.id, customMessage);
    setCustomMessage('');
  };

  const tabs = [
    { key: 'kontakter' as const, label: 'Kontakter', icon: <Users size={13} /> },
    { key: 'opmuntring' as const, label: 'Opmuntring', icon: <Star size={13} /> },
    { key: 'beskeder' as const, label: 'Beskeder', icon: <MessageCircle size={13} /> },
  ];

  return (
    <div style={{ color: tokens.text }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 shadow-xl text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ backgroundColor: tokens.bg, borderColor: tokens.cardBorder }}
      >
        <h1 className="font-bold text-lg" style={{ color: tokens.text }}>
          Social
        </h1>
        <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>
          Dit støttenetværk
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Tab bar */}
        <div
          className="flex gap-1 rounded-xl p-1 border"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[40px]"
              style={{
                backgroundColor: activeTab === t.key ? `${accent}22` : 'transparent',
                color: activeTab === t.key ? accent : tokens.textMuted,
                border: activeTab === t.key ? `1px solid ${accent}44` : '1px solid transparent',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* KONTAKTER TAB */}
        {activeTab === 'kontakter' && (
          <div className="space-y-2">
            <p className="text-xs px-1" style={{ color: tokens.textMuted }}>
              Tryk på en kontakt for at sende en hurtig besked
            </p>
            {contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              return (
                <div key={contact.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedContact(isSelected ? null : contact)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.98]"
                    style={{
                      backgroundColor: isSelected ? contact.bg : tokens.cardBg,
                      borderColor: isSelected ? `${contact.color}50` : tokens.cardBorder,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 flex-shrink-0"
                      style={{
                        background: contact.bg,
                        borderColor: isSelected ? contact.color : `${contact.color}50`,
                      }}
                    >
                      {contact.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold" style={{ color: tokens.text }}>
                        {contact.name}
                      </p>
                      <p className="text-xs" style={{ color: tokens.textMuted }}>
                        {contact.role} · {contact.lastSeen}
                      </p>
                    </div>
                    <Send
                      size={14}
                      style={{ color: isSelected ? contact.color : tokens.textMuted }}
                    />
                  </button>

                  {isSelected && (
                    <div
                      className="mt-1 rounded-2xl border p-3 space-y-2"
                      style={{ backgroundColor: tokens.cardBg, borderColor: `${contact.color}25` }}
                    >
                      <p className="text-xs" style={{ color: tokens.textMuted }}>
                        Hurtige beskeder til {contact.name}:
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {quickMessages.map((msg) => (
                          <button
                            key={msg.id}
                            type="button"
                            onClick={() => sendMessage(contact.id, msg.label)}
                            className="flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all active:scale-95"
                            style={{
                              borderColor: `${contact.color}25`,
                              backgroundColor: 'transparent',
                            }}
                          >
                            <span className="text-sm">{msg.emoji}</span>
                            <span
                              className="text-[10px] leading-tight"
                              style={{ color: tokens.text }}
                            >
                              {msg.label}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendCustom()}
                          placeholder="Skriv din egen besked..."
                          className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
                          style={{
                            backgroundColor: tokens.bg,
                            borderColor: `${contact.color}30`,
                            color: tokens.text,
                          }}
                        />
                        <button
                          type="button"
                          onClick={sendCustom}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 min-h-[44px]"
                          style={{
                            backgroundColor: contact.bg,
                            color: contact.color,
                            border: `1px solid ${contact.color}40`,
                          }}
                        >
                          <Send size={13} />
                        </button>
                      </div>
                      {/* Message history preview */}
                      {(messageHistory[contact.id] ?? []).length > 0 && (
                        <div
                          className="border-t pt-2 mt-1 space-y-1"
                          style={{ borderColor: `${contact.color}20` }}
                        >
                          {[...(messageHistory[contact.id] ?? [])]
                            .reverse()
                            .slice(0, 3)
                            .map((msg, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span
                                  className="text-[10px] flex-1 truncate"
                                  style={{ color: tokens.text }}
                                >
                                  {msg.text}
                                </span>
                                <Clock size={9} style={{ color: tokens.textMuted }} />
                                <span className="text-[9px]" style={{ color: tokens.textMuted }}>
                                  {formatTime(msg.timestamp)}
                                </span>
                                <CheckCheck
                                  size={10}
                                  style={{ color: msg.read ? '#34D399' : tokens.textMuted }}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* OPMUNTRING TAB */}
        {activeTab === 'opmuntring' && (
          <div className="space-y-3">
            <div
              className="rounded-2xl border p-4"
              style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
            >
              <p className="text-sm leading-relaxed" style={{ color: tokens.text }}>
                Vælg hvem der skal have opmuntring — derefter selve beskeden. 💛
              </p>
            </div>

            {!opmuntringTarget ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold px-1" style={{ color: tokens.textMuted }}>
                  Send til…
                </p>
                {contacts.map((c) => (
                  <button
                    key={`opm-${c.id}`}
                    type="button"
                    onClick={() => setOpmuntringTarget(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.99] min-h-[52px]"
                    style={{ backgroundColor: c.bg, borderColor: `${c.color}40` }}
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: tokens.text }}>
                        {c.name}
                      </p>
                      <p className="text-xs" style={{ color: tokens.textMuted }}>
                        {c.role}
                      </p>
                    </div>
                    <ChevronRight className="ml-auto" size={16} style={{ color: c.color }} />
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpmuntringTarget(null);
                      setPendingEnc(null);
                    }}
                    className="text-xs font-semibold min-h-[44px] px-2"
                    style={{ color: accent }}
                  >
                    ← Skift person
                  </button>
                  <span className="text-xs" style={{ color: tokens.textMuted }}>
                    Til:{' '}
                    <strong style={{ color: tokens.text }}>
                      {opmuntringTarget.emoji} {opmuntringTarget.name}
                    </strong>
                  </span>
                </div>

                {pendingEnc && (
                  <div
                    className="rounded-2xl border p-4 space-y-3"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: `${opmuntringTarget.color}35`,
                    }}
                  >
                    <p className="text-sm" style={{ color: tokens.text }}>
                      Send <strong>&quot;{pendingEnc.text}&quot;</strong> til{' '}
                      {opmuntringTarget.name}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingEnc(null)}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold border min-h-[48px]"
                        style={{ borderColor: tokens.cardBorder, color: tokens.textMuted }}
                      >
                        Annuller
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const key = `${pendingEnc.id}::${opmuntringTarget.id}`;
                          setSentEncs((prev) => new Set([...prev, key]));
                          showToast(`Opmuntring sendt til ${opmuntringTarget.name} 🌟`);
                          setPendingEnc(null);
                        }}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold text-white min-h-[48px]"
                        style={{ backgroundColor: opmuntringTarget.color }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {encouragements.map((enc) => {
                    const key = `${enc.id}::${opmuntringTarget.id}`;
                    const isSent = sentEncs.has(key);
                    const reactions = encReactions[enc.id] ?? [];
                    const isPickerOpen = pickerOpen === enc.id;
                    return (
                      <div key={enc.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => !isSent && !pendingEnc && setPendingEnc(enc)}
                          disabled={!!pendingEnc && !isSent}
                          className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95"
                          style={{
                            backgroundColor: isSent ? 'rgba(52,211,153,0.12)' : tokens.cardBg,
                            borderColor: isSent ? 'rgba(52,211,153,0.4)' : tokens.cardBorder,
                          }}
                        >
                          <span className="text-3xl">{enc.emoji}</span>
                          <p
                            className="text-xs font-medium text-center leading-tight"
                            style={{ color: isSent ? '#34D399' : tokens.textMuted }}
                          >
                            {enc.text}
                          </p>
                          {isSent && <span className="text-[10px] text-emerald-400">Sendt ✓</span>}
                        </button>
                        {isSent && (
                          <div className="mt-1 px-1">
                            {reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {reactions.map((r, i) => (
                                  <span
                                    key={i}
                                    className="text-sm px-1.5 py-0.5 rounded-full border"
                                    style={{ borderColor: tokens.cardBorder }}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setPickerOpen(isPickerOpen ? null : enc.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] min-h-[36px] transition-all"
                                style={{ borderColor: tokens.cardBorder, color: tokens.textMuted }}
                              >
                                <Smile size={10} />
                                Reaktion
                              </button>
                              {isPickerOpen && (
                                <div
                                  className="absolute bottom-full left-0 mb-1 z-30 rounded-2xl border p-2 shadow-xl"
                                  style={{
                                    backgroundColor: tokens.cardBg,
                                    borderColor: tokens.cardBorder,
                                  }}
                                >
                                  <div className="flex gap-1">
                                    {reactionOptions.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          setEncReactions((prev) => ({
                                            ...prev,
                                            [enc.id]: [...(prev[enc.id] ?? []), emoji],
                                          }));
                                          setPickerOpen(null);
                                          showToast(`Reaktion tilføjet ${emoji}`);
                                        }}
                                        className="p-1.5 rounded-xl text-lg transition-all active:scale-90 min-h-[40px]"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* BESKEDER TAB */}
        {activeTab === 'beskeder' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold px-1 mb-2" style={{ color: tokens.textMuted }}>
                Send til…
              </p>
              <div className="flex flex-wrap gap-2">
                {contacts.map((c) => {
                  const on = beskederContact?.id === c.id;
                  return (
                    <button
                      key={`besked-${c.id}`}
                      type="button"
                      onClick={() => setBeskederContact(on ? null : c)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition-all min-h-[44px]"
                      style={{
                        backgroundColor: on ? c.bg : tokens.cardBg,
                        borderColor: on ? `${c.color}60` : tokens.cardBorder,
                        color: on ? c.color : tokens.textMuted,
                      }}
                    >
                      <span className="text-base">{c.emoji}</span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              {quickMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-2xl border flex items-center gap-3 p-3.5"
                  style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
                >
                  <span className="text-2xl flex-shrink-0">{msg.emoji}</span>
                  <p className="flex-1 text-sm" style={{ color: tokens.text }}>
                    {msg.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!beskederContact) {
                        showToast('Vælg først hvem beskeden skal til 💬');
                        return;
                      }
                      sendMessage(beskederContact.id, msg.label);
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 min-h-[44px]"
                    style={{
                      backgroundColor: beskederContact?.bg ?? tokens.cardBg,
                      borderColor: beskederContact
                        ? `${beskederContact.color}45`
                        : tokens.cardBorder,
                      color: beskederContact?.color ?? tokens.textMuted,
                    }}
                  >
                    <Send size={14} />
                    Send
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
