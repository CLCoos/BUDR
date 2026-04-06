'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PIN_LENGTH = 4;

interface Props {
  residentId: string;
  residentName: string;
  onComplete?: () => void;
}

type Step = 'enter' | 'confirm' | 'success';

/**
 * PinSetupFlow – used from the Care Portal by authenticated staff.
 * Sets or resets a resident's 4-digit PIN.
 */
export default function PinSetupFlow({ residentId, residentName, onComplete }: Props) {
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerBiometric, setOfferBiometric] = useState(false);

  const handleDigit = useCallback((d: string) => {
    if (loading) return;
    setError(null);
    setDigits(prev => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = [...prev, d];
      if (next.length === PIN_LENGTH) {
        const pin = next.join('');
        setTimeout(() => {
          if (step === 'enter') {
            setFirstPin(pin);
            setDigits([]);
            setStep('confirm');
          } else if (step === 'confirm') {
            handleConfirm(pin);
          }
        }, 80);
      }
      return next;
    });
  }, [loading, step]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setDigits(prev => prev.slice(0, -1));
  }, [loading]);

  const handleConfirm = useCallback(async (confirmPin: string) => {
    if (confirmPin !== firstPin) {
      setError('PIN matcher ikke – prøv igen');
      setDigits([]);
      setStep('enter');
      setFirstPin('');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Du er ikke logget ind som personale');
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resident-pin-set`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resident_id: residentId,
            pin: confirmPin,
            staff_token: session.access_token,
          }),
        },
      );

      const json = (await res.json()) as { data?: { success: boolean }; error?: string };

      if (!res.ok || !json.data?.success) {
        setError(json.error ?? 'Kunne ikke gemme PIN');
        setDigits([]);
        setStep('enter');
        return;
      }

      setStep('success');
      // Check if browser supports WebAuthn for offering biometric setup
      setOfferBiometric(
        typeof window !== 'undefined' &&
        !!window.PublicKeyCredential &&
        !!navigator.credentials,
      );
    } catch {
      setError('Netværksfejl – prøv igen');
      setDigits([]);
      setStep('enter');
    } finally {
      setLoading(false);
    }
  }, [firstPin, residentId]);

  const reset = () => {
    setStep('enter');
    setFirstPin('');
    setDigits([]);
    setError(null);
  };

  return (
    <div style={containerStyle}>
      <style>{setupStyles}</style>

      {step !== 'success' ? (
        <>
          <div style={avatarStyle}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>
              {residentName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <h2 style={titleStyle}>
            {step === 'enter' ? `Opret PIN for ${residentName}` : 'Bekræft PIN'}
          </h2>
          <p style={hintStyle}>
            {step === 'enter'
              ? 'Indtast en ny 4-cifret PIN'
              : 'Gentag PIN for at bekræfte'}
          </p>

          {/* Dots */}
          <div className="setup-dots">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div key={i} className={`setup-dot ${i < digits.length ? 'setup-dot--filled' : ''}`} />
            ))}
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          {/* Numpad */}
          <div className={`setup-numpad ${loading ? 'setup-numpad--disabled' : ''}`}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button key={d} className="setup-key" onClick={() => handleDigit(d)} disabled={loading}>{d}</button>
            ))}
            <div className="setup-key setup-key--empty" />
            <button className="setup-key" onClick={() => handleDigit('0')} disabled={loading}>0</button>
            <button className="setup-key setup-key--delete" onClick={handleDelete} disabled={loading || digits.length === 0}>⌫</button>
          </div>

          <button style={cancelStyle} onClick={reset}>Annullér</button>
        </>
      ) : (
        /* Success state */
        <div style={successStyle}>
          <div style={checkCircleStyle}>✓</div>
          <h2 style={titleStyle}>PIN oprettet</h2>
          <p style={hintStyle}>{residentName} kan nu logge ind med sin PIN</p>

          {offerBiometric && (
            <div style={biometricOfferStyle}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                Vil du aktivere biometri på denne enhed?
              </p>
              <button style={biometricBtnStyle} onClick={onComplete}>
                Aktivér fingeraftryk / ansigt
              </button>
            </div>
          )}

          <button style={doneStyle} onClick={onComplete}>
            {offerBiometric ? 'Spring over' : 'Færdig'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '2rem 1.5rem',
  maxWidth: 360,
  margin: '0 auto',
};

const avatarStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'var(--budr-teal)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: 'var(--budr-navy)',
  margin: '0 0 0.25rem',
  textAlign: 'center',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: '#6B7280',
  margin: '0 0 1.25rem',
  textAlign: 'center',
};

const errorStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--budr-roed)',
  margin: '0.5rem 0 1rem',
};

const cancelStyle: React.CSSProperties = {
  marginTop: '1.25rem',
  background: 'none',
  border: 'none',
  color: '#9CA3AF',
  fontSize: '0.875rem',
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  minHeight: '44px',
};

const successStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
};

const checkCircleStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'var(--budr-teal-light)',
  color: 'var(--budr-teal)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '0.75rem',
};

const biometricOfferStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '1rem',
  background: 'var(--budr-lavender)',
  borderRadius: '0.75rem',
  textAlign: 'center',
  width: '100%',
};

const biometricBtnStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '64px',
  borderRadius: '9999px',
  border: '1.5px solid var(--budr-purple)',
  background: 'white',
  color: 'var(--budr-purple)',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
};

const doneStyle: React.CSSProperties = {
  marginTop: '1rem',
  minHeight: '64px',
  padding: '0 2rem',
  borderRadius: '9999px',
  background: 'var(--budr-teal)',
  border: 'none',
  color: 'white',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
};

const setupStyles = `
  .setup-dots {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .setup-dot {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid var(--budr-teal);
    background: transparent;
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .setup-dot--filled {
    background: var(--budr-teal);
    transform: scale(1.1);
  }
  .setup-numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: 100%;
    max-width: 280px;
    margin-top: 0.5rem;
    transition: opacity 0.2s;
  }
  .setup-numpad--disabled { opacity: 0.4; pointer-events: none; }
  .setup-key {
    min-height: 72px; min-width: 72px;
    border-radius: 50%;
    border: none;
    background: white;
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--budr-navy);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: background 0.12s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .setup-key:active:not(:disabled) { background: var(--budr-teal-light); transform: scale(0.93); }
  .setup-key--empty { background: transparent; box-shadow: none; pointer-events: none; }
  .setup-key--delete { font-size: 1.125rem; color: #6B7280; }
`;
