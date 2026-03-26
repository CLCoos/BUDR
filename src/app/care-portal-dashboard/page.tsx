import React from 'react';
import TopNav from '@/components/TopNav';
import PortalSidebar from '@/components/PortalSidebar';
import DashboardClient from './components/DashboardClient';

export default function CarePortalDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <PortalSidebar />
      <div className="pt-12 pl-[200px] transition-all duration-300">
        <DashboardClient />
      </div>
    </div>
  );
}