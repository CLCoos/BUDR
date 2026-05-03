'use client';

import React from 'react';
import AssistantClient from '@/app/care-portal-assistant/AssistantClient';
import DemoWhyBox from '@/components/demo/DemoWhyBox';

export default function CarePortalDemoAssistantPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col space-y-4 px-4 py-6">
      <DemoWhyBox title="Hvad er Faglig støtte i demoen?" storageKey="budr_demo_why_assistant">
        Funktionen giver{' '}
        <strong style={{ color: 'var(--cp-text)' }}>faglige udkast og forslag</strong> — ikke færdig
        dokumentation, diagnose eller behandlingsplan. I drift kræver den medarbejder og org som ved
        de øvrige portal-data. Her kører demo mod et separat endpoint uden login: alt er
        illustration, og alt skal vurderes fagligt før I handler på det.
      </DemoWhyBox>
      <AssistantClient carePortalDark demoMode />
    </div>
  );
}
