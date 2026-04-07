'use client';

import React, { useState } from 'react';
import { Loader2, UserPlus, CheckCircle2, Copy } from 'lucide-react';

type Props = {
  staffEmail: string;
  orgId: string | null;
};

type InviteState = 'idle' | 'submitting' | 'success' | 'error';

export default function SettingsClient({ staffEmail, orgId }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteState, setInviteState] = useState<InviteState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [orgIdCopied, setOrgIdCopied] = useState(false);

  const handleCopyOrgId = async () => {
    if (!orgId) return;
    try {
      await navigator.clipboard.writeText(orgId);
      setOrgIdCopied(true);
      setTimeout(() => setOrgIdCopied(false), 2000);
    } catch {
      /* ignore — clipboard may be blocked */
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || inviteState === 'submitting') return;

    setInviteState('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/portal/invite-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, name: name.trim() }),
        credentials: 'include',
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Ukendt fejl — prøv igen');
        setInviteState('error');
        return;
      }

      setSentTo(trimmedEmail);
      setInviteState('success');
      setEmail('');
      setName('');
    } catch {
      setErrorMsg('Netværksfejl — tjek forbindelsen og prøv igen');
      setInviteState('error');
    }
  };

  const resetInvite = () => {
    setInviteState('idle');
    setErrorMsg(null);
    setSentTo(null);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1
          className="font-bold"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: 'var(--cp-text)',
            lineHeight: 1.2,
          }}
        >
          Indstillinger
        </h1>
        <p className="mt-1" style={{ fontSize: 13, color: 'var(--cp-muted)' }}>
          Profil og invitation af kolleger
        </p>
      </div>

      {/* Staff profile — read-only */}
      <section
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Min profil
        </h2>

        <div className="space-y-3">
          <div>
            <p
              className="text-xs mb-1"
              style={{
                color: 'var(--cp-muted)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Email
            </p>
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
                fontSize: 13,
              }}
            >
              {staffEmail || '—'}
            </div>
          </div>

          <div>
            <p
              className="text-xs mb-1"
              style={{
                color: 'var(--cp-muted)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Organisation (org_id)
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-lg px-3 py-2.5 font-mono text-xs truncate"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: orgId ? 'var(--cp-text)' : 'var(--cp-muted)',
                  fontSize: 12,
                }}
              >
                {orgId ?? 'Ikke sat — kontakt administrator'}
              </div>
              {orgId && (
                <button
                  type="button"
                  onClick={() => void handleCopyOrgId()}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-colors shrink-0"
                  style={{
                    border: '1px solid var(--cp-border)',
                    color: orgIdCopied ? 'var(--cp-green)' : 'var(--cp-muted)',
                    backgroundColor: orgIdCopied ? 'var(--cp-green-dim)' : 'transparent',
                  }}
                  aria-label="Kopiér org_id"
                >
                  {orgIdCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  {orgIdCopied ? 'Kopieret' : 'Kopiér'}
                </button>
              )}
            </div>
            {!orgId && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--cp-amber)', fontSize: 11 }}>
                Din bruger mangler org_id i metadata — du kan ikke invitere kolleger endnu.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Invite staff */}
      <section
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <UserPlus size={15} style={{ color: 'var(--cp-green)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Invitér kollega
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
          Kollegaen modtager en invitation på email og sættes automatisk i din organisation.
        </p>

        {inviteState === 'success' && sentTo ? (
          <div className="space-y-3">
            <div
              className="flex items-start gap-3 rounded-lg px-4 py-3"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                border: '1px solid rgba(45,212,160,0.25)',
              }}
            >
              <CheckCircle2
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--cp-green)' }}
              />
              <p className="text-sm" style={{ color: 'var(--cp-green)', fontSize: 13 }}>
                Invitation sendt til <strong>{sentTo}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={resetInvite}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--cp-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)';
              }}
            >
              Invitér endnu en kollega →
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleInvite(e)} className="space-y-3">
            <div>
              <label
                htmlFor="invite-email"
                className="mb-1.5 block"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--cp-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Email *
              </label>
              <input
                id="invite-email"
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kollega@bosted.dk"
                disabled={!orgId || inviteState === 'submitting'}
                className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: 'var(--cp-text)',
                  fontSize: 13,
                  opacity: !orgId ? 0.5 : 1,
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-green)';
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
                }}
              />
            </div>

            <div>
              <label
                htmlFor="invite-name"
                className="mb-1.5 block"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--cp-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Navn (valgfrit)
              </label>
              <input
                id="invite-name"
                type="text"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fornavn Efternavn"
                disabled={!orgId || inviteState === 'submitting'}
                className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: 'var(--cp-text)',
                  fontSize: 13,
                  opacity: !orgId ? 0.5 : 1,
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-green)';
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
                }}
              />
            </div>

            {inviteState === 'error' && errorMsg && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--cp-red-dim)',
                  color: 'var(--cp-red)',
                  fontSize: 12,
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!orgId || !email.trim() || inviteState === 'submitting'}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp-green)' }}
              onMouseEnter={(e) => {
                if (!(e.currentTarget as HTMLButtonElement).disabled) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#18886a';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-green)';
              }}
            >
              {inviteState === 'submitting' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sender invitation…
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Send invitation
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
