'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BudrLogo } from '@/components/brand/BudrLogo';

export default function CarePortalResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Indtast din e-mail.');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('Supabase er ikke konfigureret i miljøet.');
      return;
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '');
    setPending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${baseUrl}/care-portal-update-password`,
    });
    setPending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess('Vi har sendt et link til nulstilling af adgangskode, hvis e-mailen findes.');
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
          Glemt adgangskode
        </h1>
        <p className="mt-1 text-sm text-[var(--cp-muted)]">
          Indtast din arbejdsmail, så sender vi et nulstillingslink.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[var(--cp-bg)]">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className="h-[48px] w-full rounded-xl border border-[var(--cp-border2)] bg-[rgb(248_249_252)] px-4 text-[15px] outline-none"
              placeholder="dit@arbejde.dk"
            />
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
            disabled={pending}
            className="h-[48px] w-full rounded-xl bg-[var(--cp-green)] text-sm font-semibold text-white disabled:opacity-70"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sender...
              </span>
            ) : (
              'Send nulstillingslink'
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
