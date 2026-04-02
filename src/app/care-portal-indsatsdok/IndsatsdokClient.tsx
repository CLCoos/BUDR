'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import IndsatsModal from '../care-portal-dashboard/components/IndsatsModal';

export default function IndsatsdokClient() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <IndsatsModal
      open={open}
      onClose={() => {
        setOpen(false);
        router.push('/care-portal-dashboard');
      }}
    />
  );
}
