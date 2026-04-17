'use client';

import React, { useActionState, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { registerInvitedStaff, type RegisterResult } from './actions';

type Props = { orgId: string; inviteCode: string };

export default function InviteForm({ orgId }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  const action = async (_prev: RegisterResult, formData: FormData): Promise<RegisterResult> => {
    return registerInvitedStaff(orgId, formData);
  };

  const [state, formAction, pending] = useActionState<RegisterResult, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="full_name"
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--cp-bg)' }}
        >
          Fulde navn
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Dit navn"
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
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mindst 8 tegn"
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

      <div>
        <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--cp-bg)' }}>
          Rolle
        </p>
        <div className="flex gap-3">
          {(['medarbejder', 'leder'] as const).map((r) => (
            <label
              key={r}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border py-3 text-[14px] font-medium transition-colors has-[:checked]:border-[var(--cp-green)] has-[:checked]:bg-[var(--cp-green)] has-[:checked]:text-white"
              style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-muted)' }}
            >
              <input
                type="radio"
                name="role"
                value={r}
                className="sr-only"
                defaultChecked={r === 'medarbejder'}
              />
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {state?.error && (
        <p
          aria-live="polite"
          className="rounded-[10px] border px-3.5 py-3 text-[13px]"
          style={{
            backgroundColor: 'rgb(245 101 101 / 0.08)',
            borderColor: 'rgb(245 101 101 / 0.5)',
            color: 'rgb(153 27 27)',
          }}
        >
          {state.error}
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
            Opretter konto...
          </span>
        ) : (
          'Opret konto'
        )}
      </button>

      <div className="mt-2 text-center text-[11px] text-[var(--cp-muted)]">
        Har du allerede en konto?{' '}
        <a href="/care-portal-login" className="text-[var(--cp-green)] hover:underline">
          Log ind
        </a>
      </div>
    </form>
  );
}
