import React from 'react';
import TopNav from '@/components/TopNav';
import ParkHubClient from './components/ParkHubClient';

export default function ParkHubPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4FF' }}>
      <TopNav />
      <div className="pt-12">
        <ParkHubClient />
      </div>
    </div>
  );
}