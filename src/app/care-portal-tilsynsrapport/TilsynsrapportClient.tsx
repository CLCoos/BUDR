'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TilsynsrapportModal from '../care-portal-dashboard/components/TilsynsrapportModal';

type Props = {
  returnHref?: string;
  preferDemoWhenNoResidents?: boolean;
  /** Kun /care-portal-demo: brug altid demoens borgere og indsatsnotater. */
  demoOnly?: boolean;
};

export default function TilsynsrapportClient({
  returnHref = '/care-portal-dashboard',
  preferDemoWhenNoResidents = false,
  demoOnly = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <TilsynsrapportModal
      open={open}
      preferDemoWhenNoResidents={preferDemoWhenNoResidents}
      demoOnly={demoOnly}
      onClose={() => {
        setOpen(false);
        router.push(returnHref);
      }}
    />
  );
}
