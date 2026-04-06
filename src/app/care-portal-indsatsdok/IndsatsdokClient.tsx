'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import IndsatsModal from '../care-portal-dashboard/components/IndsatsModal';

type Props = {
  returnHref?: string;
};

export default function IndsatsdokClient({ returnHref = '/care-portal-dashboard' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <IndsatsModal
      open={open}
      onClose={() => {
        setOpen(false);
        router.push(returnHref);
      }}
    />
  );
}
