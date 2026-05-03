import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CARE_PORTAL_DEMO_DISCLAIMER_SHORT,
  CARE_PORTAL_DEMO_FACILITY_NAME,
} from '@/lib/carePortalDemoBranding';

export const metadata: Metadata = {
  title: 'Om Care Portal-demo (DEMO) | BUDR',
  description:
    'Forklaring af den interaktive Care Portal-demo: fiktive data, formål og begrænsninger.',
};

const pStyle = { color: 'var(--cp-muted)' } as const;
const h2Style = {
  fontFamily: "'DM Serif Display', serif",
  color: 'var(--cp-text)',
} as const;

export default function OmCarePortalDemoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={pStyle}>
        DEMO · {CARE_PORTAL_DEMO_FACILITY_NAME}
      </p>
      <h1 className="mb-4 text-2xl font-normal leading-tight sm:text-3xl" style={h2Style}>
        Om Care Portal-demoen
      </h1>
      <p className="mb-8 text-sm leading-relaxed" style={pStyle}>
        Denne side beskriver den interaktive demo, du bruger lige nu. Alt indhold i demoen er{' '}
        <strong style={{ color: 'var(--cp-text)' }}>simuleret og fiktivt</strong>.
      </p>

      <section className="mb-8 rounded-xl border p-5" style={{ borderColor: 'var(--cp-border)' }}>
        <h2 className="mb-2 text-lg font-semibold" style={h2Style}>
          Kort fortalt
        </h2>
        <p className="text-sm leading-relaxed" style={pStyle}>
          {CARE_PORTAL_DEMO_DISCLAIMER_SHORT} Demoens formål er at vise, hvordan personalet kan
          arbejde i BUDR Care Portal — uden at eksponere rigtige beboere eller journaldata.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold" style={h2Style}>
          Hvad kan du prøve?
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed" style={pStyle}>
          <li>Dagsoverblik med advarsler, medicin, kalender og opgaver (mock).</li>
          <li>Beboerliste og 360°-visning med journalkladde/godkendt flow (mock).</li>
          <li>Overrapport, indsatsdokumentation og tilsynsrapport som AI-udkast (illustration).</li>
          <li>Faglig støtte mod demo-endpoint (samme idé som live, men tydeligt mærket DEMO).</li>
          <li>Borger-appen Lys i separat demo (`/resident-demo`).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold" style={h2Style}>
          Begrænsninger
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed" style={pStyle}>
          <li>
            Ingen juridisk eller faglig gyldighed — ingen erstatning for journal, lov eller faglig
            vurdering.
          </li>
          <li>
            AI-svar kan være upræcise eller overfladiske; i produktion kræves menneskelig
            godkendelse.
          </li>
          <li>Data gemmes lokalt i browseren hvor demoen bruger klient-lager (fx visse lister).</li>
        </ul>
      </section>

      <p className="text-sm leading-relaxed" style={pStyle}>
        Teknisk dokumentation for udviklere findes i repo-filen{' '}
        <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs">docs/care-portal-demo.md</code>.
      </p>

      <div className="mt-10">
        <Link
          href="/care-portal-demo"
          className="inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          style={{
            background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
            boxShadow: '0 2px 14px rgba(45,212,160,0.35)',
          }}
        >
          Tilbage til demo-dashboard
        </Link>
      </div>
    </div>
  );
}
