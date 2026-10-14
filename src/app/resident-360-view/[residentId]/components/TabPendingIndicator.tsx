'use client';

import { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';

/** Viser en spinner i fanen med det samme, mens den nye fane hentes fra serveren. */
export default function TabPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 size={13} className="ml-1.5 inline animate-spin" aria-hidden />;
}
