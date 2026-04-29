'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';
import {
  fetchResidentNamesByIds,
  fetchUnacknowledgedSafetyEvents,
  formatRelativeDa,
  subscribeSafetyEvents,
  type SafetyEventWithResident,
} from '@/lib/lys/safetyEventsService';

function badgeStyle(events: SafetyEventWithResident[]): React.CSSProperties | null {
  if (events.length === 0) return null;
  const hasAcute = events.some((event) => event.risk_level === 'acute');
  if (hasAcute) return { backgroundColor: '#dc2626', color: '#fee2e2' };
  return { backgroundColor: '#f59e0b', color: '#1b1403' };
}

export default function PortalNotificationBar() {
  const auth = useAuthenticatedUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<SafetyEventWithResident[]>([]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    let cancelled = false;

    void fetchUnacknowledgedSafetyEvents(auth.org.id)
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });

    const unsubscribe = subscribeSafetyEvents(auth.org.id, ({ eventType, event }) => {
      if (event.risk_level === 'none') return;

      if (eventType === 'INSERT' && event.acknowledged_at === null) {
        void fetchResidentNamesByIds([event.resident_id]).then((nameMap) => {
          const residentName = nameMap.get(event.resident_id) ?? 'Ukendt beboer';
          setEvents((prev) => {
            const already = prev.some((row) => row.id === event.id);
            if (already) return prev;
            const next: SafetyEventWithResident = {
              ...event,
              resident_name: residentName,
            };
            return [next, ...prev];
          });
        });
      }

      if (eventType === 'UPDATE' && event.acknowledged_at !== null) {
        setEvents((prev) => prev.filter((row) => row.id !== event.id));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth]);

  const newest = useMemo(() => events.slice(0, 5), [events]);
  const badge = badgeStyle(events);

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border"
        style={{
          borderColor: 'var(--cp-border)',
          backgroundColor: 'var(--cp-bg3)',
          color: 'var(--cp-text)',
        }}
        aria-label="Åbn Lys safety-notifikationer"
        aria-expanded={open}
      >
        <Bell size={16} aria-hidden />
        {badge ? (
          <span
            className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={badge}
          >
            {events.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-[10040] mt-2 w-[320px] overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--cp-border2)', backgroundColor: 'var(--cp-bg2)' }}
          role="menu"
          aria-label="Lys safety-events"
        >
          <div className="border-b px-3 py-2.5" style={{ borderColor: 'var(--cp-border)' }}>
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--cp-muted2)' }}
            >
              Lys safety-events
            </p>
          </div>
          {newest.length === 0 ? (
            <p className="px-3 py-4 text-sm" style={{ color: 'var(--cp-muted)' }}>
              Ingen ubekræftede events.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--cp-border)' }}>
              {newest.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left hover:bg-[var(--cp-bg3)]"
                    onClick={() => {
                      setOpen(false);
                      router.push(
                        `/resident-360-view/${event.resident_id}?tab=lys-samtaler&conversationId=${event.conversation_id ?? ''}`
                      );
                    }}
                  >
                    <p className="text-xs font-semibold" style={{ color: 'var(--cp-text)' }}>
                      {event.resident_name}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {event.risk_level} · {event.category} · {formatRelativeDa(event.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t px-3 py-2" style={{ borderColor: 'var(--cp-border)' }}>
            <Link
              href="/care-portal-dashboard#lys-safety-events"
              onClick={() => setOpen(false)}
              className="text-xs font-medium"
              style={{ color: 'var(--cp-green)' }}
            >
              Se alle
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
