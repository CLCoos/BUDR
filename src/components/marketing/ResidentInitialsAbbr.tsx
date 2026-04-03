'use client';

type Props = {
  initials: string;
  fullName: string;
  className?: string;
};

/** Initialer på forsiden; fuldt navn via hover (title) og som udvidelse af forkortelsen. */
export function ResidentInitialsAbbr({ initials, fullName, className }: Props) {
  return (
    <abbr title={fullName} className={className ?? 'landing-res-abbr'}>
      {initials}
    </abbr>
  );
}
