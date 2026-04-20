'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';
import { BudrLogo } from '@/components/brand/BudrLogo';

const LEFT_QUOTES = [
  'Overblik der giver ro.',
  'Nærhed på tværs af vagter.',
  'Bygget til dem der passer på andre.',
];

function CarePortalLoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  useEffect(() => {
    if (searchParams.get('err') === 'config') {
      setError(
        'Supabase er ikke konfigureret på serveren (mangler NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY).'
      );
    }
    if (searchParams.get('error') === 'unauthorized') {
      setError('Din konto har ikke adgang til Care Portal. Kontakt en leder eller administrator.');
    }
    if (searchParams.get('registered') === '1') {
      setRegistered(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fadeMs = 600;
    const showMs = 4000;
    const timer = window.setInterval(() => {
      setQuoteVisible(false);
      window.setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % LEFT_QUOTES.length);
        setQuoteVisible(true);
      }, fadeMs);
    }, showMs);
    return () => window.clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError(
        'Supabase er ikke konfigureret (mangler NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY i miljøet).'
      );
      return;
    }

    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError('Udfyld email og adgangskode');
      return;
    }

    setPending(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    setPending(false);

    if (signErr) {
      setError('Forkert email eller adgangskode');
      return;
    }

    trackEvent('staff_portal_login_success');

    try {
      await fetch('/api/portal/staff-login-audit', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* best-effort audit */
    }

    window.location.assign('/care-portal-dashboard');
  }

  return (
    <div className="min-h-screen bg-[var(--cp-bg)]">
      <div className="mx-auto grid min-h-screen grid-cols-1 md:grid-cols-5">
        <aside className="relative hidden overflow-hidden bg-[var(--cp-bg)] text-white md:col-span-3 md:flex md:flex-col">
          <div
            className="pointer-events-none absolute right-[-15%] top-[-15%] aspect-square w-[60%] rounded-full"
            style={{ backgroundColor: 'rgb(255 255 255 / 0.04)' }}
          />
          <div className="px-10 pt-10">
            <BudrLogo size={36} dark showWordmark />
          </div>

          <div className="flex flex-1 items-center justify-center px-8 text-center">
            <div className="max-w-[380px]">
              <p
                className="italic"
                style={{
                  fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", serif)',
                  fontSize: 'clamp(22px, 2.5vw, 32px)',
                  lineHeight: 1.4,
                  opacity: quoteVisible ? 1 : 0,
                  transition: 'opacity 600ms ease-in-out',
                }}
              >
                {LEFT_QUOTES[quoteIdx]}
              </p>
              <div
                className="mx-auto mt-5 h-px w-10"
                style={{ backgroundColor: 'rgb(255 255 255 / 0.3)' }}
              />
            </div>
          </div>

          <div className="absolute bottom-8 left-10 text-xs font-light text-white/40">
            budrcare.dk
          </div>
        </aside>

        <section className="flex min-h-screen items-center justify-center bg-white px-6 py-10 md:col-span-2 md:px-10">
          <div className="w-full max-w-[340px]">
            <div className="mb-9">
              <BudrLogo size={36} showWordmark />
            </div>

            <h1
              className="mb-1"
              style={{
                fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", serif)',
                fontSize: 26,
                color: 'var(--cp-bg)',
              }}
            >
              Velkommen tilbage
            </h1>
            <p className="mb-8 text-[13px] font-light text-[var(--cp-muted)]">
              Log ind med din arbejdsmailadresse
            </p>

            {registered && (
              <p
                aria-live="polite"
                className="mb-5 rounded-[10px] border px-3.5 py-3 text-[13px]"
                style={{
                  backgroundColor: 'rgb(16 185 129 / 0.08)',
                  borderColor: 'rgb(16 185 129 / 0.4)',
                  color: 'rgb(6 95 70)',
                }}
              >
                Konto oprettet. Log ind nedenfor.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium"
                  style={{ color: 'var(--cp-bg)' }}
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="dit@arbejde.dk"
                  className="h-[52px] w-full rounded-xl border px-4 text-[15px] outline-none transition-colors"
                  style={{
                    borderColor: 'var(--cp-border2)',
                    backgroundColor: 'rgb(248 249 252)',
                    color: 'var(--cp-bg)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-medium"
                  style={{ color: 'var(--cp-bg)' }}
                >
                  Adgangskode
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="••••••••"
                    className="h-[52px] w-full rounded-xl border px-4 pr-12 text-[15px] outline-none transition-colors"
                    style={{
                      borderColor: 'var(--cp-border2)',
                      backgroundColor: 'rgb(248 249 252)',
                      color: 'var(--cp-bg)',
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Skjul adgangskode' : 'Vis adgangskode'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--cp-muted)]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  href="/care-portal-login"
                  className="text-xs text-[var(--cp-green)] hover:underline"
                >
                  Glemt adgangskode?
                </Link>
              </div>

              {error && (
                <p
                  aria-live="polite"
                  className="rounded-[10px] border px-3.5 py-3 text-[13px]"
                  style={{
                    backgroundColor: 'rgb(245 101 101 / 0.08)',
                    borderColor: 'rgb(245 101 101 / 0.5)',
                    color: 'rgb(153 27 27)',
                    animation: 'careLoginFadeIn 250ms ease',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="h-[52px] w-full rounded-xl text-[15px] font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75"
                style={{ backgroundColor: 'var(--cp-green)' }}
              >
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Logger ind...
                  </span>
                ) : (
                  'Log ind'
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-[var(--cp-border)] pt-4 text-center text-[11px] text-[var(--cp-muted)]">
              Kun for autoriseret personale
            </div>
          </div>
        </section>
      </div>
      <style>{`
        @keyframes careLoginFadeIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function CarePortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--cp-bg)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--cp-muted)]" aria-hidden />
        </div>
      }
    >
      <CarePortalLoginContent />
    </Suspense>
  );
}
