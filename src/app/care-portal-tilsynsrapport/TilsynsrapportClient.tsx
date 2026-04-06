'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TilsynsrapportModal from '../care-portal-dashboard/components/TilsynsrapportModal';

type Props = {
  returnHref?: string;
  preferDemoWhenNoResidents?: boolean;
};

export default function TilsynsrapportClient({
  returnHref = '/care-portal-dashboard',
  preferDemoWhenNoResidents = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <TilsynsrapportModal
      open={open}
      preferDemoWhenNoResidents={preferDemoWhenNoResidents}
      onClose={() => {
        setOpen(false);
        router.push(returnHref);
      }}
    />
  );
}
