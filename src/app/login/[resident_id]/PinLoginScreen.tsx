'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BiometricPrompt from '@/components/auth/BiometricPrompt';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface Props {
  residentId: string;
  redirectTo: string;
  residentName?: string;
  residentInitials?: string;
}

export default function PinLoginScreen({
  residentId,
  redirectTo,
  residentName = 'Beboer',
  residentInitials = '?',
}: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;

  // Countdown timer during lockout
  useEffect(() => {
    if (!locked || lockedUntil === null) return;
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(null);
        setLockSecondsLeft(0);
        setAttempts(0);
      } else {
        setLockSecondsLeft(left);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locked, lockedUntil]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleVerify = useCallback(
    async (pin: string) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resident-pin-verify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
            },
            body: JSON.stringify({ resident_id: residentId, pin }),
          }
        );
        const json = (await res.json()) as { data?: { session_token: string }; error?: string };

        if (!res.ok || !json.data?.session_token) {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setDigits([]);
          triggerShake();
          if (newAttempts >= MAX_ATTEMPTS) {
            setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
            setError(null);
          } else {
            setError('Forkert PIN');
          }
          return;
        }

        // Store session via server action
        await fetch('/api/resident-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: json.data.session_token }),
        });

        router.replace(redirectTo);
      } catch {
        setError('Netværksfejl – prøv igen');
        setDigits([]);
        triggerShake();
      } finally {
        setLoading(false);
      }
    },
    [residentId, attempts, redirectTo, router, triggerShake]
  );

  const pressDigit = useCallback(
    (d: string) => {
      if (locked || loading) return;
      setError(null);
      setDigits((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = [...prev, d];
        if (next.length === PIN_LENGTH) {
          // Auto-submit when 4 digits entered
          setTimeout(() => handleVerify(next.join('')), 80);
        }
        return next;
      });
    },
    [locked, loading, handleVerify]
  );

  const pressDelete = useCallback(() => {
    if (locked || loading) return;
    setError(null);
    setDigits((prev) => prev.slice(0, -1));
  }, [locked, loading]);

  return (
    <div className="pin-screen">
      <style>{pinStyles}</style>

      {/* Avatar + greeting */}
      <div className="pin-avatar">
        <span className="pin-avatar-initials">{residentInitials}</span>
      </div>
      <p className="pin-greeting">God dag,</p>
      <h1 className="pin-name">{residentName}</h1>
      <p className="pin-hint">Indtast din 4-cifrede PIN</p>

      {/* Dot indicators */}
      <div className={`pin-dots ${shake ? 'pin-dots--shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} className={`pin-dot ${i < digits.length ? 'pin-dot--filled' : ''}`} />
        ))}
      </div>

      {/* Error / lockout message */}
      {locked ? (
        <p className="pin-lockout">Kontakt personalet &nbsp;·&nbsp; Låst i {lockSecondsLeft}s</p>
      ) : error ? (
        <p className="pin-error">{error}</p>
      ) : (
        <p className="pin-error pin-error--hidden">‎</p>
      )}

      {/* Numpad */}
      <div className={`pin-numpad ${locked || loading ? 'pin-numpad--disabled' : ''}`}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            className="pin-key"
            onClick={() => pressDigit(d)}
            disabled={locked || loading}
            aria-label={`Tast ${d}`}
          >
            {d}
          </button>
        ))}
        {/* Empty cell */}
        <div className="pin-key pin-key--empty" />
        <button
          className="pin-key"
          onClick={() => pressDigit('0')}
          disabled={locked || loading}
          aria-label="Tast 0"
        >
          0
        </button>
        <button
          className="pin-key pin-key--delete"
          onClick={pressDelete}
          disabled={locked || loading || digits.length === 0}
          aria-label="Slet"
        >
          ⌫
        </button>
      </div>

      {/* Biometric prompt (only rendered if WebAuthn available) */}
      {!locked && <BiometricPrompt residentId={residentId} redirectTo={redirectTo} />}
    </div>
  );
}

// ─── Scoped styles using budrCare.css variables ───────────────────────────────
const pinStyles = `
  .pin-screen {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem 3rem;
    background: var(--budr-lavender);
    max-width: 360px;
    margin: 0 auto;
  }

  .pin-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--budr-purple);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .pin-avatar-initials {
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .pin-greeting {
    font-size: 0.875rem;
    color: #6B7280;
    margin: 0;
  }

  .pin-name {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--budr-navy);
    margin: 0.25rem 0 0.5rem;
  }

  .pin-hint {
    font-size: 0.8125rem;
    color: #9CA3AF;
    margin: 0 0 1.5rem;
  }

  /* Dot row */
  .pin-dots {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .pin-dots--shake {
    animation: pin-shake 0.4s ease;
  }

  @keyframes pin-shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-6px); }
    80%       { transform: translateX(6px); }
  }

  .pin-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--budr-purple);
    background: transparent;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .pin-dot--filled {
    background: var(--budr-purple);
    transform: scale(1.1);
  }

  /* Messages */
  .pin-error {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--budr-roed);
    min-height: 1.25rem;
    margin: 0.25rem 0 1rem;
  }

  .pin-error--hidden {
    visibility: hidden;
  }

  .pin-lockout {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--budr-gul);
    min-height: 1.25rem;
    margin: 0.25rem 0 1rem;
    text-align: center;
  }

  /* Numpad */
  .pin-numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: 100%;
    max-width: 280px;
    transition: opacity 0.2s;
  }

  .pin-numpad--disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .pin-key {
    min-height: 72px;
    min-width: 72px;
    border-radius: 50%;
    border: none;
    background: white;
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--budr-navy);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: background 0.12s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .pin-key:active:not(:disabled) {
    background: var(--budr-lavender);
    transform: scale(0.93);
  }

  .pin-key:disabled {
    cursor: not-allowed;
  }

  .pin-key--empty {
    background: transparent;
    box-shadow: none;
    pointer-events: none;
  }

  .pin-key--delete {
    font-size: 1.125rem;
    color: #6B7280;
  }
`;
