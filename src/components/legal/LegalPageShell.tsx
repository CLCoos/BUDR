import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

const year = new Date().getFullYear();

export default function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <AppLogo size={32} />
            <span className="font-bold tracking-tight">BUDR</span>
          </Link>
          <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-slate-600">
            <Link href="/privacy" className="hover:text-slate-900">
              Privatliv
            </Link>
            <Link href="/cookies" className="hover:text-slate-900">
              Cookies
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Vilkår
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Senest opdateret: 3. april {year}</p>
        <div className="prose prose-slate mt-8 max-w-none text-sm leading-relaxed">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <p>
          © {year} BUDR ·{' '}
          <a href="mailto:hej@budrcare.dk" className="text-slate-700 underline">
            hej@budrcare.dk
          </a>
        </p>
      </footer>
    </div>
  );
}
