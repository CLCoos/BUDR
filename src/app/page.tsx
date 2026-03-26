import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  const screens = [
    {
      id: 'borger',
      label: 'Borger-app',
      screens: [
        { name: 'PARK Hub', route: '/park-hub', desc: 'Daglig check-in, tankefanger, mål og ressourceblomst', color: '#7F77DD' },
      ],
    },
    {
      id: 'portal',
      label: 'Care Portal',
      screens: [
        { name: 'Dashboard', route: '/care-portal-dashboard', desc: 'Advarsler, beboeroversigt og statskort', color: '#1D9E75' },
        { name: 'Vagtoverleveringsrum', route: '/handover-workspace', desc: 'Skriv og læs vagtnotat med AI-hjælp', color: '#1D9E75' },
        { name: 'Beboer 360', route: '/resident-360-view', desc: 'Komplet beboerprofil med PARK-data', color: '#1D9E75' },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">BUDR Prototype</h1>
      {screens?.map(group => (
        <div key={group?.id} className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-gray-600">{group?.label}</h2>
          <div className="flex flex-wrap gap-4">
            {group?.screens?.map(s => (
              <Link key={s?.route} href={s?.route}>
                <div className="w-64 p-5 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-all cursor-pointer">
                  <div className="w-3 h-3 rounded-full mb-3" style={{ backgroundColor: s?.color }} />
                  <div className="font-semibold text-gray-800 mb-1">{s?.name}</div>
                  <div className="text-sm text-gray-500">{s?.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}