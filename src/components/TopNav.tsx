'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';

const borgerRoutes = ['/park-hub'];
const portalRoutes = ['/care-portal-dashboard', '/handover-workspace', '/resident-360-view'];

export default function TopNav() {
  const pathname = usePathname();

  const isBorger = borgerRoutes?.some(r => pathname?.startsWith(r));
  const isPortal = portalRoutes?.some(r => pathname?.startsWith(r));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-12 flex items-center px-4 gap-2">
      <div className="flex items-center gap-2 mr-6">
        <AppLogo size={28} />
        <span className="font-bold text-gray-800 text-sm tracking-tight">BUDR</span>
      </div>
      <div className="flex gap-1">
        <Link href="/park-hub">
          <button
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              isBorger
                ? 'bg-[#7F77DD] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Borger-app
          </button>
        </Link>
        <Link href="/care-portal-dashboard">
          <button
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              isPortal
                ? 'bg-[#1D9E75] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Care Portal
          </button>
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-gray-400">Demo · Bosted Nordlys</span>
        <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-semibold">SK</div>
      </div>
    </nav>
  );
}