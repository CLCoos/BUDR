import React from 'react';
import { getResidentId } from '@/lib/residentAuth';
import MorningCheckInFlow from './components/MorningCheckInFlow';

export default async function MorningCheckInPage() {
  const residentId = await getResidentId();
  return <MorningCheckInFlow residentId={residentId ?? ''} />;
}
