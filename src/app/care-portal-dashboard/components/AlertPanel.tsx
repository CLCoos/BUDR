'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

async function loadResidentNamesByUserId(
  supabase: SupabaseClient,
  orgId: string
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('care_residents')
    .select('user_id, display_name')
    .eq('org_id', orgId);

  const map: Record<string, string> = {};
  for (const r of data ?? []) {
    const row = r as { user_id: string; display_name: string | null };
    if (!row.user_id) continue;
    map[row.user_id] = String(row.display_name ?? '').trim() || 'Ukendt beboer';
  }
  return map;
}

type AlertType =
  | 'inaktivitet'
  | 'lav_stemning'
  | 'krise'
  | 'besked'
  | 'mood_alert'
  | 'crisis_alert'
  | 'medication_missed'
  | 'checkin_missing'
  | 'goal_completed';
type Severity = 'gul' | 'roed';
type AlertSource = 'notification' | 'crisis' | 'inactivity';

interface DbNotification {
  id: string;
  resident_id: string;
  type: AlertType;
  detail: string;
  severity: Severity;
  created_at: string;
}

interface AlertRow {
  id: string;
  residentId: string;
  residentName: string;
  initials: string;
  type: AlertType;
  detail: string;
  timestamp: string;
  severity: Severity;
  source: AlertSource;
  isComputed?: boolean;
  crisisStatus?: 'active' | 'acknowledged' | 'resolved';
}

interface CrisisAlertDb {
  id: string;
  resident_id: string;
  triggered_at: string;
  status: 'active' | 'acknowledged' | 'resolved';
  trin: number;
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48) return 'I går';
  return `${Math.floor(diffH / 24)} dage siden`;
}

const DEMO_ALERT_SEED: AlertRow[] = [
  {
    id: 'demo-alert-1',
    residentId: 'demo-resident-1',
    residentName: 'Finn L.',
    initials: 'FL',
    type: 'crisis_alert',
    detail: 'Krisehjælp aktiveret (trin 2)',
    severity: 'roed',
    timestamp: '08:14',
    source: 'crisis',
    crisisStatus: 'active',
  },
  {
    id: 'demo-alert-2',
    residentId: 'demo-resident-2',
    residentName: 'Kirsten R.',
    initials: 'KR',
    type: 'lav_stemning',
    detail: 'Stemning under 4/10 ved morgencheck-in.',
    severity: 'roed',
    timestamp: '07:52',
    source: 'notification',
  },
  {
    id: 'demo-alert-3',
    residentId: 'demo-resident-3',
    residentName: 'Thomas B.',
    initials: 'TB',
    type: 'inaktivitet',
    detail: 'Ingen check-in i over 48 timer',
    severity: 'gul',
    timestamp: '48h+',
    source: 'inactivity',
    isComputed: true,
  },
];

export const DEMO_ALERT_PANEL_COUNT = DEMO_ALERT_SEED.length;

function isCritical(alert: AlertRow): boolean {
  return alert.source === 'crisis' || alert.severity === 'roed';
}

function isWatchout(alert: AlertRow): boolean {
  return alert.source !== 'inactivity' && !isCritical(alert);
}

function badgeLabelFor(alert: AlertRow): string {
  if (alert.source === 'crisis') return 'Krise';
  if (alert.type === 'lav_stemning' || alert.type === 'mood_alert') return 'Lav stemning';
  if (alert.type === 'medication_missed') return 'Medicin mangler';
  if (alert.type === 'checkin_missing') return 'Check-in mangler';
  if (alert.type === 'besked') return 'Besked fra beboer';
  return 'Advarsel';
}

// ── AlertCard ─────────────────────────────────────────────────

function AlertCard({ alert, group }: { alert: AlertRow; group: 'roed' | 'gul' }) {
  const router = useRouter();
  const accentColor = group === 'roed' ? 'var(--cp-red)' : 'var(--cp-amber)';
  const dimColor = group === 'roed' ? 'var(--cp-red-dim)' : 'var(--cp-amber-dim)';
  const cardHref = `/resident-360-view/${alert.residentId}?tab=overblik`;
  const actionHref =
    alert.source === 'crisis'
      ? `/resident-360-view/${alert.residentId}?tab=overblik`
      : `/resident-360-view/${alert.residentId}?tab=overblik`;
  const actionLabel = alert.source === 'crisis' ? 'Åbn kriseplan' : 'Se journal';

  return (
    <div
      className="relative transition-colors"
      style={{ borderBottom: '1px solid var(--cp-border)', borderLeft: `3px solid ${accentColor}` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = '';
      }}
    >
      {/* Full-card click target — sits behind content in stacking order */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full"
        onClick={() => router.push(cardHref)}
        aria-label={`Åbn ${alert.residentName}`}
        tabIndex={-1}
      />

      {/* Card content */}
      <div className="relative flex items-start gap-3 p-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: dimColor, color: accentColor }}
        >
          {alert.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)', fontSize: 13 }}>
              {alert.residentName}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: dimColor, color: accentColor }}
            >
              {badgeLabelFor(alert)}
            </span>
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--cp-muted)' }}>
            {alert.detail}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
              {alert.timestamp}
            </span>
            <Link
              href={actionHref}
              className="relative text-[11px] font-semibold px-2 py-1 rounded transition-opacity hover:opacity-80"
              style={{ backgroundColor: dimColor, color: accentColor }}
            >
              {actionLabel} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AlertPanel ────────────────────────────────────────────────

type AlertPanelProps = { variant?: 'live' | 'demo' };

export default function AlertPanel({ variant = 'live' }: AlertPanelProps) {
  const [dbAlerts, setDbAlerts] = useState<AlertRow[]>([]);
  const [crisisAlerts, setCrisisAlerts] = useState<AlertRow[]>([]);
  const [inactiveAlerts, setInactiveAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(variant !== 'demo');
  const [inaktivitetExpanded, setInaktivitetExpanded] = useState(false);
  const [demoAlerts] = useState<AlertRow[]>(() =>
    variant === 'demo' ? [...DEMO_ALERT_SEED] : []
  );

  const fetchDbAlerts = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { orgId, residentIds, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !orgId || residentIds.length === 0) {
      setDbAlerts([]);
      setLoading(false);
      return;
    }

    const nameByUserId = await loadResidentNamesByUserId(supabase, orgId);

    const { data, error } = await supabase
      .from('care_portal_notifications')
      .select('id, resident_id, type, detail, severity, created_at')
      .is('acknowledged_at', null)
      .in('resident_id', residentIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AlertPanel] fetch error:', error.message);
      setLoading(false);
      return;
    }

    const rows: AlertRow[] = ((data ?? []) as unknown as DbNotification[]).map((n) => {
      const name = nameByUserId[n.resident_id] ?? 'Ukendt beboer';
      return {
        id: n.id,
        residentId: n.resident_id,
        residentName: name,
        initials: toInitials(name),
        type: n.type,
        detail: n.detail,
        severity: n.severity,
        timestamp: formatTimestamp(n.created_at),
        source: 'notification',
      };
    });

    setDbAlerts(rows);
    setLoading(false);
  }, []);

  const fetchCrisisAlerts = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { orgId, residentIds, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !orgId || residentIds.length === 0) {
      setCrisisAlerts([]);
      return;
    }

    const nameByUserId = await loadResidentNamesByUserId(supabase, orgId);

    const { data, error } = await supabase
      .from('crisis_alerts')
      .select('id, resident_id, triggered_at, status, trin')
      .in('resident_id', residentIds)
      .neq('status', 'resolved')
      .order('triggered_at', { ascending: false });

    if (error) {
      console.error('[AlertPanel] fetch crisis alerts error:', error.message);
      return;
    }

    const rows: AlertRow[] = ((data ?? []) as unknown as CrisisAlertDb[]).map((n) => {
      const name = nameByUserId[n.resident_id] ?? 'Ukendt beboer';
      return {
        id: n.id,
        residentId: n.resident_id,
        residentName: name,
        initials: toInitials(name),
        type: 'crisis_alert',
        detail: `Krisehjælp aktiveret (trin ${n.trin})`,
        severity: n.status === 'active' ? 'roed' : 'gul',
        timestamp: formatTimestamp(n.triggered_at),
        source: 'crisis',
        crisisStatus: n.status,
      };
    });

    setCrisisAlerts(rows);
  }, []);

  const fetchInactivity = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { orgId, residentIds, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !orgId || residentIds.length === 0) {
      setInactiveAlerts([]);
      return;
    }

    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    const { data: residents } = await supabase
      .from('care_residents')
      .select('user_id, display_name')
      .eq('org_id', orgId);

    if (!residents) return;

    const { data: recentCheckins } = await supabase
      .from('park_daily_checkin')
      .select('resident_id, created_at')
      .gte('created_at', cutoff)
      .in('resident_id', residentIds);

    const activeIds = new Set((recentCheckins ?? []).map((c) => c.resident_id as string));

    const inactive: AlertRow[] = residents
      .filter((r) => !activeIds.has(r.user_id))
      .map((r) => {
        const name = (r.display_name as string | null) ?? 'Ukendt beboer';
        return {
          id: `inaktiv-${r.user_id as string}`,
          residentId: r.user_id as string,
          residentName: name,
          initials: toInitials(name),
          type: 'inaktivitet' as AlertType,
          detail: 'Ingen check-in i over 48 timer',
          severity: 'gul' as Severity,
          timestamp: '48h+',
          source: 'inactivity' as AlertSource,
          isComputed: true,
        };
      });

    setInactiveAlerts(inactive);
  }, []);

  useEffect(() => {
    if (variant === 'demo') {
      setLoading(false);
      return;
    }

    void fetchDbAlerts();
    void fetchCrisisAlerts();
    void fetchInactivity();

    const supabase = createClient();
    if (!supabase) return;

    const notificationsChannel = supabase
      .channel('care_portal_notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_portal_notifications' },
        () => {
          void fetchDbAlerts();
        }
      )
      .subscribe();

    const crisisChannel = supabase
      .channel('crisis_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_alerts' }, () => {
        void fetchCrisisAlerts();
      })
      .subscribe();

    // Auto-resolve inaktivitet + lav_stemning alerts when a new check-in arrives
    const checkinChannel = supabase
      .channel('alert_panel_checkins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'park_daily_checkin' },
        (payload) => {
          const row = payload.new as { resident_id: string; mood_score: number | null };
          const rid = row.resident_id;
          // Always remove inaktivitet for this resident immediately
          setInactiveAlerts((prev) => prev.filter((a) => a.residentId !== rid));
          // If mood score recovers (>= 5), also drop mood alerts from notifications
          if ((row.mood_score ?? 0) >= 5) {
            setDbAlerts((prev) =>
              prev.filter(
                (a) =>
                  !(
                    a.residentId === rid &&
                    (a.type === 'lav_stemning' || a.type === 'mood_alert')
                  )
              )
            );
          }
        }
      )
      .subscribe();

    const timer = setInterval(() => void fetchInactivity(), 5 * 60 * 1000);

    return () => {
      void supabase.removeChannel(notificationsChannel);
      void supabase.removeChannel(crisisChannel);
      void supabase.removeChannel(checkinChannel);
      clearInterval(timer);
    };
  }, [variant, fetchDbAlerts, fetchCrisisAlerts, fetchInactivity]);

  const allAlerts =
    variant === 'demo'
      ? demoAlerts
      : [...crisisAlerts, ...dbAlerts, ...inactiveAlerts];

  const group1 = allAlerts.filter(isCritical);
  const group2 = allAlerts.filter(isWatchout);
  const group3 = allAlerts.filter((a) => a.source === 'inactivity');
  const urgentCount = group1.length + group2.length;

  return (
    <div id="budr-advarsler" className="cp-card-elevated scroll-mt-24 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} style={{ color: 'var(--cp-red)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--cp-text)', fontSize: 13 }}>
            Aktive advarsler
            {urgentCount > 0 && (
              <span
                className="ml-2 text-xs rounded-full w-5 h-5 inline-flex items-center justify-center font-bold"
                style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
              >
                {urgentCount}
              </span>
            )}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5"
          style={{
            padding: '4px 10px',
            borderRadius: 20,
            backgroundColor: 'var(--cp-green-dim)',
            border: '1px solid rgba(45,212,160,0.2)',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--cp-green)',
              boxShadow: '0 0 6px var(--cp-green)',
              animation: 'pulse 2s infinite',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--cp-green)', fontWeight: 500 }}>
            {variant === 'demo' ? 'Demo' : 'Live'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid var(--cp-border2)', borderTopColor: 'var(--cp-green)' }}
          />
        </div>
      ) : (
        <div>
          {/* Empty state — groups 1 & 2 */}
          {urgentCount === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--cp-green-dim)' }}
              >
                <CheckCircle2 size={20} style={{ color: 'var(--cp-green)' }} />
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Alt roligt i dag
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--cp-muted)' }}>
                Ingen akutte advarsler
              </div>
            </div>
          )}

          {/* Group 1: Kræver handling nu */}
          {group1.length > 0 && (
            <div>
              <div
                className="px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--cp-red)', borderBottom: '1px solid var(--cp-border)' }}
              >
                🔴 Kræver handling nu
              </div>
              {group1.map((alert) => (
                <AlertCard key={alert.id} alert={alert} group="roed" />
              ))}
            </div>
          )}

          {/* Group 2: Hold øje med */}
          {group2.length > 0 && (
            <div style={{ borderTop: '1px solid var(--cp-border)' }}>
              <div
                className="px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--cp-amber)', borderBottom: '1px solid var(--cp-border)' }}
              >
                🟡 Hold øje med
              </div>
              {group2.map((alert) => (
                <AlertCard key={alert.id} alert={alert} group="gul" />
              ))}
            </div>
          )}

          {/* Group 3: Inaktivitet — collapsed by default */}
          {group3.length > 0 && (
            <div style={{ borderTop: '1px solid var(--cp-border)' }}>
              <button
                type="button"
                onClick={() => setInaktivitetExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
              >
                <div className="flex items-center gap-2">
                  <Clock size={12} style={{ color: 'var(--cp-muted)' }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    ⚪ Inaktivitet
                  </span>
                  <span
                    className="text-[11px] rounded-full px-2 py-0.5 font-medium"
                    style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' }}
                  >
                    {group3.length} beboere uden check-in
                  </span>
                </div>
                {inaktivitetExpanded ? (
                  <ChevronUp size={14} style={{ color: 'var(--cp-muted)' }} />
                ) : (
                  <ChevronDown size={14} style={{ color: 'var(--cp-muted)' }} />
                )}
              </button>

              {inaktivitetExpanded &&
                group3.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/resident-360-view/${alert.residentId}?tab=overblik`}
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors"
                    style={{ borderTop: '1px solid var(--cp-border)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '';
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' }}
                    >
                      {alert.initials}
                    </div>
                    <span className="flex-1 text-sm" style={{ color: 'var(--cp-text)', fontSize: 13 }}>
                      {alert.residentName}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--cp-muted)' }}>
                      48h+
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
