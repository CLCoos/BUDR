'use client';

import Link from 'next/link';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { GlobalSearch } from '@/components/patterns/GlobalSearch';
import { UserMenu } from '@/components/patterns/UserMenu';
import { cn } from '@/lib/cn';
import styles from './TopHeader.module.css';

type TopHeaderProps = {
  fixed?: boolean;
};

export function TopHeader({ fixed = true }: TopHeaderProps) {
  return (
    <header className={cn(styles.header, fixed && styles.fixed)}>
      <div className={styles.left}>
        <Link href="/care-portal-dashboard" aria-label="BUDR forside">
          <BudrLogo />
        </Link>
      </div>
      <div className={styles.center}>
        <GlobalSearch />
      </div>
      <div className={styles.right}>
        <UserMenu />
      </div>
    </header>
  );
}
