/**
 * Stroke-baserede ikoner til budrcare-landing (ikke system-emoji).
 * viewBox 24×24, 1,5 px linjer — matcher et roligt, professionelt udtryk.
 */

import type { ReactNode } from 'react';

type BaseProps = {
  size?: number;
  className?: string;
};

const s = {
  stroke: 'currentColor' as const,
  fill: 'none' as const,
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Svg({ size = 24, className, children }: BaseProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      {children}
    </svg>
  );
}

/** Humør/signal — besked + ur (signalet kommer for sent) */
export function IconMoodSignal(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="9" width="12" height="9" rx="2" {...s} />
      <path d="M6 12.5h6M6 15h4" {...s} />
      <circle cx="18" cy="7" r="3.5" {...s} />
      <path d="M18 5.5V7h1.3" {...s} />
    </Svg>
  );
}

/** Dokumentation — ark + stiplede linjer (hukommelse, ikke system) */
export function IconDocMemory(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M8 4.5h8.5a1 1 0 011 1V19a1 1 0 01-1 1H8a2 2 0 01-2-2V6.5a2 2 0 012-2z" {...s} />
      <path d="M8 9h6M8 12h8M8 15h5" strokeDasharray="1.5 2" {...s} />
    </Svg>
  );
}

/** Personaleskifte — brudt vidensflow mellem to punkter */
export function IconShiftGap(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="12" r="2.5" {...s} />
      <circle cx="18" cy="12" r="2.5" {...s} />
      <path d="M8.8 12h2.2M13 12h2.2" strokeDasharray="2 2" {...s} />
      <path d="M11 9l2 3-2 3" {...s} />
    </Svg>
  );
}

/** Sendt til portal — hurtig overførsel */
export function IconSyncSend(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M3 12h11M10 8l4 4-4 4" {...s} />
      <path d="M16 7v3M16 10l2-1.5M16 10l2 1.5" {...s} strokeWidth={1.25} />
    </Svg>
  );
}

/** Advarsel */
export function IconWarning(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l8.5 15H3.5L12 3.5z" {...s} />
      <path d="M12 9.5V14M12 16.8v.1" {...s} />
    </Svg>
  );
}

/** Lys / mobil check-in */
export function IconPhoneCheckin(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="3" width="10" height="18" rx="2" {...s} />
      <path d="M10 6.5h4M12 19h.01" {...s} />
      <path d="M9.5 11l1.8 1.8L15 9" {...s} />
    </Svg>
  );
}

/** Care Portal / skærm */
export function IconMonitorPortal(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" {...s} />
      <path d="M8 20h8M12 16v4" {...s} />
      <path d="M6 8h12M6 11h8M6 14h10" {...s} strokeOpacity={0.55} />
    </Svg>
  );
}

/** Handling / relation — hånd + hjerte (omsorg) */
export function IconCareAction(props: BaseProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 18s-5-3.2-5-6.8c0-1.8 1.3-3.2 3-3.2 1 0 1.9.5 2.5 1.2.6-.7 1.5-1.2 2.5-1.2 1.7 0 3 1.4 3 3.2C18 14.8 12 18 12 18z"
        {...s}
      />
      <path d="M5 10c-1 .8-1.5 2-1.5 3.5" {...s} />
    </Svg>
  );
}

/** Dagsoverblik — gitter med fokus */
export function IconOverviewGrid(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" {...s} />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" {...s} strokeWidth={2} />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" {...s} />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" {...s} />
    </Svg>
  );
}

/** Journal */
export function IconJournal(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h10a1 1 0 011 1V20a1 1 0 01-1 1H7a2 2 0 01-2-2V5.5a2 2 0 012-2z" {...s} />
      <path d="M9 8h8M9 12h8M9 16h5" {...s} />
    </Svg>
  );
}

/** Trafiklys */
export function IconTraffic(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="3" width="6" height="18" rx="2" {...s} />
      <circle cx="12" cy="7" r="2" fill="var(--green, #3cbf70)" stroke="none" />
      <circle cx="12" cy="12" r="2" fill="var(--amber, #e9aa47)" stroke="none" />
      <circle cx="12" cy="17" r="2" fill="var(--red, #d95555)" stroke="none" />
    </Svg>
  );
}

/** Medicin — kapsel */
export function IconMedicine(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="10" width="12" height="4" rx="2" {...s} />
      <path d="M12 10v4" {...s} />
    </Svg>
  );
}

/** Plan / godkendelse */
export function IconPlanCheck(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M9 4.5h8l2 2.5V19a1 1 0 01-1 1H9a2 2 0 01-2-2V6.5a2 2 0 012-2z" {...s} />
      <path d="M9 9h6M9 12h4" {...s} />
      <path d="M8.5 16.5l1.5 1.5 3-3.5" {...s} />
    </Svg>
  );
}

/** Beboer / bruger */
export function IconUser(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3" {...s} />
      <path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" {...s} />
    </Svg>
  );
}

/** Varsel / prik */
export function IconAlertBell(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c-2.8 0-5 2-5 4.5v3.5L5 18h14l-2-6.5V8c0-2.5-2.2-4.5-5-4.5z" {...s} />
      <path d="M10 18a2 2 0 004 0" {...s} />
      <circle cx="16" cy="6" r="2" fill="currentColor" stroke="none" opacity={0.9} />
    </Svg>
  );
}

/** GDPR / skjold */
export function IconShield(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" {...s} />
      <path d="M9 12l2 2 4-4" {...s} />
    </Svg>
  );
}

/** Lås / samtykke */
export function IconLock(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="10" width="12" height="10" rx="1.5" {...s} />
      <path d="M8 10V7.5a4 4 0 018 0V10" {...s} />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Samarbejde / fagpersoner */
export function IconTeam(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="9" r="2.5" {...s} />
      <circle cx="16" cy="9" r="2.5" {...s} />
      <path d="M4 19c0-2.5 2-4 4-4M20 19c0-2.5-2-4-4-4" {...s} />
      <path d="M12 12v2M12 14c-1.5 0-3 .5-3 2" {...s} />
    </Svg>
  );
}

/** Lille check (status) */
export function IconCheck(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M5 12l4.5 5L19 7" {...s} strokeWidth={2} />
    </Svg>
  );
}

/* —— USP-ikoner —— */

export function IconUspRealtime(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h4l1.5-3L14 15l2.5-3H19" {...s} />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconUspHumanOk(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3" {...s} />
      <path d="M6 19c0-3.3 2.7-5 6-5s6 1.7 6 5" {...s} />
      <path d="M18 5l1.5 1.5L22 4" {...s} />
      <circle cx="19" cy="5" r="2" {...s} strokeWidth={1.2} />
    </Svg>
  );
}

export function IconUspOneTruth(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" {...s} strokeWidth={2} />
      <path d="M12 5v3M12 16v3M5 12h3M16 12h3" {...s} />
      <path
        d="M7.5 7.5l2 2M14.5 14.5l2 2M16.5 7.5l-2 2M9.5 14.5l-2 2"
        {...s}
        strokeOpacity={0.45}
      />
    </Svg>
  );
}

export function IconUspBotilbud(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V10l8-4 8 4v10" {...s} />
      <path d="M9 20v-6h6v6" {...s} />
      <path d="M4 10h16" {...s} />
    </Svg>
  );
}

export function IconUspDemo(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" {...s} />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconUspTrust(props: BaseProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" {...s} />
      <path d="M8 12l2.5 2.5L16 9" {...s} />
    </Svg>
  );
}

export function IconUspVoice(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M4 14v-4c0-2.2 1.8-4 4-4h1" {...s} />
      <path d="M8 6v12M8 10c0-1.1.9-2 2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2" {...s} />
      <path d="M14 12h3l2 3v-6l-2 3h-1" {...s} />
    </Svg>
  );
}

export function IconUspSignal(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M4 18V6l4 8 3-6 3 10 3-7 3 5v2" {...s} />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Søgning i journal/dokumentation */
export function IconSearchDoc(props: BaseProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.5h8a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z" {...s} />
      <circle cx="10.5" cy="11.5" r="2.5" {...s} />
      <path d="M12.5 13.5L16 17" {...s} />
    </Svg>
  );
}

/** Roller / nøgle */
export function IconRoles(props: BaseProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3" {...s} />
      <path d="M5.5 19c0-3 3-5 6.5-5s6.5 2 6.5 5" {...s} />
      <path d="M16 5l2.5 2.5L21 5" {...s} strokeWidth={1.2} />
    </Svg>
  );
}
