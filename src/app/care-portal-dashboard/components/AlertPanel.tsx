'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, Activity, Shield, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

type AlertType = 'inaktivitet' | 'lav_stemning' | 'krise' | 'besked';
type Severity = 'gul' | 'roed';

interface DbNotification {
  id: string;
  resident_id: string;
  type: AlertType;
  detail: string;
  severity: Severity;
  created_at: string;
  care_residents: { display_name: string } | null;
}

interface AlertRow {
  id: string;
  residentName: string;
  initials: string;
  type: AlertType;
  detail: string;
  timestamp: string;
  severity: Severity;
  isComputed?: boolean; // inactivity alerts are not stored in DB
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
  },
  {
    id: 'demo-alert-2',
    residentName: 'Kirsten R.',
    initials: 'KR',
    type: 'lav_stemning',
    detail: 'Stemning under 4/10 ved morgencheck-in.',
    severity: 'roed',
    timestamp: '07:52',
  },
  {
    id: 'demo-alert-3',
    residentName: 'Thomas B.',
    initials: 'TB',
    type: 'inaktivitet',
    detail: 'Ingen check-in i over 48 timer',
    severity: 'gul',
    timestamp: '48h+',
    isComputed: true,
  },
];

export const DEMO_ALERT_PANEL_COUNT = DEMO_ALERT_SEED.length;

type AlertPanelProps = { variant?: 'live' | 'demo' };

export default function AlertPanel({ variant = 'live' }: AlertPanelProps) {
  const [dbAlerts, setDbAlerts] = useState<AlertRow[]>([]);
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

    const { data, error } = await supabase
      .from('care_portal_notifications')
      .select('id, resident_id, type, detail, severity, created_at, care_residents(display_name)')
      .is('acknowledged_at', null)
      .in('resident_id', residentIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AlertPanel] fetch error:', error.message);
      setLoading(false);
      return;
    }

    const rows: AlertRow[] = ((data ?? []) as unknown as DbNotification[]).map((n) => {
      const name = n.care_residents?.display_name ?? 'Ukendt beboer';
      return {
        id: n.id,
        residentName: name,
        initials: toInitials(name),
        type: n.type,
        detail: n.detail,
        severity: n.severity,
        timestamp: formatTimestamp(n.created_at),
      };
    });

    setDbAlerts(rows);
    setLoading(false);
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
    void fetchInactivity();

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('care_portal_notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_portal_notifications' },
        () => {
          void fetchDbAlerts();
        }
      )
      .subscribe();

    const timer = setInterval(() => void fetchInactivity(), 5 * 60 * 1000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [variant, fetchDbAlerts, fetchInactivity]);

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

    const { error } = await supabase
      .from('care_portal_notifications')
      .update({ acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq('id', alert.id);

    if (error) {
      toast.error('Kunne ikke kvittere — prøv igen');
      return;
    }

    setDbAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    toast.success('Advarsel kvitteret');
  };

  const alerts =
    variant === 'demo'
      ? [...demoAlerts].sort((a, b) => {
          const sev = (s: Severity) => (s === 'roed' ? 0 : 1);
          return sev(a.severity) - sev(b.severity);
        })
      : [...dbAlerts, ...inactiveAlerts].sort((a, b) => {
          const sev = (s: Severity) => (s === 'roed' ? 0 : 1);
          return sev(a.severity) - sev(b.severity);
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
                  <button
                    onClick={() => void acknowledge(alert)}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded text-xs font-medium transition-all active:scale-95"
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
