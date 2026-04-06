'use client';

import React, { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { signInAction, type SignInState } from './actions';

export default function CarePortalLoginPage() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1B2D] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <AppLogo size={36} />
            <span className="text-2xl font-bold tracking-tight text-white">BUDR</span>
          </div>
          <p className="text-sm text-gray-400">Care Portal — Personale login</p>
        </div>

        {/* Card */}
        <div className="bg-[#162032] border border-white/10 rounded-xl p-6 shadow-2xl">
          <h1 className="text-base font-semibold text-white mb-5">Log ind</h1>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="din@email.dk"
                className="w-full bg-[#0F1B2D] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#1D9E75] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">
                Adgangskode
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full bg-[#0F1B2D] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#1D9E75] transition-colors"
              />
            </div>

            {state?.error && (
              <p className="text-xs font-medium text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] hover:bg-[#18886a] text-white text-sm font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

        <p className="text-center text-xs text-gray-600 mt-6">
          Bosted Nordlys · BUDR Care Platform
        </p>
      </div>
    </div>
  );
}
