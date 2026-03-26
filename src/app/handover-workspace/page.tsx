import React from 'react';
import TopNav from '@/components/TopNav';
import PortalSidebar from '@/components/PortalSidebar';
import HandoverClient from './components/HandoverClient';

export default function HandoverWorkspacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <PortalSidebar />
      <div className="pt-12 pl-[200px] transition-all duration-300">
        <HandoverClient />
      </div>
    </div>
  );
}