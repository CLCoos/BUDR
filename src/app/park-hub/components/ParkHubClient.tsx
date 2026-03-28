'use client';

import React from 'react';
import LysHome from './LysHome';

interface Props {
  residentName?: string;
  residentInitials?: string;
  residentId?: string;
}

export default function ParkHubClient({
  residentName = 'Beboer',
  residentInitials = '?',
  residentId = '',
}: Props) {
  const firstName = residentName.trim().split(/\s+/)[0] || residentName;

  return <LysHome firstName={firstName} initials={residentInitials} residentId={residentId} />;
}
