'use client';

import React from 'react';
import AssistantClient from '@/app/care-portal-assistant/AssistantClient';

export default function CarePortalDemoAssistantPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <AssistantClient carePortalDark demoMode />
    </div>
  );
}
