'use client';
import React, { useState } from 'react';
import { AlertTriangle, Clock, Activity, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Alert {
  id: string;
  residentName: string;
  initials: string;
  type: 'inaktivitet' | 'lav_stemning' | 'krise';
  detail: string;
  timestamp: string;
  severity: 'gul' | 'roed';
}

const initialAlerts: Alert[] = [
  {
    id: 'alert-001',
    residentName: 'Finn L.',
    initials: 'FL',
    type: 'krise',
    detail: 'Åbnede kriseplan kl. 08:12',
    timestamp: '08:12',
    severity: 'roed',
  },
  {
    id: 'alert-002',
    residentName: 'Kirsten R.',
    initials: 'KR',
    type: 'lav_stemning',
    detail: 'Stemningsscore 2/10 · Rød trafiklys',
    timestamp: '07:55',
    severity: 'roed',
  },
  {
    id: 'alert-003',
    residentName: 'Thomas B.',
    initials: 'TB',
    type: 'inaktivitet',
    detail: 'Ingen check-in i 52 timer',
    timestamp: 'I går',
    severity: 'gul',
  },
  {
    id: 'alert-004',
    residentName: 'Maja T.',
    initials: 'MT',
    type: 'lav_stemning',
    detail: 'Stemningsscore 3/10 · Gul trafiklys',
    timestamp: '06:40',
    severity: 'gul',
  },
];

const alertTypeConfig = {
  krise: { label: 'Krise aktiveret', icon: Shield, color: '#EF4444', bg: '#FEF2F2' },
  lav_stemning: { label: 'Lav stemning', icon: Activity, color: '#EF4444', bg: '#FEF2F2' },
  inaktivitet: { label: 'Inaktivitet', icon: Clock, color: '#EAB308', bg: '#FEFCE8' },
};

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const acknowledge = (id: string) => {
    // Backend: UPDATE care_portal_notifications SET resolved=true, resolved_by=staff_id WHERE id
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success('Advarsel kvitteret');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden h-full">
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

      {alerts.length === 0 ? (
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
                    onClick={() => acknowledge(alert.id)}
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