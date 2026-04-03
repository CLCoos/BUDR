'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import CompanionAvatar from '@/components/CompanionAvatar';
import { CompanionReaction } from '@/components/CompanionAvatar';
import {
  Users,
  Send,
  Star,
  MessageCircle,
  Clock,
  CheckCheck,
  ChevronRight,
  Smile,
  History,
} from 'lucide-react';

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

interface SentBesked {
  contactId: string;
  contactName: string;
  contactEmoji: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

interface EncouragementReactions {
  [encId: string]: string[];
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
  { id: 'm1', label: 'Tænker på dig 💛', emoji: '💛', category: 'Omsorg' },
  { id: 'm2', label: 'Tak for din støtte 🙏', emoji: '🙏', category: 'Taknemmelighed' },
  { id: 'm3', label: 'Jeg har det bedre i dag ✨', emoji: '✨', category: 'Opdatering' },
  { id: 'm4', label: 'Kan vi snakkes ved? 💬', emoji: '💬', category: 'Kontakt' },
  { id: 'm5', label: 'Du er fantastisk 🌟', emoji: '🌟', category: 'Opmuntring' },
  { id: 'm6', label: 'Har brug for lidt støtte 🤗', emoji: '🤗', category: 'Hjælp' },
  { id: 'm7', label: 'Savner dig 🌸', emoji: '🌸', category: 'Omsorg' },
  { id: 'm8', label: 'Jeg er her for dig ❤️', emoji: '❤️', category: 'Støtte' },
];

const encouragements = [
  { id: 'e1', text: 'Du klarer det! 💪', emoji: '💪' },
  { id: 'e2', text: 'Jeg er stolt af dig! 🌟', emoji: '🌟' },
  { id: 'e3', text: 'Du er stærkere end du tror! ✨', emoji: '✨' },
  { id: 'e4', text: 'Ét skridt ad gangen! 🐾', emoji: '🐾' },
  { id: 'e5', text: 'Du er ikke alene! 💙', emoji: '💙' },
  { id: 'e6', text: 'Fremgang, ikke perfektion! 🌱', emoji: '🌱' },
];

const reactionOptions = [
  { emoji: '❤️', label: 'Kærlighed' },
  { emoji: '👍', label: 'Godt' },
  { emoji: '😊', label: 'Glad' },
  { emoji: '✨', label: 'Inspireret' },
  { emoji: '💪', label: 'Stærk' },
  { emoji: '🙏', label: 'Taknemlig' },
];

type ActiveTab = 'kontakter' | 'opmuntring' | 'beskeder';

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Lige nu';
  if (diffMin < 60) return `${diffMin} min siden`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} t siden`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export default function SocialView() {
  const searchParams = useSearchParams();
  const [companion, setCompanion] = useState('bjorn');
  const [activeTab, setActiveTab] = useState<ActiveTab>('kontakter');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageHistory, setMessageHistory] = useState<Record<string, SentMessage[]>>({});
  const [sentEncouragementKeys, setSentEncouragementKeys] = useState<string[]>([]);
  const [encouragementReactions, setEncouragementReactions] = useState<EncouragementReactions>({});
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [sentBeskeder, setSentBeskeder] = useState<SentBesked[]>([]);
  const [reaction, setReaction] = useState<CompanionReaction>('idle');
  const [customMessage, setCustomMessage] = useState('');
  const [showSentToast, setShowSentToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [opmuntringTarget, setOpmuntringTarget] = useState<Contact | null>(null);
  const [pendingEnc, setPendingEnc] = useState<(typeof encouragements)[0] | null>(null);
  const [beskederContact, setBeskederContact] = useState<Contact | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('budr_companion');
    if (saved) setCompanion(saved);
  }, []);

  useEffect(() => {
    const til = searchParams.get('til');
    const tab = searchParams.get('tab');
    if (tab === 'kontakter' || tab === 'opmuntring' || tab === 'beskeder') {
      setActiveTab(tab);
    }
    if (til) {
      const c = contacts.find((x) => x.id === til);
      if (c) {
        setSelectedContact(c);
        setBeskederContact(c);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== 'opmuntring') {
      setOpmuntringTarget(null);
      setPendingEnc(null);
    }
  }, [activeTab]);

  const triggerToast = (text: string) => {
    setToastText(text);
    setShowSentToast(true);
    setTimeout(() => setShowSentToast(false), 2500);
  };

  const sendQuickMessage = (contactId: string, message: string) => {
    const newMsg: SentMessage = { text: message, timestamp: new Date(), read: false };
    setMessageHistory((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), newMsg],
    }));
    // Simulate read after 3s
    setTimeout(() => {
      setMessageHistory((prev) => {
        const msgs = [...(prev[contactId] || [])];
        const idx = msgs.findIndex((m) => m.text === message && !m.read);
        if (idx !== -1) msgs[idx] = { ...msgs[idx], read: true };
        return { ...prev, [contactId]: msgs };
      });
    }, 3000);
    setReaction('taskComplete');
    setTimeout(() => setReaction('idle'), 2500);
    triggerToast('Besked sendt! 💬');
  };

  const confirmSendEncouragement = () => {
    if (!pendingEnc || !opmuntringTarget) return;
    const key = `${pendingEnc.id}::${opmuntringTarget.id}`;
    setSentEncouragementKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setReaction('celebrate');
    setTimeout(() => setReaction('idle'), 2800);
    triggerToast(`Opmuntring sendt til ${opmuntringTarget.name} 🌟`);
    setPendingEnc(null);
  };

  const addReaction = (encId: string, emoji: string) => {
    setEncouragementReactions((prev) => {
      const existing = prev[encId] || [];
      if (existing.includes(emoji)) return prev;
      return { ...prev, [encId]: [...existing, emoji] };
    });
    setActiveReactionPicker(null);
    triggerToast(`Reaktion tilføjet ${emoji}`);
  };

  const sendCustomMessage = () => {
    if (!customMessage.trim() || !selectedContact) return;
    sendQuickMessage(selectedContact.id, customMessage);
    setCustomMessage('');
  };

  const sendBeskedWithContact = (msg: (typeof quickMessages)[0], contact: Contact) => {
    const newBesked: SentBesked = {
      contactId: contact.id,
      contactName: contact.name,
      contactEmoji: contact.emoji,
      text: msg.label,
      timestamp: new Date(),
      read: false,
    };
    setSentBeskeder((prev) => [newBesked, ...prev]);
    sendQuickMessage(contact.id, msg.label);
    // Simulate read after 4s
    setTimeout(() => {
      setSentBeskeder((prev) => prev.map((b, i) => (i === 0 ? { ...b, read: true } : b)));
    }, 4000);
  };

  const trySendBesked = (msg: (typeof quickMessages)[0]) => {
    if (!beskederContact) {
      triggerToast('Vælg først hvem beskeden skal til 💬');
      return;
    }
    sendBeskedWithContact(msg, beskederContact);
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'kontakter', label: 'Kontakter', icon: <Users size={14} /> },
    { key: 'opmuntring', label: 'Opmuntring', icon: <Star size={14} /> },
    { key: 'beskeder', label: 'Beskeder', icon: <MessageCircle size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-midnight-900 pb-24">
      {/* Toast */}
      {showSentToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-midnight-800 border border-midnight-600 rounded-xl px-4 py-2.5 shadow-xl animate-slide-up">
          <p className="text-sm font-semibold text-midnight-100">{toastText}</p>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-midnight-900/95 backdrop-blur-xl border-b border-midnight-700/40 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-aurora-pink/15 border border-aurora-pink/30 flex items-center justify-center">
            <Users size={18} className="text-pink-300" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-midnight-50">Social</h1>
            <p className="text-xs text-midnight-400">Dit støttenetværk</p>
          </div>
          <div className="ml-auto">
            <CompanionAvatar
              companion={companion}
              size="sm"
              mood="happy"
              reaction={reaction}
              onReactionEnd={() => setReaction('idle')}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-midnight-800/60 border border-midnight-700/40 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: activeTab === tab.key ? 'rgba(167,139,250,0.2)' : 'transparent',
                color: activeTab === tab.key ? '#A78BFA' : '#64748b',
                border:
                  activeTab === tab.key
                    ? '1px solid rgba(167,139,250,0.35)'
                    : '1px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* KONTAKTER TAB */}
        {activeTab === 'kontakter' && (
          <div className="space-y-3">
            {/* Message History Modal */}
            {historyContact && (
              <div
                className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setHistoryContact(null)}
              >
                <div
                  className="w-full max-w-lg bg-midnight-900 border border-midnight-700/60 rounded-t-3xl p-5 pb-8 space-y-3 animate-slide-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2"
                      style={{ background: historyContact.bg, borderColor: historyContact.color }}
                    >
                      {historyContact.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-midnight-100">{historyContact.name}</p>
                      <p className="text-xs text-midnight-400">Beskedhistorik</p>
                    </div>
                    <button
                      onClick={() => setHistoryContact(null)}
                      className="ml-auto text-midnight-400 hover:text-midnight-200 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {(messageHistory[historyContact.id] || []).length === 0 ? (
                      <p className="text-xs text-midnight-500 text-center py-6">
                        Ingen beskeder endnu
                      </p>
                    ) : (
                      [...(messageHistory[historyContact.id] || [])].reverse().map((msg, i) => (
                        <div key={i} className="flex flex-col items-end gap-0.5">
                          <div
                            className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-midnight-100"
                            style={{
                              background: historyContact.bg,
                              border: `1px solid ${historyContact.color}30`,
                            }}
                          >
                            {msg.text}
                          </div>
                          <div className="flex items-center gap-1 px-1">
                            <Clock size={9} className="text-midnight-500" />
                            <span className="text-[9px] text-midnight-500">
                              {formatTime(msg.timestamp)}
                            </span>
                            {msg.read ? (
                              <CheckCheck size={10} className="text-emerald-400" />
                            ) : (
                              <CheckCheck size={10} className="text-midnight-600" />
                            )}
                            <span
                              className="text-[9px]"
                              style={{ color: msg.read ? '#34D399' : '#475569' }}
                            >
                              {msg.read ? 'Læst' : 'Sendt'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-midnight-400 px-1">
              Tryk på en kontakt for at sende en besked
            </p>
            {contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const msgs = messageHistory[contact.id] || [];
              const msgCount = msgs.length;
              const unreadCount = msgs.filter((m) => !m.read).length;
              return (
                <div key={contact.id}>
                  <button
                    onClick={() => setSelectedContact(isSelected ? null : contact)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background: isSelected ? contact.bg : 'rgba(255,255,255,0.03)',
                      borderColor: isSelected ? `${contact.color}50` : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 flex-shrink-0"
                      style={{
                        background: contact.bg,
                        borderColor: isSelected ? contact.color : `${contact.color}50`,
                        boxShadow: isSelected ? `0 0 16px ${contact.color}40` : 'none',
                      }}
                    >
                      {contact.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-midnight-100">{contact.name}</p>
                      <p className="text-xs text-midnight-400">
                        {contact.role} · {contact.lastSeen}
                      </p>
                    </div>
                    {msgCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryContact(contact);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200 hover:opacity-80"
                        style={{ background: contact.bg }}
                      >
                        <History size={10} style={{ color: contact.color }} />
                        <span className="text-[10px] font-bold" style={{ color: contact.color }}>
                          {msgCount}
                        </span>
                        {unreadCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                        )}
                      </button>
                    )}
                    <Send size={14} style={{ color: isSelected ? contact.color : '#475569' }} />
                  </button>

                  {/* Expanded quick messages */}
                  {isSelected && (
                    <div
                      className="mt-1 rounded-2xl border p-3 space-y-2 animate-slide-up"
                      style={{
                        background: 'rgba(15,15,26,0.97)',
                        borderColor: `${contact.color}20`,
                      }}
                    >
                      <p className="text-xs text-midnight-400 mb-2">
                        Hurtige beskeder til {contact.name}:
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {quickMessages.slice(0, 6).map((msg) => (
                          <button
                            key={msg.id}
                            onClick={() => sendQuickMessage(contact.id, msg.label)}
                            className="flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all duration-200 active:scale-95 hover:border-opacity-60"
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              borderColor: `${contact.color}25`,
                            }}
                          >
                            <span className="text-sm">{msg.emoji}</span>
                            <span className="text-[10px] text-midnight-300 leading-tight">
                              {msg.label}
                            </span>
                          </button>
                        ))}
                      </div>
                      {/* Custom message */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendCustomMessage()}
                          placeholder="Skriv din egen besked..."
                          className="flex-1 bg-midnight-800 border border-midnight-600 rounded-xl px-3 py-2 text-xs text-midnight-100 placeholder-midnight-500 focus:outline-none focus:border-opacity-60"
                          style={{ borderColor: `${contact.color}30` }}
                        />
                        <button
                          onClick={sendCustomMessage}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                          style={{
                            background: contact.bg,
                            color: contact.color,
                            border: `1px solid ${contact.color}40`,
                          }}
                        >
                          <Send size={13} />
                        </button>
                      </div>
                      {/* Mini history preview */}
                      {(messageHistory[contact.id] || []).length > 0 && (
                        <button
                          onClick={() => setHistoryContact(contact)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 hover:opacity-80 mt-1"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderColor: `${contact.color}20`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <History size={12} style={{ color: contact.color }} />
                            <span className="text-[10px] text-midnight-400">Se beskedhistorik</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: contact.color }}>
                              {messageHistory[contact.id]?.length} beskeder
                            </span>
                            <ChevronRight size={10} style={{ color: contact.color }} />
                          </div>
                        </button>
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
            <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 p-4 flex items-start gap-3">
              <CompanionAvatar companion={companion} size="sm" mood="happy" />
              <div>
                <p className="text-sm text-midnight-100 leading-relaxed">
                  Vælg hvem der skal have opmuntring — derefter selve beskeden. 💛
                </p>
              </div>
            </div>

            {!opmuntringTarget ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-midnight-300 px-1">Send til…</p>
                <div className="grid grid-cols-1 gap-2">
                  {contacts.map((c) => (
                    <button
                      key={`opm-pick-${c.id}`}
                      type="button"
                      onClick={() => setOpmuntringTarget(c)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.99] min-h-[52px]"
                      style={{
                        background: c.bg,
                        borderColor: `${c.color}40`,
                      }}
                    >
                      <span className="text-2xl">{c.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-midnight-100">{c.name}</p>
                        <p className="text-xs text-midnight-500">{c.role}</p>
                      </div>
                      <ChevronRight
                        className="ml-auto flex-shrink-0"
                        size={16}
                        style={{ color: c.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setOpmuntringTarget(null);
                      setPendingEnc(null);
                    }}
                    className="text-xs font-semibold text-sunrise-400 hover:text-sunrise-300 min-h-[44px] px-2"
                  >
                    ← Skift person
                  </button>
                  <span className="text-xs text-midnight-500">
                    Til:{' '}
                    <strong className="text-midnight-200">
                      {opmuntringTarget.emoji} {opmuntringTarget.name}
                    </strong>
                  </span>
                </div>

                {pendingEnc && (
                  <div
                    className="rounded-2xl border p-4 space-y-3 animate-slide-up"
                    style={{
                      background: 'rgba(15,15,26,0.98)',
                      borderColor: `${opmuntringTarget.color}35`,
                    }}
                  >
                    <p className="text-sm text-midnight-100">
                      Send <span className="font-semibold">&quot;{pendingEnc.text}&quot;</span> til{' '}
                      {opmuntringTarget.name}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingEnc(null)}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold border border-midnight-600 text-midnight-300 min-h-[48px]"
                      >
                        Annuller
                      </button>
                      <button
                        type="button"
                        onClick={confirmSendEncouragement}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold text-midnight-950 min-h-[48px]"
                        style={{ background: opmuntringTarget.color }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {encouragements.map((enc) => {
                    const pairKey = `${enc.id}::${opmuntringTarget.id}`;
                    const isSent = sentEncouragementKeys.includes(pairKey);
                    const reactions = encouragementReactions[enc.id] || [];
                    const isPickerOpen = activeReactionPicker === enc.id;
                    return (
                      <div key={enc.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => !isSent && !pendingEnc && setPendingEnc(enc)}
                          disabled={!!pendingEnc}
                          className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 active:scale-95 disabled:opacity-40"
                          style={{
                            background: isSent ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
                            borderColor: isSent ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <span className="text-3xl">{enc.emoji}</span>
                          <p
                            className="text-xs font-medium text-center leading-tight"
                            style={{ color: isSent ? '#34D399' : '#94a3b8' }}
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
                                    key={`${enc.id}-r-${i}`}
                                    className="text-sm px-1.5 py-0.5 rounded-full bg-midnight-800 border border-midnight-700/40"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveReactionPicker(isPickerOpen ? null : enc.id)
                                }
                                className="flex items-center gap-1 px-2 py-1 rounded-full bg-midnight-800/80 border border-midnight-700/40 text-[10px] text-midnight-400 hover:text-midnight-200 transition-all duration-200 min-h-[36px]"
                              >
                                <Smile size={10} />
                                <span>Reaktion</span>
                              </button>
                              {isPickerOpen && (
                                <div className="absolute bottom-full left-0 mb-1 z-30 bg-midnight-800 border border-midnight-700/60 rounded-2xl p-2 shadow-xl animate-slide-up">
                                  <div className="grid grid-cols-3 gap-1">
                                    {reactionOptions.map((opt) => (
                                      <button
                                        key={opt.emoji}
                                        type="button"
                                        onClick={() => addReaction(enc.id, opt.emoji)}
                                        className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-midnight-700/60 transition-all duration-150 active:scale-90"
                                        title={opt.label}
                                      >
                                        <span className="text-lg">{opt.emoji}</span>
                                        <span className="text-[8px] text-midnight-400">
                                          {opt.label}
                                        </span>
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

            <div className="rounded-2xl bg-aurora-violet/8 border border-aurora-violet/20 p-4 text-center">
              <p className="text-xs text-midnight-400 mb-1">💜 Vidste du?</p>
              <p className="text-sm text-midnight-200 leading-relaxed">
                At sende opmuntring til andre styrker også dit eget velvære.
              </p>
            </div>
          </div>
        )}

        {/* BESKEDER TAB */}
        {activeTab === 'beskeder' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-midnight-300 px-1">Send til…</p>
              <p className="text-[10px] text-midnight-500 px-1">
                Vælg én kontakt fra dit støttenetværk. Beskeden sendes til vedkommende.
              </p>
              <div className="flex flex-wrap gap-2">
                {contacts.map((c) => {
                  const on = beskederContact?.id === c.id;
                  return (
                    <button
                      key={`besked-til-${c.id}`}
                      type="button"
                      onClick={() => setBeskederContact(on ? null : c)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition-all min-h-[44px]"
                      style={{
                        background: on ? c.bg : 'rgba(255,255,255,0.04)',
                        borderColor: on ? `${c.color}60` : 'rgba(255,255,255,0.08)',
                        color: on ? c.color : '#94a3b8',
                      }}
                    >
                      <span className="text-base">{c.emoji}</span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-midnight-400 px-1 pt-1">Hurtige beskedtyper du kan sende</p>
            {quickMessages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-2xl bg-midnight-800/60 border border-midnight-700/30 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3.5">
                  <span className="text-2xl flex-shrink-0">{msg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-midnight-100">{msg.label}</p>
                    <p className="text-[10px] text-midnight-500">{msg.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => trySendBesked(msg)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 min-h-[44px]"
                    style={{
                      background: beskederContact?.bg ?? 'rgba(255,255,255,0.05)',
                      borderColor: beskederContact
                        ? `${beskederContact.color}45`
                        : 'rgba(255,255,255,0.1)',
                      color: beskederContact?.color ?? '#64748b',
                    }}
                  >
                    <Send size={14} />
                    Send
                  </button>
                </div>

                {/* Sent status for this message */}
                {sentBeskeder.filter((b) => b.text === msg.label).length > 0 && (
                  <div className="border-t border-midnight-700/30 px-3.5 py-2 space-y-1">
                    {sentBeskeder
                      .filter((b) => b.text === msg.label)
                      .slice(0, 3)
                      .map((b, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm">{b.contactEmoji}</span>
                          <span className="text-[10px] text-midnight-400 flex-1">
                            {b.contactName}
                          </span>
                          <div className="flex items-center gap-1">
                            <Clock size={9} className="text-midnight-500" />
                            <span className="text-[9px] text-midnight-500">
                              {formatTime(b.timestamp)}
                            </span>
                            <CheckCheck
                              size={11}
                              className={b.read ? 'text-emerald-400' : 'text-midnight-600'}
                            />
                            <span
                              className="text-[9px] font-medium"
                              style={{ color: b.read ? '#34D399' : '#475569' }}
                            >
                              {b.read ? 'Læst' : 'Sendt'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
