'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BudrLogo } from '@/components/brand/BudrLogo';

export default function CarePortalUpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError('Supabase er ikke konfigureret i miljøet.');
      return;
    }

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setReady(true);
      return;
    }

    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) setError(sessionError.message);
        setReady(true);
        history.replaceState(null, '', window.location.pathname);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Adgangskoden skal være mindst 8 tegn.');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('Supabase er ikke konfigureret i miljøet.');
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess('Adgangskoden er opdateret. Du kan nu logge ind.');
    setPassword('');
    window.setTimeout(() => {
      router.replace('/care-portal-login');
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-[var(--cp-bg)] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--cp-border)] bg-white p-6">
        <div className="mb-6">
          <BudrLogo size={34} showWordmark />
        </div>
        <h1
          className="text-2xl"
          style={{ fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", serif)' }}
        >
          Opdater adgangskode
        </h1>
        <p className="mt-1 text-sm text-[var(--cp-muted)]">
          Vælg en ny adgangskode for din Care Portal-konto.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-[var(--cp-bg)]"
            >
              Ny adgangskode
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                minLength={8}
                className="h-[48px] w-full rounded-xl border border-[var(--cp-border2)] bg-[rgb(248_249_252)] px-4 pr-12 text-[15px] outline-none"
                placeholder="Mindst 8 tegn"
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

          {error && (
            <p className="rounded-[10px] border border-red-300 bg-red-50 px-3.5 py-3 text-[13px] text-red-800">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-[10px] border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-[13px] text-emerald-800">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !ready}
            className="h-[48px] w-full rounded-xl bg-[var(--cp-green)] text-sm font-semibold text-white disabled:opacity-70"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Opdaterer...
              </span>
            ) : (
              'Gem ny adgangskode'
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-xs">
          <Link href="/care-portal-login" className="text-[var(--cp-green)] hover:underline">
            Tilbage til login
          </Link>
        </div>
      </div>
    </main>
  );
}
