'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TilsynsrapportModal from '../care-portal-dashboard/components/TilsynsrapportModal';

type Props = {
  returnHref?: string;
};

export default function TilsynsrapportClient({ returnHref = '/care-portal-dashboard' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <TilsynsrapportModal
      open={open}
      onClose={() => {
        setOpen(false);
        router.push(returnHref);
      }}
    />
  );
}
