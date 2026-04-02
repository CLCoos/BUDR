import PortalShell from '@/components/PortalShell';
import AssistantClient from './AssistantClient';

export default function CarePortalAssistantPage() {
  return (
    <PortalShell>
      <div className="flex flex-col h-full min-h-0 max-w-3xl mx-auto w-full">
        <AssistantClient />
      </div>
    </PortalShell>
  );
}
