'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const HIDDEN_PREFIXES = ['/lys-chat', '/onboarding', '/morning-check-in', '/portal'];

/**
 * FAB: ét tap til Lys-chat på alle skærme med bottom navigation.
 */
export default function LysChatFab() {
  const pathname = usePathname() ?? '';

  const hide =
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname === '/';

  if (hide) return null;

  return (
    <Link
      href="/lys-chat"
      className="fixed z-[45] right-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-sunrise-400 to-sunrise-500 text-midnight-950 shadow-lg shadow-sunrise-500/35 border border-sunrise-300/50 active:scale-95 transition-transform bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
      aria-label="Tal med Lys"
      title="Tal med Lys"
    >
      <Sparkles className="w-6 h-6" strokeWidth={2.2} aria-hidden />
    </Link>
  );
}
