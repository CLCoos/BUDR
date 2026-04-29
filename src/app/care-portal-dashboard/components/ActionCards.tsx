'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Building2, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';
import {
  acknowledgeSafetyEvent,
  fetchResidentNamesByIds,
  fetchUnacknowledgedSafetyEvents,
  formatRelativeDa,
  subscribeSafetyEvents,
  truncateSafetyUtterance,
  type SafetyEventWithResident,
} from '@/lib/lys/safetyEventsService';

type Props = {
  onOpenOverrapport: () => void;
  /** Ekstra kort til borger-app (pilot med simulerede dashboard-widgets) */
  showPilotBorgerCard?: boolean;
};

export default function ActionCards({ onOpenOverrapport, showPilotBorgerCard = false }: Props) {
  const router = useRouter();
  const auth = useAuthenticatedUser();
  const [safetyEvents, setSafetyEvents] = useState<SafetyEventWithResident[]>([]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    let cancelled = false;
    void fetchUnacknowledgedSafetyEvents(auth.org.id)
      .then((rows) => {
        if (!cancelled) setSafetyEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setSafetyEvents([]);
      });

    const unsubscribe = subscribeSafetyEvents(auth.org.id, ({ eventType, event }) => {
      if (event.risk_level === 'none') return;
      if (eventType === 'INSERT' && event.acknowledged_at === null) {
        void fetchResidentNamesByIds([event.resident_id]).then((nameMap) => {
          const residentName = nameMap.get(event.resident_id) ?? 'Ukendt beboer';
          setSafetyEvents((prev) => {
            if (prev.some((row) => row.id === event.id)) return prev;
            return [{ ...event, resident_name: residentName }, ...prev];
          });
        });
      }
      if (eventType === 'UPDATE' && event.acknowledged_at !== null) {
        setSafetyEvents((prev) => prev.filter((row) => row.id !== event.id));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth]);

  const sortedEvents = useMemo(() => {
    return [...safetyEvents].sort((a, b) => {
      const aW = a.risk_level === 'acute' ? 0 : 1;
      const bW = b.risk_level === 'acute' ? 0 : 1;
      if (aW !== bW) return aW - bW;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [safetyEvents]);

  async function onAcknowledge(eventId: string) {
    if (auth.status !== 'authenticated') return;
    try {
      await acknowledgeSafetyEvent(eventId, auth.staff.id);
      setSafetyEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch {
      toast.error('Kunne ikke bekræfte safety-event.');
    }
  }

  return (
    <div className="mb-6">
      <div
        className="mb-3 grid gap-[10px]"
        style={{
          gridTemplateColumns: showPilotBorgerCard
            ? 'repeat(auto-fit, minmax(170px, 1fr))'
            : 'repeat(3, 1fr)',
        }}
      >
        {/* Kort 1 — Overrapport */}
        <button
          type="button"
          onClick={onOpenOverrapport}
          className="text-left rounded-xl px-4 py-[14px] transition-all duration-150 group"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            border: '1px solid var(--cp-border)',
            borderRadius: 12,
            borderTop: '2px solid var(--cp-green)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--cp-green-dim)' }}
            >
              <Home size={18} style={{ color: 'var(--cp-green)' }} />
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
            >
              Klar til godkendelse
            </span>
          </div>
          <div
            className="text-sm font-semibold transition-colors"
            style={{ color: 'var(--cp-text)' }}
          >
            Overrapport
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
            AI-udkast til vagtskifte
          </div>
        </button>

        {/* Kort 2 — Indsatsdokumentation */}
        <button
          type="button"
          onClick={() => router.push('/care-portal-indsatsdok')}
          className="text-left rounded-xl px-4 py-[14px] transition-all duration-150 group"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            border: '1px solid var(--cp-border)',
            borderRadius: 12,
            borderTop: '2px solid var(--cp-amber)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--cp-amber-dim)' }}
            >
              <Building2 size={18} style={{ color: 'var(--cp-amber)' }} />
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
            >
              2 afventer
            </span>
          </div>
          <div
            className="text-sm font-semibold transition-colors"
            style={{ color: 'var(--cp-text)' }}
          >
            Indsatsdok.
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
            Skabeloner til magt- og indsatsdokumentation (serviceloven)
          </div>
        </button>

        {/* Kort 3 — Tilsynsrapport */}
        <button
          type="button"
          onClick={() => router.push('/care-portal-tilsynsrapport')}
          className="text-left rounded-xl px-4 py-[14px] transition-all duration-150 group"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            border: '1px solid var(--cp-border)',
            borderRadius: 12,
            borderTop: '2px solid var(--cp-blue)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--cp-blue-dim)' }}
            >
              <Plus size={18} style={{ color: 'var(--cp-blue)' }} />
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }}
            >
              Opdateret i dag
            </span>
          </div>
          <div
            className="text-sm font-semibold transition-colors"
            style={{ color: 'var(--cp-text)' }}
          >
            Tilsynsrapport
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
            Autogenerer pakke til tilsyn
          </div>
        </button>

        {showPilotBorgerCard ? (
          <button
            type="button"
            onClick={() => router.push('/park-hub')}
            className="group rounded-xl px-4 py-[14px] text-left transition-all duration-150"
            style={{
              backgroundColor: 'var(--cp-bg2)',
              border: '1px solid var(--cp-border)',
              borderRadius: 12,
              borderTop: '2px solid #8b84e8',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'rgba(139, 132, 232, 0.2)' }}
              >
                <Sparkles size={18} style={{ color: '#a5a0e8' }} />
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: 'rgba(139, 132, 232, 0.2)', color: '#c4bffc' }}
              >
                Lys
              </span>
            </div>
            <div
              className="text-sm font-semibold transition-colors"
              style={{ color: 'var(--cp-text)' }}
            >
              Borger-app
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
              Åbn den rigtige borger-flade (PIN / session som i drift)
            </div>
          </button>
        ) : null}
      </div>

      <div
        id="lys-safety-events"
        className="rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Lys-advarsler
          </h3>
          <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            {sortedEvents.length} ubekræftede
          </span>
        </div>
        {sortedEvents.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            Ingen aktuelle safety-events.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedEvents.slice(0, 6).map((event) => {
              const isAcute = event.risk_level === 'acute';
              return (
                <li
                  key={event.id}
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: isAcute ? '#dc2626' : '#f59e0b',
                    borderWidth: isAcute ? 2 : 1,
                    backgroundColor: isAcute ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.08)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: isAcute ? 'rgba(220,38,38,0.2)' : 'rgba(245,158,11,0.2)',
                        color: isAcute ? '#fecaca' : '#fcd34d',
                      }}
                    >
                      <AlertTriangle
                        size={12}
                        className={isAcute ? 'animate-pulse' : undefined}
                        aria-hidden
                      />
                      {event.risk_level}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--cp-text)' }}>
                      {event.resident_name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {event.category} · {formatRelativeDa(event.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {truncateSafetyUtterance(event.user_utterance)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                      style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
                      onClick={() =>
                        router.push(
                          `/resident-360-view/${event.resident_id}?tab=lys-samtaler&conversationId=${event.conversation_id ?? ''}`
                        )
                      }
                    >
                      Åbn samtale
                    </button>
                    {auth.status === 'authenticated' ? (
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: 'var(--cp-green)', color: '#052317' }}
                        onClick={() => void onAcknowledge(event.id)}
                      >
                        Bekræft set
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
