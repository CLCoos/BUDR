'use client';

import React, { Suspense } from 'react';
import SocialView from './components/SocialView';

export default function SocialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-midnight-900" />}>
      <SocialView />
    </Suspense>
  );
}
