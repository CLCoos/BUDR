'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LysShell from '../park-hub/components/LysShell';

// ── Demo data seeder ──────────────────────────────────────────────────────────

const RESIDENT_ID = 'demo-resident-001';
const COOKIE_NAME = 'budr_resident_id';

function daysAgo(n: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function seedLocalStorage() {
  // Only seed if no demo data exists yet
  const alreadySeeded = localStorage.getItem('budr_demo_seeded_v1');
  if (alreadySeeded === RESIDENT_ID) return;

  // ── 14 days of check-ins ────────────────────────────────────
  const energyPattern = [8, 7, 9, 6, 5, 4, 6, 7, 8, 8, 7, 6, 7, 8];
  const labelMap: Record<number, string> = {
    1: 'Svært', 2: 'Svært', 3: 'Dårligt', 4: 'Dårligt',
    5: 'OK', 6: 'OK', 7: 'Godt', 8: 'Godt', 9: 'Fantastisk', 10: 'Fantastisk',
  };
  const checkins = energyPattern.map((e, i) => ({
    id: `demo-ci-${i}`,
    resident_id: RESIDENT_ID,
    check_in_date: todayStr(i),
    energy_level: e,
    label: labelMap[e] ?? 'OK',
    created_at: daysAgo(i, 8, 30),
  }));
  localStorage.setItem('budr_checkins', JSON.stringify(checkins));

  // ── Journal entries ──────────────────────────────────────────
  const journal = [
    {
      id: 'demo-j-1',
      date: todayStr(0),
      mode: 'write',
      text: 'Havde en god morgen i dag. Stod tidligt op og gik en tur i haven, som altid giver mig ro. Lys spurgte mig om mine drømme i nat, og jeg tænkte over det længe. Måske er det positivt at drømme om fremtiden.',
      mood: 8,
      feelings: ['Glad', 'Rolig', 'Håbefuld'],
      privacy: 'private',
      prompt: 'Hvad gav dig energi i dag?',
    },
    {
      id: 'demo-j-2',
      date: todayStr(2),
      mode: 'write',
      text: 'Svær dag. Fik et opkald fra min søster som rørte op i gamle følelser. Brugte krisekortene som Lys anbefalede — det hjalp faktisk. Sov bedre end forventet.',
      mood: 5,
      feelings: ['Ked af det', 'Urolig', 'Lidt bedre'],
      privacy: 'shared',
      prompt: 'Hvad var svært i dag, og hvordan klarede du det?',
    },
    {
      id: 'demo-j-3',
      date: todayStr(4),
      mode: 'write',
      text: 'Malede i dag for første gang i månedsvis. Det føltes som at finde en gammel ven. Jeg glemte helt tid og sted. Lys sagde at kreativitet er et tegn på indre frihed.',
      mood: 9,
      feelings: ['Glad', 'Stolt', 'Rolig'],
      privacy: 'shared',
      prompt: 'Hvornår glemte du dig selv i dag?',
    },
    {
      id: 'demo-j-4',
      date: todayStr(7),
      mode: 'write',
      text: 'Gruppesamtale i dag om mål. Jeg sagde højt, at jeg gerne vil tage bussen alene til butikken. Det føltes skræmmende men befriende at sige det.',
      mood: 7,
      feelings: ['Nervøs', 'Modig', 'Glad'],
      privacy: 'private',
      prompt: 'Hvad ville du ønske, andre vidste om dig?',
    },
    {
      id: 'demo-j-5',
      date: todayStr(10),
      mode: 'voice',
      text: 'Transskriberet fra stemmenotat: Jeg har haft en rigtig god uge. Sov gennem natten to gange. Spiste morgenmad med Lena. Lille sejr, men det tæller.',
      mood: 8,
      feelings: ['Taknemmelig', 'Rolig'],
      privacy: 'shared',
      prompt: null,
    },
  ];
  localStorage.setItem('budr_journal_entries_v1', JSON.stringify(journal));

  // ── XP & level ───────────────────────────────────────────────
  localStorage.setItem('budr_xp', JSON.stringify({ total_xp: 2450, level: 5 }));

  // ── XP log ───────────────────────────────────────────────────
  const xpLog = [
    { id: 'xl-1', activity: 'check_in',    xp: 25,  ts: daysAgo(0) },
    { id: 'xl-2', activity: 'journal',     xp: 30,  ts: daysAgo(0) },
    { id: 'xl-3', activity: 'check_in',    xp: 25,  ts: daysAgo(1) },
    { id: 'xl-4', activity: 'goal_water',  xp: 20,  ts: daysAgo(1) },
    { id: 'xl-5', activity: 'check_in',    xp: 25,  ts: daysAgo(2) },
    { id: 'xl-6', activity: 'counter_thought', xp: 40, ts: daysAgo(2) },
    { id: 'xl-7', activity: 'journal',     xp: 30,  ts: daysAgo(2) },
    { id: 'xl-8', activity: 'check_in',    xp: 25,  ts: daysAgo(3) },
  ];
  localStorage.setItem('budr_xp_log', JSON.stringify(xpLog));

  // ── Badges ───────────────────────────────────────────────────
  const badges = [
    { badge_key: 'first_checkin',    earned_at: daysAgo(13) },
    { badge_key: 'week_streak',      earned_at: daysAgo(7) },
    { badge_key: 'journal_debut',    earned_at: daysAgo(10) },
    { badge_key: 'garden_first',     earned_at: daysAgo(8) },
    { badge_key: 'krap_master',      earned_at: daysAgo(4) },
    { badge_key: 'calm_week',        earned_at: daysAgo(1) },
  ];
  localStorage.setItem('budr_badges', JSON.stringify(badges));

  // ── Garden plots ─────────────────────────────────────────────
  const garden = [
    {
      id: 'demo-g-1',
      resident_id: RESIDENT_ID,
      slot_index: 0,
      plant_type: 'flower',
      plant_name: 'Solsikke',
      goal_text: 'Gå en tur udenfor hver dag',
      growth_stage: 4,
      total_water: 87,
      last_watered_at: daysAgo(0),
      is_park_linked: false,
      created_at: daysAgo(13),
    },
    {
      id: 'demo-g-2',
      resident_id: RESIDENT_ID,
      slot_index: 1,
      plant_type: 'tree',
      plant_name: 'Egetræ',
      goal_text: 'Tage bussen alene til butikken',
      growth_stage: 2,
      total_water: 34,
      last_watered_at: daysAgo(1),
      is_park_linked: false,
      created_at: daysAgo(10),
    },
    {
      id: 'demo-g-3',
      resident_id: RESIDENT_ID,
      slot_index: 2,
      plant_type: 'herb',
      plant_name: 'Mynte',
      goal_text: 'Sove igennem natten 5 gange på rad',
      growth_stage: 3,
      total_water: 61,
      last_watered_at: daysAgo(0),
      is_park_linked: false,
      created_at: daysAgo(11),
    },
    {
      id: 'demo-g-4',
      resident_id: RESIDENT_ID,
      slot_index: 3,
      plant_type: 'vegetable',
      plant_name: 'Tomat',
      goal_text: 'Ringe til min søster én gang om ugen',
      growth_stage: 1,
      total_water: 12,
      last_watered_at: daysAgo(3),
      is_park_linked: false,
      created_at: daysAgo(5),
    },
  ];
  localStorage.setItem('budr_garden', JSON.stringify(garden));

  // ── Lys conversations ────────────────────────────────────────
  const conversations = [
    {
      id: 'demo-conv-1',
      resident_id: RESIDENT_ID,
      title: 'Morgensnak om mål',
      messages: [
        { role: 'user',      content: 'Hej Lys, jeg har sovet godt i nat!' },
        { role: 'assistant', content: 'Det er virkelig dejligt at høre, Anders! God søvn gør en stor forskel for, hvordan vi har det i løbet af dagen. Har du nogen planer for i dag?' },
        { role: 'user',      content: 'Ja, jeg tænkte på at male lidt og måske gå en tur.' },
        { role: 'assistant', content: 'Det lyder som en rigtig god dag! At kombinere noget kreativt med frisk luft er kraftfuldt for humøret. Hvad vil du male?' },
        { role: 'user',      content: 'Noget med haven måske. Jeg kan godt lide blomster.' },
        { role: 'assistant', content: 'Blomster er smukt valg. De symboliserer vækst og fornyelse — præcis som din solsikke i haven herinde. Husk at vande dine planter i dag! 🌻' },
      ],
      created_at: daysAgo(0, 8),
      updated_at: daysAgo(0, 8, 15),
    },
    {
      id: 'demo-conv-2',
      resident_id: RESIDENT_ID,
      title: 'Tankefanger: Telefonopkald',
      messages: [
        { role: 'user',      content: 'Jeg er ked af det. Min søster ringede og sagde noget der sårede mig.' },
        { role: 'assistant', content: 'Det lyder hårdt, Anders. Det er okay at være ked af det. Vil du fortælle mig lidt mere om, hvad hun sagde?' },
        { role: 'user',      content: 'Hun sagde at jeg aldrig ringer. Men det er svært for mig.' },
        { role: 'assistant', content: 'Jeg forstår. Det kan føles uretfærdigt at blive kritiseret for noget, du allerede kæmper med. Hvad tænker du om hendes ord?' },
        { role: 'user',      content: 'At hun har ret, men at jeg gerne ville. Det er bare svært.' },
        { role: 'assistant', content: 'Det er en vigtig erkendelse — at skelne imellem "kan ikke" og "vil gerne, men det er svært". Det er faktisk et tegn på fremgang, at du ønsker det. Hvad ville gøre det lidt lettere at ringe til hende?' },
        { role: 'user',      content: 'Måske at have et tidspunkt, jeg beslutter på forhånd.' },
        { role: 'assistant', content: 'Perfekt idé! En fast aftale fjerner en masse af den mentale energi, det koster at beslutte sig. Din tomat-plante handler om netop det mål. Vil du vande den i dag som en lille markering?' },
      ],
      created_at: daysAgo(2, 14),
      updated_at: daysAgo(2, 15),
    },
  ];
  localStorage.setItem('budr_lys_conversations', JSON.stringify(conversations));

  // ── Profile ───────────────────────────────────────────────────
  localStorage.setItem('budr_profile', JSON.stringify({ nickname: 'Anders', theme: 'purple', avatar: null }));

  // ── Plan items ────────────────────────────────────────────────
  const planItems = [
    { id: 'demo-pi-1', resident_id: RESIDENT_ID, title: 'Morgenmeditation',    category: 'Velvære',   emoji: '🧘', time_of_day: '08:00', recurrence: 'daily', recurrence_days: null, notify: true,  notify_minutes_before: 10, created_by: 'resident', staff_suggestion: false, approved_by_resident: true, active_from: todayStr(13), created_at: daysAgo(13) },
    { id: 'demo-pi-2', resident_id: RESIDENT_ID, title: 'Morgenmad',            category: 'Ernæring',  emoji: '🍳', time_of_day: '08:30', recurrence: 'daily', recurrence_days: null, notify: false, notify_minutes_before: 0,  created_by: 'staff',    staff_suggestion: true,  approved_by_resident: true, active_from: todayStr(13), created_at: daysAgo(13) },
    { id: 'demo-pi-3', resident_id: RESIDENT_ID, title: 'Daglig gåtur',         category: 'Aktivitet', emoji: '🚶', time_of_day: '10:00', recurrence: 'daily', recurrence_days: null, notify: true,  notify_minutes_before: 5,  created_by: 'resident', staff_suggestion: false, approved_by_resident: true, active_from: todayStr(10), created_at: daysAgo(10) },
    { id: 'demo-pi-4', resident_id: RESIDENT_ID, title: 'Frokost',              category: 'Ernæring',  emoji: '🥗', time_of_day: '12:00', recurrence: 'daily', recurrence_days: null, notify: false, notify_minutes_before: 0,  created_by: 'staff',    staff_suggestion: true,  approved_by_resident: true, active_from: todayStr(13), created_at: daysAgo(13) },
    { id: 'demo-pi-5', resident_id: RESIDENT_ID, title: 'Kreativ tid (maleri)', category: 'Kreativitet', emoji: '🎨', time_of_day: '14:00', recurrence: 'weekdays', recurrence_days: [1,2,3,4,5], notify: true, notify_minutes_before: 15, created_by: 'resident', staff_suggestion: false, approved_by_resident: true, active_from: todayStr(7), created_at: daysAgo(7) },
    { id: 'demo-pi-6', resident_id: RESIDENT_ID, title: 'Aftensmad med gruppen', category: 'Social',   emoji: '🍽️', time_of_day: '18:00', recurrence: 'daily', recurrence_days: null, notify: false, notify_minutes_before: 0,  created_by: 'staff',    staff_suggestion: true,  approved_by_resident: true, active_from: todayStr(13), created_at: daysAgo(13) },
  ];
  localStorage.setItem('budr_plan_items', JSON.stringify(planItems));

  // ── Plan completions (today) ──────────────────────────────────
  const completions = [
    { id: 'demo-pc-1', resident_id: RESIDENT_ID, plan_item_id: 'demo-pi-1', completion_date: todayStr(0), completed_at: daysAgo(0, 8, 5) },
    { id: 'demo-pc-2', resident_id: RESIDENT_ID, plan_item_id: 'demo-pi-2', completion_date: todayStr(0), completed_at: daysAgo(0, 8, 45) },
  ];
  localStorage.setItem('budr_plan_completions', JSON.stringify(completions));

  // ── Self letter ───────────────────────────────────────────────
  const deliverDate = new Date();
  deliverDate.setMonth(deliverDate.getMonth() + 1);
  const selfLetters = [
    {
      id: 'demo-sl-1',
      text: 'Kære Anders. Når du læser dette, er der gået en måned. Jeg håber du stadig husker, hvordan det føltes at male solsikken — den frihed i armene. Hold fast i dét. Du er stærkere end du tror.',
      written_at: daysAgo(7),
      deliver_at: deliverDate.toISOString().slice(0, 10),
      delivered: false,
    },
  ];
  localStorage.setItem('budr_self_letters', JSON.stringify(selfLetters));

  // ── Mark as seeded ────────────────────────────────────────────
  localStorage.setItem('budr_demo_seeded_v1', RESIDENT_ID);
}

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ResidentDemoPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedLocalStorage();
    setCookie(COOKIE_NAME, RESIDENT_ID);
    // Small delay so the seed is fully written before rendering LysShell
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F4FF]">
        <div className="text-center">
          <div className="flex justify-center gap-1.5 mb-4">
            {[0, 150, 300].map(d => (
              <span key={d} className="w-2.5 h-2.5 bg-[#7F77DD] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <p className="text-sm text-gray-500">Gør demo klar…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Demo banner */}
      <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-1.5 bg-amber-50 border-b border-amber-200">
        <span className="text-xs font-medium text-amber-800">
          Demo-tilstand · Anders M. · Data gemt lokalt i browser
        </span>
        <div className="flex items-center gap-3">
          <Link href="/care-portal-demo" className="text-xs text-amber-700 hover:underline">
            Se Care Portal demo →
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('budr_demo_seeded_v1');
              window.location.reload();
            }}
            className="text-xs text-amber-600 hover:underline"
          >
            Nulstil demo
          </button>
        </div>
      </div>

      {/* Offset for banner */}
      <div className="pt-8">
        <LysShell
          firstName="Anders"
          initials="AM"
          residentId={RESIDENT_ID}
          facilityId={null}
        />
      </div>
    </div>
  );
}
