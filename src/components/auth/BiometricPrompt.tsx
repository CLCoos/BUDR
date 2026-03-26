'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  residentId: string;
  redirectTo: string;
}

/**
 * BiometricPrompt – renders a biometric login button when:
 * 1. The browser supports WebAuthn (navigator.credentials)
 * 2. The resident has a registered credential in localStorage (credential_id)
 *
 * Falls back silently to PIN on any error — no error messages shown.
 */
export default function BiometricPrompt({ residentId, redirectTo }: Props) {
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check WebAuthn availability and stored credential
    const hasCred = !!localStorage.getItem(`budr_webauthn_${residentId}`);
    const hasWebAuthn = typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      !!navigator.credentials;
    setAvailable(hasWebAuthn && hasCred);
  }, [residentId]);

  const handleBiometric = useCallback(async () => {
    setLoading(true);
    try {
      const storedCred = localStorage.getItem(`budr_webauthn_${residentId}`);
      if (!storedCred) return;
      const { credential_id } = JSON.parse(storedCred) as { credential_id: string };

      // Build WebAuthn get options
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: Uint8Array.from(atob(credential_id), c => c.charCodeAt(0)),
              type: 'public-key',
            },
          ],
          userVerification: 'preferred',
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) return;

      const response = assertion.response as AuthenticatorAssertionResponse;
      const counter = new DataView(response.authenticatorData).getUint32(33, false);

      // Verify with edge function
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resident-webauthn-verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resident_id: residentId, credential_id, counter }),
        },
      );

      const json = (await res.json()) as { data?: { session_token: string }; error?: string };
      if (!res.ok || !json.data?.session_token) return; // silent fallback to PIN

      // Set session cookie via API route
      await fetch('/api/resident-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: json.data.session_token }),
      });

      router.replace(redirectTo);
    } catch {
      // Silent fallback — user continues with PIN
    } finally {
      setLoading(false);
    }
  }, [residentId, redirectTo, router]);

  if (!available) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <button
        onClick={handleBiometric}
        disabled={loading}
        className="biometric-btn"
        aria-label="Log ind med biometri"
        style={btnStyle}
      >
        <BiometricIcon />
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--budr-purple)' }}>
          {loading ? 'Verificerer...' : 'Brug fingeraftryk / ansigt'}
        </span>
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  padding: '0.875rem 1.5rem',
  minHeight: '64px',
  background: 'white',
  border: '1.5px solid var(--budr-purple)',
  borderRadius: '9999px',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
};

function BiometricIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        stroke="var(--budr-purple)" strokeWidth="1.5" fill="none"
      />
      <path
        d="M8.5 9.5C8.5 7.57 10.07 6 12 6s3.5 1.57 3.5 3.5"
        stroke="var(--budr-purple)" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
      <path
        d="M12 10v4M10 14h4"
        stroke="var(--budr-purple)" strokeWidth="1.5" strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="var(--budr-purple)" />
    </svg>
  );
}
