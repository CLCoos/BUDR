'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/** Sidste fangenet: et nedbrud i root-layoutet rapporteres til Sentry i stedet for at forsvinde. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="da">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f7f7f5',
          color: '#1f2933',
        }}
      >
        <main style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Noget gik galt</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>
            Fejlen er sendt til BUDR. Prøv igen, og kontakt jeres leder, hvis den bliver ved.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: 15,
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#1f2933',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Prøv igen
          </button>
        </main>
      </body>
    </html>
  );
}
