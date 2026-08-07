'use client';

import React from 'react';

interface Props {
  residentId: string;
  redirectTo: string;
}

/**
 * BiometricPrompt – intentionally disabled until WebAuthn assertion verification
 * is implemented server-side. The previous flow only sent a counter bump to
 * `resident-webauthn-verify`, which minted sessions without signature checks.
 *
 * Residents continue with PIN login. Props kept for call-site compatibility.
 */
export default function BiometricPrompt(_props: Props) {
  return null;
}
