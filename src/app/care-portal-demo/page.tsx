'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  Home,
  MessageSquare,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  X,
  Check,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Demo data types
───────────────────────────────────────────────────────── */
type TrafficLight = 'groen' | 'gul' | 'roed';

interface Resident {
  id: string;
  name: string;
  initials: string;
  room: string;
  traffic: TrafficLight;
  mood: number;
  time: string;
  note: string;
  checkedIn: boolean;
  messages: DemoMessage[];
  planItems: PlanItem[];
  weekMoods: number[];
}

interface DemoMessage {
  from: 'borger' | 'personale';
  text: string;
  time: string;
}

interface PlanItem {
  title: string;
  time: string;
  done: boolean;
}

interface Alert {
  id: string;
  name: string;
  initials: string;
  type: 'krise' | 'lav_stemning' | 'inaktivitet';
  detail: string;
  time: string;
  severity: 'roed' | 'gul';
}

interface PlanProposal {
  id: string;
  residentName: string;
  initials: string;
  items: string[];
  note: string;
  status: 'pending' | 'approved' | 'rejected';
}

/* ─────────────────────────────────────────────────────────
   Mock data
───────────────────────────────────────────────────────── */
const INITIAL_RESIDENTS: Resident[] = [
  {
    id: 'r1', name: 'Finn L.', initials: 'FL', room: '3',
    traffic: 'roed', mood: 2, time: '08:12', checkedIn: true,
    note: 'Åbnede kriseplan kl. 08:12. Meget ked af det.',
    messages: [
      { from: 'borger', text: 'Jeg har det rigtig svært i dag 😔', time: '08:10' },
      { from: 'borger', text: 'Kan jeg tale med nogen?', time: '08:11' },
      { from: 'personale', text: 'Hej Finn, vi er her. Sara er på vej til dig.', time: '08:15' },
    ],
    planItems: [
      { title: 'Morgenrutine', time: '08:00', done: true },
      { title: 'Samtale med Sara', time: '09:00', done: false },
      { title: 'Middagsmad', time: '12:00', done: false },
    ],
    weekMoods: [6, 4, 5, 3, 2],
  },
  {
    id: 'r2', name: 'Kirsten R.', initials: 'KR', room: '9',
    traffic: 'roed', mood: 3, time: '07:50', checkedIn: true,
    note: 'Sover dårligt. Angst om natten. Stemningsscore 3/10.',
    messages: [
      { from: 'borger', text: 'Kunne ikke sove igen i nat 😞', time: '07:48' },
      { from: 'personale', text: 'Tak for at du skriver. Vi noterer det.', time: '07:52' },
    ],
    planItems: [
      { title: 'Morgenmeditation', time: '09:30', done: false },
      { title: 'Gåtur med personale', time: '11:00', done: false },
    ],
    weekMoods: [5, 5, 4, 3, 3],
  },
  {
    id: 'r3', name: 'Thomas B.', initials: 'TB', room: '7',
    traffic: 'gul', mood: 5, time: '07:55', checkedIn: true,
    note: 'Lidt urolig. Bekymret for pårørende.',
    messages: [
      { from: 'borger', text: 'Er bekymret for min søster 🙁', time: '07:53' },
    ],
    planItems: [
      { title: 'Morgenkaffe', time: '08:30', done: true },
      { title: 'Ringe til søster', time: '10:00', done: false },
      { title: 'Frokost', time: '12:00', done: false },
    ],
    weekMoods: [6, 7, 5, 6, 5],
  },
  {
    id: 'r4', name: 'Maja T.', initials: 'MT', room: '11',
    traffic: 'gul', mood: 4, time: 'I går', checkedIn: false,
    note: 'Ikke checket ind endnu i dag.',
    messages: [],
    planItems: [
      { title: 'Daglig gåtur', time: '10:00', done: false },
      { title: 'Tegning/kreativ tid', time: '14:00', done: false },
    ],
    weekMoods: [5, 6, 5, 4, 4],
  },
  {
    id: 'r5', name: 'Maria K.', initials: 'MK', room: '12',
    traffic: 'groen', mood: 8, time: '08:32', checkedIn: true,
    note: 'Sov godt. Føler sig klar til dagen.',
    messages: [
      { from: 'borger', text: 'God morgen! Klar til en god dag 😊', time: '08:30' },
    ],
    planItems: [
      { title: 'Morgenritual', time: '08:00', done: true },
      { title: 'Yoga', time: '10:00', done: true },
      { title: 'Frokost', time: '12:00', done: false },
    ],
    weekMoods: [7, 7, 8, 8, 8],
  },
  {
    id: 'r6', name: 'Søren M.', initials: 'SM', room: '15',
    traffic: 'groen', mood: 7, time: '08:45', checkedIn: true,
    note: 'God dag i går. Håber på det samme.',
    messages: [],
    planItems: [
      { title: 'Friskluft', time: '09:00', done: true },
      { title: 'Frivilligarbejde', time: '13:00', done: false },
    ],
    weekMoods: [6, 6, 7, 7, 7],
  },
  {
    id: 'r7', name: 'Lone P.', initials: 'LP', room: '4',
    traffic: 'gul', mood: 4, time: '06:30', checkedIn: true,
    note: 'Tidlig morgen. Lidt træt men OK.',
    messages: [],
    planItems: [
      { title: 'Morgenkaffe', time: '07:00', done: true },
      { title: 'Læse/stille tid', time: '10:00', done: false },
    ],
    weekMoods: [5, 5, 4, 4, 4],
  },
];

const INITIAL_ALERTS: Alert[] = [
  { id: 'a1', name: 'Finn L.',    initials: 'FL', type: 'krise',       detail: 'Åbnede kriseplan kl. 08:12',         time: '08:12', severity: 'roed' },
  { id: 'a2', name: 'Kirsten R.', initials: 'KR', type: 'lav_stemning',detail: 'Stemningsscore 3/10 · Rød trafiklys', time: '07:50', severity: 'roed' },
  { id: 'a3', name: 'Maja T.',    initials: 'MT', type: 'inaktivitet', detail: 'Ingen check-in siden i går',           time: 'I går', severity: 'gul' },
  { id: 'a4', name: 'Thomas B.',  initials: 'TB', type: 'lav_stemning',detail: 'Stemningsscore 5/10 · Gul trafiklys', time: '07:55', severity: 'gul' },
];

const INITIAL_PROPOSALS: PlanProposal[] = [
  {
    id: 'p1', residentName: 'Finn L.', initials: 'FL', status: 'pending',
    note: 'Baseret på kriseplansåbning og rød trafiklys',
    items: ['Samtale med primærperson kl. 09:00', 'Afslappende aktivitet om eftermiddagen', 'Tjek-ind igen kl. 14:00'],
  },
  {
    id: 'p2', residentName: 'Maria K.', initials: 'MK', status: 'pending',
    note: 'Baseret på grøn trafiklys og borgerens ønsker',
    items: ['Fortsat yoga-routine', 'Frivilligarbejde som planlagt', 'Social aktivitet med medboer'],
  },
  {
    id: 'p3', residentName: 'Thomas B.', initials: 'TB', status: 'pending',
    note: 'Tilpasset bekymring om pårørende',
    items: ['Støttet opkald til søster kl. 10:00', 'Kort samtale om bekymringer', 'Aftentur efter middag'],
  },
];

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
const TRAFFIC_CFG: Record<TrafficLight, { color: string; bg: string; label: string; ring: string }> = {
  groen: { color: '#22C55E', bg: '#F0FDF4', label: 'Grøn',  ring: 'rgba(34,197,94,0.3)' },
  gul:   { color: '#EAB308', bg: '#FEFCE8', label: 'Gul',   ring: 'rgba(234,179,8,0.3)' },
  roed:  { color: '#EF4444', bg: '#FEF2F2', label: 'Rød',   ring: 'rgba(239,68,68,0.3)' },
};

const ALERT_CFG = {
  krise:        { label: 'Krise aktiveret', icon: Shield,        color: '#EF4444', bg: '#FEF2F2' },
  lav_stemning: { label: 'Lav stemning',    icon: Activity,      color: '#EF4444', bg: '#FEF2F2' },
  inaktivitet:  { label: 'Inaktivitet',     icon: Clock,         color: '#EAB308', bg: '#FEFCE8' },
};

/* ─────────────────────────────────────────────────────────
   Sparkline SVG
───────────────────────────────────────────────────────── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 80; const h = 28; const max = 10; const min = 0;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / (max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity={i === values.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   Resident detail side panel
───────────────────────────────────────────────────────── */
function ResidentPanel({
  resident,
  onClose,
}: {
  resident: Resident;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DemoMessage[]>(resident.messages);
  const [planItems, setPlanItems] = useState<PlanItem[]>(resident.planItems);
  const cfg = TRAFFIC_CFG[resident.traffic];

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { from: 'personale', text: message.trim(), time: 'Nu' }]);
    setMessage('');
  };

  return (
    <aside
      className="flex flex-col border-l bg-white"
      style={{ width: 320, borderColor: 'rgba(0,0,0,0.07)', height: '100%', overflowY: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: cfg.color, boxShadow: `0 0 0 4px ${cfg.ring}` }}
          >
            {resident.initials}
          </div>
          <div>
            <p className="font-bold text-slate-900">{resident.name}</p>
            <p className="text-xs text-slate-400">Værelse {resident.room}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mood + traffic */}
      <div className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: cfg.bg }}>
          <p className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label} trafiklys</p>
          <p className="text-xl font-extrabold" style={{ color: cfg.color }}>{resident.mood}<span className="text-sm font-medium">/10</span></p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400">Uge</p>
          <Sparkline values={resident.weekMoods} color={cfg.color} />
        </div>
      </div>

      {/* Note */}
      <div className="border-b px-5 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Seneste note</p>
        <p className="text-sm text-slate-700 leading-relaxed">{resident.note}</p>
        <p className="mt-1 text-[10px] text-slate-400">Tjek-in {resident.time}</p>
      </div>

      {/* Plan items */}
      <div className="border-b px-5 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dagsplan</p>
        <div className="flex flex-col gap-1.5">
          {planItems.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPlanItems(prev => prev.map((p, j) => j === i ? { ...p, done: !p.done } : p))}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
            >
              <div
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                style={{ background: item.done ? 'var(--budr-teal)' : 'transparent', border: item.done ? 'none' : '1.5px solid #d1d5db' }}
              >
                {item.done && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.time} — {item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col px-5 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Beskeder</p>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-xs text-slate-400 italic">Ingen beskeder endnu</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'personale' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-snug"
                style={{
                  background: m.from === 'personale' ? 'var(--budr-teal)' : '#f1f5f9',
                  color: m.from === 'personale' ? 'white' : '#334155',
                  borderRadius: m.from === 'personale' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                }}
              >
                {m.text}
                <div className="mt-0.5 text-right text-[9px] opacity-60">{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Message input */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Svar borger…"
            className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none transition-colors focus:border-budr-teal"
            style={{ borderColor: 'rgba(0,0,0,0.12)' }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!message.trim()}
            className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'var(--budr-teal)' }}
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────
   Sidebar nav
───────────────────────────────────────────────────────── */
type NavKey = 'dashboard' | 'beboere' | 'planer' | 'beskeder' | 'dokumentation';

const NAV_ITEMS: { key: NavKey; icon: React.ElementType; label: string }[] = [
  { key: 'dashboard',     icon: Home,          label: 'Dagsoverblik' },
  { key: 'beboere',       icon: Users,         label: 'Beboere' },
  { key: 'planer',        icon: Calendar,      label: 'Planer' },
  { key: 'beskeder',      icon: MessageSquare, label: 'Beskeder' },
  { key: 'dokumentation', icon: FileText,      label: 'Dokumentation' },
];

function Sidebar({ active, onNav, alertCount }: { active: NavKey; onNav: (k: NavKey) => void; alertCount: number }) {
  return (
    <nav
      className="flex flex-col border-r bg-white"
      style={{ width: 210, flexShrink: 0, borderColor: 'rgba(0,0,0,0.07)', height: '100%' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 border-b px-4 py-4" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <AppLogo size={26} />
        <div>
          <p className="text-sm font-bold text-slate-800">Care Portal</p>
          <p className="text-[10px] text-slate-400">Bosted Nordlys</p>
        </div>
      </div>
      {/* Staff */}
      <div className="flex items-center gap-2.5 border-b px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)', background: '#fafafa' }}>
        <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--budr-teal)' }}>SK</div>
        <div>
          <p className="text-xs font-semibold text-slate-800">Sara K.</p>
          <p className="text-[10px] text-slate-400">Dagvagt · 07:00–15:00</p>
        </div>
      </div>
      {/* Nav */}
      <div className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNav(key)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
            style={{
              background: active === key ? 'var(--budr-teal-light)' : 'transparent',
              color: active === key ? 'var(--budr-teal)' : '#64748b',
              fontWeight: active === key ? 700 : 500,
            }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {key === 'dashboard' && alertCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{alertCount}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────
   Dashboard screen
───────────────────────────────────────────────────────── */
function DashboardScreen({
  residents,
  alerts,
  proposals,
  onSelectResident,
  onAcknowledge,
  onApprove,
  onReject,
}: {
  residents: Resident[];
  alerts: Alert[];
  proposals: PlanProposal[];
  onSelectResident: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const checkedIn   = residents.filter(r => r.checkedIn).length;
  const roed        = residents.filter(r => r.traffic === 'roed').length;
  const gul         = residents.filter(r => r.traffic === 'gul').length;
  const avgMood     = (residents.reduce((a, r) => a + r.mood, 0) / residents.length).toFixed(1);
  const pending     = proposals.filter(p => p.status === 'pending').length;

  const stats = [
    { label: 'Aktive beboere',  value: String(residents.length), sub: `${residents.length - checkedIn} ikke checket ind`, icon: Users,         color: '#1D9E75', bg: '#E6F7F2' },
    { label: 'Check-ins i dag', value: String(checkedIn),        sub: `${residents.length - checkedIn} mangler endnu`,    icon: CheckSquare,   color: '#7F77DD', bg: '#F5F4FF', trend: '+3 vs. i går' },
    { label: 'Åbne advarsler',  value: String(alerts.length),    sub: `${roed} kritiske (røde)`,                           icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Gns. stemning',   value: avgMood,                  sub: 'Af 10 mulige',                                      icon: TrendingUp,    color: '#EAB308', bg: '#FEFCE8', trend: gul > 2 ? '-0.4 vs. i går' : undefined },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Dagsoverblik</h1>
          <p className="text-sm text-slate-500">Bosted Nordlys · Dagvagt · Sara K.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </div>
          <button type="button" className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            <RefreshCw className="h-3 w-3" /> Opdater
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border bg-white p-4 transition-all hover:shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: s.bg }}>
                  <Icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
                {s.trend && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{s.trend}</span>
                )}
              </div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{s.value}</p>
              <p className="text-xs font-medium text-slate-600">{s.label}</p>
              <p className="text-[10px] text-slate-400">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-3">

        {/* Alert panel */}
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-slate-800">Aktive advarsler</span>
              {alerts.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{alerts.length}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Live
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Ingen aktive advarsler</p>
              <p className="mt-1 text-xs text-slate-400">Alle beboere har det godt</p>
            </div>
          ) : (
            <div className="divide-y" style={{}}>
              {alerts.map(alert => {
                const cfg = ALERT_CFG[alert.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={alert.id}
                    className="p-4 transition-all"
                    style={{ background: alert.severity === 'roed' ? 'rgba(239,68,68,0.03)' : 'rgba(234,179,8,0.03)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: alert.severity === 'roed' ? '#EF4444' : '#EAB308' }}
                      >
                        {alert.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{alert.name}</span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{alert.detail}</p>
                        <p className="text-[10px] text-slate-400">{alert.time}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAcknowledge(alert.id)}
                        className="shrink-0 rounded px-2.5 py-1.5 text-xs font-semibold transition-all hover:bg-slate-100 active:scale-95"
                        style={{ border: `1px solid ${cfg.color}`, color: cfg.color }}
                      >
                        Kvitter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resident list */}
        <div className="overflow-hidden rounded-xl border bg-white xl:col-span-2" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
            <p className="text-sm font-semibold text-slate-800">Beboeroverblik</p>
          </div>
          <div className="divide-y" style={{}}>
            {residents.map(r => {
              const cfg = TRAFFIC_CFG[r.traffic];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectResident(r.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 active:scale-[0.99]"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: cfg.color }}
                  >
                    {r.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {!r.checkedIn && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">Mangler check-in</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">{r.note}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-lg font-bold tabular-nums" style={{ color: cfg.color }}>{r.mood}</span>
                    <span className="text-[9px] text-slate-400">{r.time}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plan proposals */}
      {proposals.some(p => p.status === 'pending') && (
        <div className="rounded-xl border bg-white" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
            <Sparkles className="h-4 w-4" style={{ color: 'var(--budr-purple)' }} />
            <span className="text-sm font-semibold text-slate-800">AI-foreslåede dagplaner</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--budr-lavender)', color: 'var(--budr-purple)' }}>
              {pending} afventer
            </span>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            {proposals.filter(p => p.status === 'pending').map(p => (
              <div key={p.id} className="rounded-xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.07)', background: '#fafbff' }}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--budr-purple)' }}>
                    {p.initials}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{p.residentName}</span>
                </div>
                <p className="mb-2 text-[10px] text-slate-400 italic">{p.note}</p>
                <ul className="mb-3 flex flex-col gap-1">
                  {p.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span style={{ color: 'var(--budr-purple)' }}>·</span> {item}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(p.id)}
                    className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'var(--budr-teal)' }}
                  >
                    Godkend
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(p.id)}
                    className="flex-1 rounded-lg border py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
                    style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                  >
                    Afvis
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Placeholder screens for other nav items
───────────────────────────────────────────────────────── */
function PlaceholderScreen({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--budr-lavender)' }}>
        <Icon className="h-7 w-7" style={{ color: 'var(--budr-purple)' }} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800">{label}</p>
        <p className="mt-1 text-sm text-slate-400">Denne sektion er tilgængelig i den rigtige Care Portal.</p>
      </div>
      <Link
        href="/care-portal-dashboard"
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
        style={{ background: 'var(--budr-teal)' }}
      >
        Åbn Care Portal <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main demo page
───────────────────────────────────────────────────────── */
export default function CarePortalDemoPage() {
  const [activeNav, setActiveNav]             = useState<NavKey>('dashboard');
  const [residents]                           = useState<Resident[]>(INITIAL_RESIDENTS);
  const [alerts, setAlerts]                   = useState<Alert[]>(INITIAL_ALERTS);
  const [proposals, setProposals]             = useState<PlanProposal[]>(INITIAL_PROPOSALS);
  const [selectedResidentId, setSelected]     = useState<string | null>(null);
  const [liveAlertShown, setLiveAlertShown]   = useState(false);
  const [mobileSidebarOpen, setMobileOpen]    = useState(false);

  const selectedResident = residents.find(r => r.id === selectedResidentId) ?? null;

  // Simulate a live alert arriving after 8 seconds
  useEffect(() => {
    if (liveAlertShown) return;
    const t = setTimeout(() => {
      setAlerts(prev => [
        {
          id: 'live-001',
          name: 'Lone P.',
          initials: 'LP',
          type: 'lav_stemning',
          detail: 'Ny check-in: Stemningsscore 3/10',
          time: 'Nu',
          severity: 'gul',
        },
        ...prev,
      ]);
      setLiveAlertShown(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [liveAlertShown]);

  const acknowledge = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const approveProposal = useCallback((id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  }, []);

  const rejectProposal = useCallback((id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans antialiased">

      {/* ── Demo banner ──────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between px-5 py-2.5 text-white"
        style={{ background: 'linear-gradient(90deg, var(--budr-navy) 0%, #1a1040 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Demo
          </span>
          <span className="text-xs text-white/70">
            Interaktiv demo — ingen rigtige data. Prøv knapperne!
          </span>
        </div>
        <Link
          href="/care-portal-dashboard"
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--budr-teal)' }}
        >
          Åbn rigtig Care Portal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Mobile top bar ───────────────────────────── */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 xl:hidden" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <div className="flex items-center gap-2">
          <AppLogo size={22} />
          <span className="text-sm font-bold text-slate-800">Care Portal</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600"
          style={{ borderColor: 'rgba(0,0,0,0.1)' }}
        >
          Menu
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileSidebarOpen && (
        <div className="border-b bg-white px-3 py-2 xl:hidden" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
          <div className="flex flex-wrap gap-1.5">
            {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveNav(key); setMobileOpen(false); }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                style={{
                  background: activeNav === key ? 'var(--budr-teal-light)' : '#f1f5f9',
                  color: activeNav === key ? 'var(--budr-teal)' : '#64748b',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main shell ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 90px)' }}>

        {/* Sidebar (desktop only) */}
        <div className="hidden xl:block" style={{ height: '100%' }}>
          <Sidebar active={activeNav} onNav={setActiveNav} alertCount={alerts.length} />
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {activeNav === 'dashboard' && (
            <DashboardScreen
              residents={residents}
              alerts={alerts}
              proposals={proposals}
              onSelectResident={setSelected}
              onAcknowledge={acknowledge}
              onApprove={approveProposal}
              onReject={rejectProposal}
            />
          )}
          {activeNav === 'beboere' && <PlaceholderScreen label="Beboerarkiv" icon={Users} />}
          {activeNav === 'planer' && <PlaceholderScreen label="Planlægger" icon={Calendar} />}
          {activeNav === 'beskeder' && <PlaceholderScreen label="Beskedindbakke" icon={MessageSquare} />}
          {activeNav === 'dokumentation' && <PlaceholderScreen label="Dokumentation" icon={FileText} />}

          {/* Resident detail panel */}
          {selectedResident && activeNav === 'dashboard' && (
            <ResidentPanel
              resident={selectedResident}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {/* ── Bottom CTA strip ──────────────────────────── */}
      <div
        className="shrink-0 border-t px-5 py-4"
        style={{ borderColor: 'rgba(0,0,0,0.07)', background: 'white' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">Imponeret? Det er kun en demo.</p>
            <p className="text-xs text-slate-400">Den rigtige Care Portal forbindes til dit botilbud på under 5 minutter.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href="mailto:hej@budrcare.dk?subject=Demo af BUDR Care Portal"
              className="rounded-full border px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
            >
              Book demo
            </a>
            <Link
              href="/care-portal-dashboard"
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'var(--budr-teal)' }}
            >
              Åbn Care Portal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
