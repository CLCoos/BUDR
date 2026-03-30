import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5">
        <AppLogo size={36} />
        <nav className="flex items-center gap-4">
          <Link
            href="/park-hub"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Borger-app
          </Link>
          <Link
            href="/care-portal-dashboard"
            className="text-sm font-semibold text-white rounded-full px-5 py-2 transition-colors"
            style={{ backgroundColor: '#1D9E75' }}
          >
            Care Portal
          </Link>
        </nav>
      </header>
    </main>
  );
}
