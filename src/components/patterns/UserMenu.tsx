'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';
import styles from './UserMenu.module.css';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type UserMenuProps = {
  forceOpen?: boolean;
};

export function UserMenu({ forceOpen = false }: UserMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(forceOpen);
  const authState = useAuthenticatedUser();

  useEffect(() => {
    setOpen(forceOpen);
  }, [forceOpen]);

  useEffect(() => {
    if (!open || forceOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, forceOpen]);

  const name = useMemo(() => {
    if (authState.status === 'authenticated' || authState.status === 'authenticated-incomplete') {
      const fullName = (authState.user.user_metadata?.full_name as string | undefined)?.trim();
      return fullName || authState.user.email || 'Personale';
    }
    return 'Personale';
  }, [authState]);
  const email =
    authState.status === 'authenticated' || authState.status === 'authenticated-incomplete'
      ? authState.user.email || ''
      : '';
  const role =
    authState.status === 'authenticated'
      ? authState.staff.role || 'Personale'
      : authState.status === 'authenticated-incomplete'
        ? ((authState.user.user_metadata?.role as string | undefined) ?? 'Personale')
        : 'Personale';

  const initials = useMemo(() => getInitials(name), [name]);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/care-portal-login');
  };

  const renderedOpen = forceOpen || open;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          if (!forceOpen) setOpen((state) => !state);
        }}
        aria-haspopup="menu"
        aria-expanded={renderedOpen}
        aria-label="Åbn brugermenu"
      >
        <span className={styles.avatar}>{initials}</span>
        <ChevronDown size={16} aria-hidden />
      </button>

      {renderedOpen ? (
        <div className={styles.menu} role="menu" aria-label="Brugermenu">
          <div className={styles.header}>
            <p className={styles.name}>{name}</p>
            <p className={styles.meta}>{email || 'Ingen e-mail'}</p>
            <p className={styles.meta}>{role}</p>
          </div>
          <Link
            href="/care-portal-dashboard/settings/profile"
            className={styles.action}
            role="menuitem"
          >
            Min profil
          </Link>
          <Link href="/care-portal-dashboard/settings" className={styles.action} role="menuitem">
            Indstillinger
          </Link>
          <div className={styles.divider} />
          <button
            type="button"
            className={`${styles.action} ${styles.danger}`}
            role="menuitem"
            onClick={() => void handleLogout()}
          >
            Log ud
          </button>
        </div>
      ) : null}
    </div>
  );
}
