'use client';

import React, { Suspense } from 'react';
import ProfileView from './components/ProfileView';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen gradient-midnight" />}>
      <ProfileView />
    </Suspense>
  );
}
