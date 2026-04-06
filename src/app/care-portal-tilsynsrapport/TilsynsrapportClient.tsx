'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TilsynsrapportModal from '../care-portal-dashboard/components/TilsynsrapportModal';

export default function TilsynsrapportClient() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <TilsynsrapportModal
      open={open}
      onClose={() => {
        setOpen(false);
        router.push('/care-portal-dashboard');
      }}
    />
  );
}
