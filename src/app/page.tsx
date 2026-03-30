import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  const groups = [
    {
      id: 'borger',
      label: 'Borger-app',
      color: '#7F77DD',
      screens: [
        { name: 'PARK Hub', route: '/park-hub', desc: 'Daglig check-in, tankefanger, mål og ressourceblomst' },
        { name: 'Dagstruktur', route: '/daily-structure', desc: 'Dagens program, opgaver og tidblokke' },
        { name: 'Daglige udfordringer', route: '/daily-challenges', desc: 'Personlige udfordringer med AI-motivation' },
        { name: 'Morgentjek', route: '/morning-check-in', desc: 'Stemning, energi og intention for dagen' },
        { name: 'Journal', route: '/journal', desc: 'Dagbog med KRAP-noter, humørskala og ressourcer' },
        { name: 'Stemmejournal', route: '/voice-journal', desc: 'Dikter din journal med stemmen' },
        { name: 'Månedsoversigt', route: '/monthly-report', desc: 'Rapport over månedens humør og mål' },
        { name: 'Profil', route: '/profile', desc: 'Målhistorik, statistik og ressourcetendenser' },
        { name: 'Tal med Lys', route: '/lys-chat', desc: 'AI-ledsager — skriv som du taler' },
        { name: 'Delt Lys', route: '/shared-lys', desc: 'Del Lys med dine nærmeste' },
        { name: 'Krise', route: '/krise', desc: 'Krisekort og akut støtte' },
        { name: 'Hviledag', route: '/hviledag', desc: 'Rolig dag uden krav' },
        { name: 'Stille tilstand', route: '/stille', desc: 'Minimal, stille interface' },
        { name: 'Sociale forbindelser', route: '/social', desc: 'Beskeder og Støttecirklen' },
        { name: 'Onboarding', route: '/onboarding', desc: 'Kom godt i gang med BUDR' },
      ],
    },
    {
      id: 'portal',
      label: 'Care Portal',
      color: '#1D9E75',
      screens: [
        { name: 'Dashboard', route: '/care-portal-dashboard', desc: 'Advarsler, beboeroversigt og statskort' },
        { name: 'Vagtoverleveringsrum', route: '/handover-workspace', desc: 'Skriv og læs vagtnotat med AI-hjælp' },
        { name: 'Beboer 360', route: '/resident-360-view', desc: 'Komplet beboerprofil med PARK-data' },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-2 text-gray-800">BUDR</h1>
      <p className="text-sm text-gray-500 mb-8">Vælg en skærm for at åbne den</p>
      {groups.map(group => (
        <div key={group.id} className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-gray-600">{group.label}</h2>
          <div className="flex flex-wrap gap-4">
            {group.screens.map(s => (
              <Link key={s.route} href={s.route}>
                <div className="w-64 p-5 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-all cursor-pointer">
                  <div className="w-3 h-3 rounded-full mb-3" style={{ backgroundColor: group.color }} />
                  <div className="font-semibold text-gray-800 mb-1">{s.name}</div>
                  <div className="text-sm text-gray-500">{s.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
