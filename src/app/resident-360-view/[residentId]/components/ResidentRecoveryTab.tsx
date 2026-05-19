'use client';

import React from 'react';
import { Sparkles, Compass, Calendar, ArrowRight } from 'lucide-react';
import {
  RECOVERY_PROFILE_FIELDS,
  type ChimeDomain,
  type LysRecoveryProfile,
  type LysNextStep,
  type LysReflection,
  type LysCheckin,
} from '@/types/lys';

const CHIME_LABELS_DA: Record<ChimeDomain, string> = {
  connectedness: 'Forbundethed',
  hope: 'Håb',
  identity: 'Identitet',
  meaning: 'Mening',
  empowerment: 'Handlekraft',
};

const CHIME_DOMAINS: ChimeDomain[] = [
  'connectedness',
  'hope',
  'identity',
  'meaning',
  'empowerment',
];

interface Props {
  residentId: string;
  recoveryProfile: LysRecoveryProfile | null;
  profileCompletionPercent: number;
  activeNextSteps: LysNextStep[];
  recentReflections: LysReflection[];
  recentWeeklyCheckins: LysCheckin[];
}

function formatRelativeDanish(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (day === 0) return 'i dag';
  if (day === 1) return 'i går';
  if (day < 7) return `for ${day} dage siden`;
  const week = Math.floor(day / 7);
  if (week < 4) return `for ${week} uger siden`;
  return new Date(iso).toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(s: string | null, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg2)',
  borderColor: 'var(--cp-border)',
};

export default function ResidentRecoveryTab({
  recoveryProfile,
  profileCompletionPercent,
  activeNextSteps,
  recentReflections,
  recentWeeklyCheckins,
}: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-5" style={panelStyle}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--cp-green)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
              Recovery-profil
            </h3>
          </div>
          <div className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            {profileCompletionPercent}% udfyldt
          </div>
        </div>

        {!recoveryProfile ? (
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Borgeren har endnu ikke startet sin recovery-profil.
          </p>
        ) : (
          <div className="space-y-3">
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--cp-bg3)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, profileCompletionPercent))}%`,
                  backgroundColor: 'var(--cp-green)',
                }}
              />
            </div>
            <RecoveryProfileSummary profile={recoveryProfile} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-5" style={panelStyle}>
        <div className="mb-4 flex items-center gap-2">
          <Compass size={18} style={{ color: 'var(--cp-green)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
            CHIME-trends (ugentlige refleksioner)
          </h3>
        </div>

        {recentWeeklyCheckins.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen ugentlige refleksioner endnu. Banneret i Lys-appen prompter borgeren når det er
            tid.
          </p>
        ) : (
          <ChimeTrendsTable checkins={recentWeeklyCheckins} />
        )}
      </section>

      <section className="rounded-2xl border p-5" style={panelStyle}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight size={18} style={{ color: 'var(--cp-green)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
              Aktive næste skridt
            </h3>
          </div>
          <div className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            {activeNextSteps.length}
          </div>
        </div>

        {activeNextSteps.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen aktive næste skridt. Borgeren kan oprette dem fra Lys-appen.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeNextSteps.map((step) => (
              <NextStepRow key={step.id} step={step} reflections={recentReflections} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border p-5" style={panelStyle}>
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={18} style={{ color: 'var(--cp-green)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
            Seneste refleksioner
          </h3>
        </div>

        {recentReflections.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Borgeren har endnu ikke lavet refleksioner i Lys-appen.
          </p>
        ) : (
          <ul className="space-y-4">
            {recentReflections.slice(0, 5).map((r) => (
              <ReflectionRow key={r.id} reflection={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RecoveryProfileSummary({ profile }: { profile: LysRecoveryProfile }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {CHIME_DOMAINS.map((domain) => {
        const fields = RECOVERY_PROFILE_FIELDS.filter((f) => f.domain === domain);
        const filled = fields.filter((f) => {
          const value = profile[f.key];
          return typeof value === 'string' && value.trim().length > 0;
        });
        return (
          <div
            key={domain}
            className="rounded-xl border p-3"
            style={{
              borderColor: 'var(--cp-border)',
              backgroundColor: 'var(--cp-bg3)',
            }}
          >
            <div className="mb-1 text-xs font-semibold" style={{ color: 'var(--cp-green)' }}>
              {CHIME_LABELS_DA[domain]}
            </div>
            <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {filled.length}/{fields.length} udfyldt
            </div>
            {filled.length > 0 && (
              <ul className="mt-2 space-y-1">
                {filled.map((f) => (
                  <li key={f.key} className="text-xs" style={{ color: 'var(--cp-text)' }}>
                    <span style={{ color: 'var(--cp-muted)' }}>{f.staffLabel}:</span>{' '}
                    {truncate(profile[f.key] as string, 60)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChimeTrendsTable({ checkins }: { checkins: LysCheckin[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr
            className="border-b text-left text-xs"
            style={{ color: 'var(--cp-muted)', borderColor: 'var(--cp-border)' }}
          >
            <th className="py-2 pr-3 font-medium">Dato</th>
            <th className="px-2 py-2 font-medium">Forbundethed</th>
            <th className="px-2 py-2 font-medium">Håb</th>
            <th className="px-2 py-2 font-medium">Identitet</th>
            <th className="px-2 py-2 font-medium">Mening</th>
            <th className="px-2 py-2 font-medium">Handlekraft</th>
          </tr>
        </thead>
        <tbody>
          {checkins.slice(0, 8).map((c) => (
            <tr key={c.id} className="border-b" style={{ borderColor: 'var(--cp-border)' }}>
              <td className="py-2 pr-3" style={{ color: 'var(--cp-text)' }}>
                {new Date(c.created_at).toLocaleDateString('da-DK', {
                  day: 'numeric',
                  month: 'short',
                })}
              </td>
              <ScoreCell value={c.connectedness_score} />
              <ScoreCell value={c.hope_score} />
              <ScoreCell value={c.identity_score} />
              <ScoreCell value={c.meaning_score} />
              <ScoreCell value={c.empowerment_score} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <td className="px-2 py-2" style={{ color: 'var(--cp-muted2)' }}>
        —
      </td>
    );
  }
  const color = value <= 3 ? 'var(--cp-red)' : value <= 6 ? 'var(--cp-amber)' : 'var(--cp-green)';
  return (
    <td className="px-2 py-2 font-medium" style={{ color }}>
      {value}/10
    </td>
  );
}

function NextStepRow({ step, reflections }: { step: LysNextStep; reflections: LysReflection[] }) {
  const sourceRef = step.related_reflection_id
    ? reflections.find((r) => r.id === step.related_reflection_id)
    : null;

  return (
    <li
      className="rounded-xl border p-3"
      style={{
        borderColor: 'var(--cp-border)',
        backgroundColor: 'var(--cp-bg3)',
      }}
    >
      <div className="font-medium" style={{ color: 'var(--cp-text)' }}>
        {step.title}
      </div>
      {step.description && (
        <div className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
          {step.description}
        </div>
      )}
      <div
        className="mt-2 flex flex-wrap items-center gap-3 text-xs"
        style={{ color: 'var(--cp-muted2)' }}
      >
        <span>{formatRelativeDanish(step.created_at)}</span>
        {step.created_by_type === 'staff' && <span>· oprettet af personale</span>}
        {step.related_chime_domain && <span>· {CHIME_LABELS_DA[step.related_chime_domain]}</span>}
      </div>
      {sourceRef && (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-xs"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            color: 'var(--cp-muted)',
          }}
        >
          <span className="font-medium" style={{ color: 'var(--cp-green)' }}>
            Fra refleksion:
          </span>{' '}
          {truncate(sourceRef.situation, 60)}
        </div>
      )}
    </li>
  );
}

function ReflectionRow({ reflection }: { reflection: LysReflection }) {
  return (
    <li
      className="rounded-xl border p-3"
      style={{
        borderColor: 'var(--cp-border)',
        backgroundColor: 'var(--cp-bg3)',
      }}
    >
      <div
        className="mb-2 flex items-center justify-between text-xs"
        style={{ color: 'var(--cp-muted2)' }}
      >
        <span>{formatRelativeDanish(reflection.created_at)}</span>
        {reflection.primary_chime_domain && (
          <span style={{ color: 'var(--cp-green)' }}>
            {CHIME_LABELS_DA[reflection.primary_chime_domain]}
          </span>
        )}
      </div>
      <div className="text-sm" style={{ color: 'var(--cp-text)' }}>
        {reflection.situation}
      </div>
      {reflection.ai_suggested_next_step && (
        <div className="mt-2 text-xs italic" style={{ color: 'var(--cp-muted)' }}>
          <span style={{ color: 'var(--cp-green)' }}>Lys:</span> {reflection.ai_suggested_next_step}
        </div>
      )}
      {reflection.what_gave_strength && (
        <div className="mt-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
          <span style={{ color: 'var(--cp-green)' }}>Styrke:</span> {reflection.what_gave_strength}
        </div>
      )}
      {reflection.resident_chosen_step && (
        <div className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
          <span style={{ color: 'var(--cp-green)' }}>Valgt næste skridt:</span>{' '}
          {reflection.resident_chosen_step}
        </div>
      )}
    </li>
  );
}
