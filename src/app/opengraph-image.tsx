import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BUDR Care — Driftssystem til socialpsykiatriske botilbud';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: '#0a1a14',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        fontFamily: 'Georgia, serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Baggrundsgradient */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(93,202,165,0.14) 0%, rgba(133,183,235,0.06) 55%, transparent 75%)',
        }}
      />

      {/* Logo-mark + navn */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: 'linear-gradient(135deg, #5dcaa5 0%, #85b7eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: '#0a1a14',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          B
        </div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#f5f3ef',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          BUDR Care
        </span>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            fontSize: 62,
            fontWeight: 400,
            color: '#f5f3ef',
            lineHeight: 1.12,
            maxWidth: 820,
            letterSpacing: '-0.02em',
          }}
        >
          Vagtoverdragelsen sker stadig på hukommelse.
        </div>
        <div
          style={{
            fontSize: 26,
            color: '#5dcaa5',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 400,
          }}
        >
          Det kan løses. — budrcare.dk
        </div>
      </div>

      {/* Bundlinje */}
      <div
        style={{
          display: 'flex',
          gap: 32,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 16,
          color: 'rgba(245,243,239,0.45)',
        }}
      >
        <span>Care Portal</span>
        <span>·</span>
        <span>Lys borger-app</span>
        <span>·</span>
        <span>Dansk platform</span>
        <span>·</span>
        <span>GDPR-klar</span>
      </div>
    </div>,
    { ...size }
  );
}
