import React from 'react';
import TopNav from '@/components/TopNav';
import PortalSidebar from '@/components/PortalSidebar';
import Resident360Client from './components/Resident360Client';

export default function Resident360ViewPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <PortalSidebar />
      <div className="pt-12 pl-[200px] transition-all duration-300">
        <Resident360Client />
      </div>
    </div>
  );
}