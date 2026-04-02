'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, Activity, Shield, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

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

interface InactiveResident {
  user_id: string;
  display_name: string;
  last_checkin: string | null;
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

const alertTypeConfig: Record<AlertType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  krise:       { label: 'Krise aktiveret', icon: Shield,        color: '#EF4444', bg: '#FEF2F2' },
  lav_stemning:{ label: 'Lav stemning',    icon: Activity,      color: '#EF4444', bg: '#FEF2F2' },
  inaktivitet: { label: 'Inaktivitet',     icon: Clock,         color: '#EAB308', bg: '#FEFCE8' },
  besked:      { label: 'Besked fra beboer', icon: MessageSquare, color: '#7F77DD', bg: '#F5F4FF' },
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

export default function AlertPanel() {
  const [dbAlerts, setDbAlerts] = useState<AlertRow[]>([]);
  const [inactiveAlerts, setInactiveAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDbAlerts = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('care_portal_notifications')
      .select('id, resident_id, type, detail, severity, created_at, care_residents(display_name)')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AlertPanel] fetch error:', error.message);
      return;
    }

    const rows: AlertRow[] = ((data ?? []) as unknown as DbNotification[]).map(n => {
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

    // Find residents whose last check-in was > 48h ago (or never)
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    const { data: residents } = await supabase
      .from('care_residents')
      .select('user_id, display_name');

    if (!residents) return;

    const { data: recentCheckins } = await supabase
      .from('park_daily_checkin')
      .select('resident_id, created_at')
      .gte('created_at', cutoff);

    const activeIds = new Set((recentCheckins ?? []).map(c => c.resident_id));

    const inactive: AlertRow[] = residents
      .filter(r => !activeIds.has(r.user_id))
      .map(r => {
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
        },
      )
      .subscribe();

    // Refresh inactivity every 5 minutes
    const timer = setInterval(() => void fetchInactivity(), 5 * 60 * 1000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [fetchDbAlerts, fetchInactivity]);

  const acknowledge = async (alert: AlertRow) => {
    if (alert.isComputed) {
      // Inactivity is computed — just hide from UI
      setInactiveAlerts(prev => prev.filter(a => a.id !== alert.id));
      toast.success('Advarsel kvitteret');
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('care_portal_notifications')
      .update({ acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq('id', alert.id);

    if (error) {
      toast.error('Kunne ikke kvittere — prøv igen');
      return;
    }

    setDbAlerts(prev => prev.filter(a => a.id !== alert.id));
    toast.success('Advarsel kvitteret');
  };

  const alerts = [...dbAlerts, ...inactiveAlerts].sort((a, b) => {
    const sev = (s: Severity) => s === 'roed' ? 0 : 1;
    return sev(a.severity) - sev(b.severity);
  });

  return (
    <div
      id="budr-advarsler"
      className="scroll-mt-24 bg-white rounded-lg border border-gray-100 overflow-hidden h-full"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <span className="text-sm font-semibold text-gray-800">Aktive advarsler</span>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <Shield size={20} className="text-green-600" />
          </div>
          <div className="text-sm font-semibold text-gray-700">Ingen aktive advarsler</div>
          <div className="text-xs text-gray-400 mt-1">Alle beboere har det godt</div>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {alerts.map(alert => {
            const config = alertTypeConfig[alert.type];
            return (
              <div
                key={alert.id}
                className={`p-4 transition-all ${alert.severity === 'roed' ? 'bg-red-50/30' : 'bg-yellow-50/30'}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: alert.severity === 'roed' ? '#EF4444' : '#EAB308' }}
                  >
                    {alert.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-800">{alert.residentName}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">{alert.detail}</div>
                    <div className="text-xs text-gray-400">{alert.timestamp}</div>
                  </div>
                  <button
                    onClick={() => void acknowledge(alert)}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded text-xs font-medium border transition-all hover:bg-gray-100 active:scale-95"
                    style={{ borderColor: config.color, color: config.color }}
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
