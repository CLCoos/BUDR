'use client';
import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Bell,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  badge: number;
  cpActiveTab?: string | null;
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/care-portal-dashboard', badge: 0, cpActiveTab: null },
  { icon: ClipboardList, label: 'Vagtoverlev.', href: '/handover-workspace', badge: 2 },
  { icon: Users, label: 'Beboere', href: '/resident-360-view', badge: 0 },
  { icon: Bell, label: 'Advarsler', href: '/care-portal-dashboard?tab=alerts', badge: 3, cpActiveTab: 'alerts' },
  { icon: Calendar, label: 'Planlægger', href: '/care-portal-dashboard?tab=planner', badge: 0, cpActiveTab: 'planner' },
  { icon: BookOpen, label: 'Journal', href: '/care-portal-dashboard?tab=journal', badge: 0, cpActiveTab: 'journal' },
  { icon: Settings, label: 'Indstillinger', href: '/care-portal-settings', badge: 0 },
];

function navItemActive(pathname: string, searchParams: URLSearchParams, item: NavItem): boolean {
  if (item.cpActiveTab !== undefined) {
    return pathname === '/care-portal-dashboard' && (searchParams.get('tab') ?? null) === item.cpActiveTab;
  }
  return pathname === item.href;
}

type InnerProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  orgName: string | null;
  orgLogoUrl: string | null;
};

function PortalSidebarInner({ mobileOpen, onMobileClose, orgName, orgLogoUrl }: InnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [initials, setInitials] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const full = user.user_metadata?.full_name as string | undefined;
      const name = full ?? user.email ?? '';
      setDisplayName(full ?? user.email ?? '');
      const parts = name.split(/[\s@]/);
      setInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase(),
      );
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/care-portal-login');
  };

  const mobileClosed = !mobileOpen;

  return (
    <aside
      className={`fixed bottom-0 left-0 z-[60] flex shrink-0 flex-col bg-[#0F1B2D] transition-[transform,width] duration-300 top-24 md:top-12 ${
        collapsed ? 'w-16' : 'w-64'
      } ${mobileClosed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} ${
        mobileClosed ? 'pointer-events-none md:pointer-events-auto' : 'pointer-events-auto'
      }`}
    >
      {/* Org branding header */}
      <div className={`flex shrink-0 items-center border-b border-white/10 ${collapsed ? 'justify-center px-0 py-3' : 'gap-2.5 px-4 py-3'}`}>
        {orgLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={orgLogoUrl}
            alt={orgName ?? 'Organisation'}
            className={collapsed ? 'h-6 w-6 object-contain' : 'h-8 w-auto max-w-[140px] object-contain'}
          />
        ) : (
          <>
            <AppLogo size={collapsed ? 22 : 26} />
            {!collapsed && (
              <span className="truncate text-sm font-bold text-white">
                {orgName ?? 'BUDR'}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {navItems.map(item => {
          const active = navItemActive(pathname, searchParams, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              scroll={item.cpActiveTab === undefined || item.cpActiveTab === null}
              onClick={() => onMobileClose()}
            >
              <div
                className={`mx-2 mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  active
                    ? 'bg-[#1D9E75]/20 text-[#1D9E75]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
                )}
                {!collapsed && item.badge > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-3">
        {!collapsed && displayName && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white">{displayName}</div>
              <div className="truncate text-xs text-gray-500">Personale</div>
            </div>
          </div>
        )}
        <div className="mx-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded p-1 text-gray-500 transition-colors hover:text-gray-300"
            aria-label="Log ud"
          >
            <LogOut size={16} />
          </button>
          {!collapsed && (
            <button type="button" className="rounded p-1 text-gray-500 transition-colors hover:text-gray-300">
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0F1B2D] text-gray-400 transition-colors hover:text-white"
        aria-label={collapsed ? 'Udvid sidemenu' : 'Sammenklap sidemenu'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}

type PortalSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  orgName?: string | null;
  orgLogoUrl?: string | null;
};

export default function PortalSidebar({
  mobileOpen = false,
  onMobileClose = () => {},
  orgName = null,
  orgLogoUrl = null,
}: PortalSidebarProps) {
  return (
    <Suspense
      fallback={
        <aside
          className="fixed bottom-0 left-0 top-12 z-40 hidden w-64 shrink-0 bg-[#0F1B2D] md:block"
          aria-hidden
        />
      }
    >
      <PortalSidebarInner
        mobileOpen={mobileOpen}
        onMobileClose={onMobileClose}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
      />
    </Suspense>
  );
}
