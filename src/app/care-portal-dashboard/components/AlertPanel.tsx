'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, Activity, Shield, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { logPortalAudit } from '@/lib/auditClient';

/** PostgREST kræver FK for embed; vi henter navne i et separat kald. */
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
  residentName: string;
  initials: string;
  type: AlertType;
  detail: string;
  timestamp: string;
  severity: Severity;
  source: AlertSource;
  isComputed?: boolean; // inactivity alerts are not stored in DB
  crisisStatus?: 'active' | 'acknowledged' | 'resolved';
}

interface CrisisAlertDb {
  id: string;
  resident_id: string;
  triggered_at: string;
  status: 'active' | 'acknowledged' | 'resolved';
  trin: number;
}

const alertTypeConfig: Record<
  AlertType,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  krise: {
    label: 'Krise aktiveret',
    icon: Shield,
    color: 'var(--cp-red)',
    bg: 'var(--cp-red-dim)',
  },
  lav_stemning: {
    label: 'Lav stemning',
    icon: Activity,
    color: 'var(--cp-red)',
    bg: 'var(--cp-red-dim)',
  },
  inaktivitet: {
    label: 'Inaktivitet',
    icon: Clock,
    color: 'var(--cp-amber)',
    bg: 'var(--cp-amber-dim)',
  },
  besked: {
    label: 'Besked fra beboer',
    icon: MessageSquare,
    color: 'var(--cp-blue)',
    bg: 'var(--cp-blue-dim)',
  },
  mood_alert: {
    label: 'Lav stemning',
    icon: Activity,
    color: 'var(--cp-red)',
    bg: 'var(--cp-red-dim)',
  },
  crisis_alert: {
    label: 'Krise',
    icon: AlertTriangle,
    color: 'var(--cp-red)',
    bg: 'var(--cp-red-dim)',
  },
  medication_missed: {
    label: 'Medicin mangler',
    icon: AlertTriangle,
    color: 'var(--cp-red)',
    bg: 'var(--cp-red-dim)',
  },
  checkin_missing: {
    label: 'Check-in mangler',
    icon: Clock,
    color: 'var(--cp-amber)',
    bg: 'var(--cp-amber-dim)',
  },
  goal_completed: {
    label: 'Mål afsluttet',
    icon: Shield,
    color: 'var(--cp-blue)',
    bg: 'var(--cp-blue-dim)',
  },
};

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) {
    return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffH < 48) return 'I går';
  return `${Math.floor(diffH / 24)} dage siden`;
}

const DEMO_ALERT_SEED: AlertRow[] = [
  {
    id: 'demo-alert-1',
    residentName: 'Finn L.',
    initials: 'FL',
    type: 'krise',
    detail: 'Kriseplan åbnet fra Park Hub — personale tilkaldt.',
    severity: 'roed',
    timestamp: '08:14',
    source: 'notification',
  },
  {
    id: 'demo-alert-2',
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

type AlertPanelProps = { variant?: 'live' | 'demo' };

export default function AlertPanel({ variant = 'live' }: AlertPanelProps) {
  const [dbAlerts, setDbAlerts] = useState<AlertRow[]>([]);
  const [crisisAlerts, setCrisisAlerts] = useState<AlertRow[]>([]);
  const [inactiveAlerts, setInactiveAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(variant !== 'demo');
  const [demoAlerts, setDemoAlerts] = useState<AlertRow[]>(() =>
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
      const isUnacknowledged = n.status === 'active';
      return {
        id: n.id,
        residentName: name,
        initials: toInitials(name),
        type: 'crisis_alert',
        detail: `Krisehjælp aktiveret (trin ${n.trin})`,
        severity: isUnacknowledged ? 'roed' : 'gul',
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

    // Find residents whose last check-in was > 48h ago (or never)
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

    const activeIds = new Set((recentCheckins ?? []).map((c) => c.resident_id));

    const inactive: AlertRow[] = residents
      .filter((r) => !activeIds.has(r.user_id))
      .map((r) => {
        const name = r.display_name ?? 'Ukendt beboer';
        return {
          id: `inaktiv-${r.user_id}`,
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

    const timer = setInterval(() => void fetchInactivity(), 5 * 60 * 1000);

    return () => {
      void supabase.removeChannel(notificationsChannel);
      void supabase.removeChannel(crisisChannel);
      clearInterval(timer);
    };
  }, [variant, fetchDbAlerts, fetchCrisisAlerts, fetchInactivity]);

  const acknowledge = async (alert: AlertRow) => {
    if (variant === 'demo') {
      setDemoAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      toast.success('Advarsel kvitteret');
      return;
    }

    if (alert.isComputed) {
      setInactiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      toast.success('Advarsel kvitteret');
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (alert.source === 'crisis') {
      const patch =
        alert.crisisStatus === 'active'
          ? {
              status: 'acknowledged',
              acknowledged_by: user?.id ?? null,
              acknowledged_at: new Date().toISOString(),
            }
          : {
              acknowledged_by: user?.id ?? null,
              acknowledged_at: new Date().toISOString(),
            };
      const { error } = await supabase.from('crisis_alerts').update(patch).eq('id', alert.id);

      if (error) {
        toast.error('Kunne ikke kvittere — prøv igen');
        return;
      }

      setCrisisAlerts((prev) =>
        prev.map((item) =>
          item.id === alert.id ? { ...item, crisisStatus: 'acknowledged', severity: 'gul' } : item
        )
      );
      void logPortalAudit({
        action: 'daily_plan.updated',
        tableName: 'crisis_alerts',
        recordId: alert.id,
        metadata: { operation: 'acknowledge' },
      });
      toast.success('Krise-alarm kvitteret');
      return;
    }

    const { error } = await supabase
      .from('care_portal_notifications')
      .update({ acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq('id', alert.id);

    if (error) {
      toast.error('Kunne ikke kvittere — prøv igen');
      return;
    }

    setDbAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'care_portal_notifications',
      recordId: alert.id,
      metadata: { operation: 'acknowledge' },
    });
    toast.success('Advarsel kvitteret');
  };

  const resolve = async (alert: AlertRow) => {
    if (variant === 'demo') {
      setDemoAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      toast.success('Krise-alarm markeret som løst');
      return;
    }
    if (alert.source !== 'crisis') return;

    const supabase = createClient();
    if (!supabase) return;

    const patch = {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      acknowledged_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('crisis_alerts').update(patch).eq('id', alert.id);
    if (error) {
      toast.error('Kunne ikke markere som løst');
      return;
    }

    setCrisisAlerts((prev) => prev.filter((item) => item.id !== alert.id));
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'crisis_alerts',
      recordId: alert.id,
      metadata: { operation: 'resolve' },
    });
    toast.success('Krise-alarm markeret som løst');
  };

  const priority = (alert: AlertRow): number => {
    if (alert.source === 'crisis' && alert.crisisStatus === 'active') return 0;
    if (alert.severity === 'roed') return 1;
    return 2;
  };

  const alerts =
    variant === 'demo'
      ? [...demoAlerts].sort((a, b) => {
          return priority(a) - priority(b);
        })
      : [...crisisAlerts, ...dbAlerts, ...inactiveAlerts].sort((a, b) => {
          return priority(a) - priority(b);
        });

  return (
    <div id="budr-advarsler" className="cp-card-elevated scroll-mt-24 h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} style={{ color: 'var(--cp-red)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--cp-text)', fontSize: 13 }}>
            Aktive advarsler
          </span>
          {alerts.length > 0 && (
            <span
              className="text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
              style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
            >
              {alerts.length}
            </span>
          )}
        </div>
        {/* Live pill */}
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
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'var(--cp-green-dim)' }}
          >
            <Shield size={20} style={{ color: 'var(--cp-green)' }} />
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Ingen aktive advarsler
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--cp-muted)' }}>
            Alle beboere har det godt
          </div>
        </div>
      ) : (
        <div>
          {alerts.map((alert) => {
            const config = alertTypeConfig[alert.type];
            const avatarBg =
              alert.severity === 'roed' ? 'var(--cp-red-dim)' : 'var(--cp-amber-dim)';
            const avatarColor = alert.severity === 'roed' ? 'var(--cp-red)' : 'var(--cp-amber)';
            return (
              <div
                key={alert.id}
                className="p-4 transition-all"
                style={{ borderBottom: '1px solid var(--cp-border)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: avatarBg, color: avatarColor }}
                  >
                    {alert.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--cp-text)', fontSize: 13 }}
                      >
                        {alert.residentName}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="text-xs mb-1" style={{ color: 'var(--cp-muted)' }}>
                      {alert.detail}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                      {alert.timestamp}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => void acknowledge(alert)}
                      className="px-2.5 py-1.5 rounded text-xs font-medium transition-all active:scale-95"
                      style={{
                        border: '1px solid var(--cp-border2)',
                        backgroundColor: 'transparent',
                        color: 'var(--cp-muted)',
                        borderRadius: 6,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)';
                      }}
                    >
                      Kvitter
                    </button>
                    {alert.source === 'crisis' && (
                      <button
                        onClick={() => void resolve(alert)}
                        className="px-2.5 py-1.5 rounded text-xs font-medium transition-all active:scale-95"
                        style={{
                          border: '1px solid var(--cp-red)',
                          backgroundColor: 'var(--cp-red-dim)',
                          color: 'var(--cp-red)',
                          borderRadius: 6,
                        }}
                      >
                        Løst
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
