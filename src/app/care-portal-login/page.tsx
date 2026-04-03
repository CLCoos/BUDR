'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

function CarePortalLoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (searchParams.get('err') === 'config') {
      setError(
        'Supabase er ikke konfigureret på serveren (mangler NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY).'
      );
    }
  }, [searchParams]);

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
    <div className="flex min-h-screen items-center justify-center bg-[#0F1B2D] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-center gap-2.5">
            <AppLogo size={36} />
            <span className="text-2xl font-bold tracking-tight text-white">BUDR</span>
          </div>
          <p className="text-sm text-gray-400">Care Portal — Personale login</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#162032] p-6 shadow-2xl">
          <h1 className="mb-5 text-base font-semibold text-white">Log ind</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-gray-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="din@email.dk"
                className="w-full rounded-lg border border-white/10 bg-[#0F1B2D] px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#1D9E75] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-gray-400">
                Adgangskode
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-[#0F1B2D] px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#1D9E75] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-400/10 px-3 py-2 text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D9E75] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#18886a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Logger ind…
                </>
              ) : (
                'Log ind'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          BUDR Care Platform · Adgang styres af jeres organisationsprofil (
          <code className="text-gray-500">org_id</code>)
        </p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <Link href="/privacy" className="hover:text-gray-300">
            Privatliv
          </Link>
          <Link href="/cookies" className="hover:text-gray-300">
            Cookies
          </Link>
          <Link href="/terms" className="hover:text-gray-300">
            Vilkår
          </Link>
          <Link href="/care-portal-demo" className="hover:text-gray-300">
            Demo (uden login)
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default function CarePortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F1B2D]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" aria-hidden />
        </div>
      }
    >
      <CarePortalLoginContent />
    </Suspense>
  );
}
