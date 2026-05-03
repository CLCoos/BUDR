'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Frown,
  Meh,
  MoreVertical,
  Smile,
  StickyNote,
  Pill,
  CheckCircle,
} from 'lucide-react';
import { TrafficDot, type TrafficValue } from '@/components/ui/TrafficDot';
import type { ResidentItem, TrafficUi } from '@/app/resident-360-view/residentOverviewTypes';
import { cn } from '@/lib/cn';
import styles from './ResidentRow.module.css';

export type ResidentQuickAction = 'note' | 'medication' | 'check-in' | 'open360';

export type ResidentRowProps = {
  resident: ResidentItem;
  density: 'compact' | 'comfortable';
  onRowClick: () => void;
  onQuickAction: (action: ResidentQuickAction) => void;
  className?: string;
};

function trafficUiToDotValue(tl: TrafficUi | null): TrafficValue {
  if (!tl) return 'none';
  if (tl === 'groen') return 'green';
  if (tl === 'gul') return 'yellow';
  return 'red';
}

function formatCheckin(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const timeStr = date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (date >= todayStart) return timeStr;
  if (date >= yesterdayStart) return `I går ${timeStr}`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

function MoodIcon({ score }: { score: number }) {
  if (score >= 7)
    return <Smile size={16} strokeWidth={2} className={styles.moodGood} aria-hidden />;
  if (score >= 4) return <Meh size={16} strokeWidth={2} className={styles.moodMid} aria-hidden />;
  return <Frown size={16} strokeWidth={2} className={styles.moodLow} aria-hidden />;
}

export function ResidentRow({
  resident,
  density,
  onRowClick,
  onQuickAction,
  className,
}: ResidentRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const needsCheckIn = !resident.checkinToday;
  const dotVal = trafficUiToDotValue(resident.trafficLight);
  const roomLine =
    resident.house && resident.house !== '—'
      ? `${resident.house} · ${resident.room}`
      : resident.room;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const noteLine1 = resident.notePreview;
  const noteLine2 = resident.checkinToday
    ? 'Check-in registreret i dag'
    : 'Ingen check-in i dag endnu';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick();
        }
      }}
      className={cn(
        styles.row,
        density === 'compact' && styles.rowCompact,
        needsCheckIn && styles.rowNeedsCheckin,
        className
      )}
    >
      <div className={styles.mainRow}>
        <div className={styles.nameCol}>
          <div className={styles.avatarWrap}>
            <div
              className={cn(styles.avatar, needsCheckIn && styles.avatarNeedsAttention)}
              style={
                resident.trafficLight === 'roed'
                  ? { backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }
                  : resident.trafficLight === 'gul'
                    ? { backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }
                    : { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' }
              }
            >
              {resident.initials}
              {needsCheckIn ? <span className={styles.avatarDot} aria-hidden /> : null}
            </div>
            <div className={styles.nameBlock}>
              <div className={styles.nameLine}>
                <span className={styles.name}>{resident.name}</span>
                {resident.pendingProposals > 0 ? (
                  <span className={styles.pendingBadge} title="Afventende forslag">
                    <Clock size={11} aria-hidden />
                    <span>{resident.pendingProposals}</span>
                  </span>
                ) : null}
              </div>
              <span className={styles.room}>{roomLine}</span>
            </div>
          </div>
        </div>

        <div className={styles.trafficCol} title={resident.trafficLight ?? 'Ingen check-in'}>
          <TrafficDot value={dotVal} size="md" />
        </div>

        <div className={styles.moodCol}>
          {resident.moodScore !== null ? (
            <span className={styles.moodWrap}>
              <MoodIcon score={resident.moodScore} />
            </span>
          ) : (
            <span className={styles.dash}>—</span>
          )}
        </div>

        <div className={styles.timeCol}>
          {resident.checkinToday ? (
            <span className={styles.checkinLive}>
              <span className={styles.liveDot} aria-hidden />
              {formatCheckin(resident.lastCheckinIso)}
            </span>
          ) : (
            <span className={styles.checkinMuted}>{formatCheckin(resident.lastCheckinIso)}</span>
          )}
        </div>

        <div className={styles.actionsCol} ref={menuRef}>
          <button
            type="button"
            className={cn(styles.menuBtn, 'resident-row-menu-btn')}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Hurtige handlinger"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen ? (
            <ul
              role="menu"
              className={styles.menu}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction('note');
                  }}
                >
                  <StickyNote size={14} aria-hidden /> Skriv hurtig journal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction('medication');
                  }}
                >
                  <Pill size={14} aria-hidden /> Registrer medicin
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction('check-in');
                  }}
                >
                  <CheckCircle size={14} aria-hidden /> Markér check-in
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction('open360');
                  }}
                >
                  Åbn 360°-visning
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>

      {density === 'comfortable' ? (
        <blockquote className={styles.noteQuote}>
          <span className={styles.noteLine1}>{noteLine1}</span>
          <span className={styles.noteLine2}>
            {noteLine2}
            {resident.lastCheckinIso ? (
              <span className={styles.noteMeta}> · {formatCheckin(resident.lastCheckinIso)}</span>
            ) : null}
          </span>
        </blockquote>
      ) : null}
    </div>
  );
}
