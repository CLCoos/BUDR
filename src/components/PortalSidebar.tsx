'use client';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Bell,
  Calendar,
  BookOpen,
  BookMarked,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  BrainCircuit,
  CalendarClock,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { useAlertCount } from '@/hooks/useAlertCount';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  badge: number;
  cpActiveTab?: string | null;
  /** Særlig markering af aktiv side (fx Beboere dækker flere routes) */
  activeMatch?: 'residents' | 'vagtplan' | 'park' | 'dagbog' | 'alerts' | 'planner' | 'journal';
  /** Vis kun for staff med denne rolle */
  roleOnly?: 'leder' | 'medarbejder';
};

function pathFromHref(href: string): string {
  const i = href.indexOf('?');
  return i === -1 ? href : href.slice(0, i);
}

function navItemActive(
  pathname: string,
  searchParams: URLSearchParams,
  item: NavItem,
  pilot: boolean
): boolean {
  if (item.cpActiveTab !== undefined && item.cpActiveTab !== null) {
    return (
      pathname === '/care-portal-dashboard' &&
      (searchParams.get('tab') ?? null) === item.cpActiveTab
    );
  }
  if (item.cpActiveTab === null) {
    return pathname === '/care-portal-dashboard' && (searchParams.get('tab') ?? null) === null;
  }
  if (item.activeMatch === 'residents') {
    if (pilot) {
      return (
        pathname === '/care-portal-residents' ||
        pathname.startsWith('/care-portal-resident-preview/')
      );
    }
    return pathname.startsWith('/resident-360-view');
  }
  if (item.activeMatch === 'vagtplan') {
    return pathname.startsWith('/care-portal-vagtplan');
  }
  if (item.activeMatch === 'park') {
    return pathname.startsWith('/park-hub') || pathname.startsWith('/park/');
  }
  if (item.activeMatch === 'dagbog') {
    return pathname === '/resident-360-view/dagbog';
  }
  if (item.activeMatch === 'alerts') return pathname === '/care-portal-alerts';
  if (item.activeMatch === 'planner') return pathname === '/care-portal-planner';
  if (item.activeMatch === 'journal') return pathname === '/care-portal-journal';
  const p = pathFromHref(item.href);
  if (pathname === p) return true;
  if (p !== '/' && pathname.startsWith(`${p}/`)) return true;
  return false;
}

type InnerProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  orgName: string | null;
  orgLogoUrl: string | null;
  staffRole: string | null;
};

function PortalSidebarInner({
  mobileOpen,
  onMobileClose,
  orgName,
  orgLogoUrl,
  staffRole,
}: InnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [initials, setInitials] = useState<string>('');
  const alertCount = useAlertCount();
  const pilot = carePortalPilotSimulatedData();

  const navItems = useMemo((): NavItem[] => {
    const residentsHref = pilot ? '/care-portal-residents' : '/resident-360-view';
    const msgBadge = pilot ? 2 : 0;
    const base: NavItem[] = [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/care-portal-dashboard',
        badge: 0,
        cpActiveTab: null,
      },
      { icon: ClipboardList, label: 'Vagtoverlev.', href: '/handover-workspace', badge: 0 },
      {
        icon: Users,
        label: 'Beboere',
        href: residentsHref,
        badge: 0,
        activeMatch: 'residents',
      },
      ...(pilot
        ? []
        : [
            {
              icon: BookMarked,
              label: 'Aftenopsamling',
              href: '/resident-360-view/dagbog',
              badge: 0,
              activeMatch: 'dagbog' as const,
            },
          ]),
      {
        icon: Bell,
        label: 'Advarsler',
        href: '/care-portal-alerts',
        badge: 0,
        activeMatch: 'alerts',
      },
      {
        icon: Calendar,
        label: 'Planlægger',
        href: '/care-portal-planner',
        badge: 0,
        activeMatch: 'planner',
      },
      {
        icon: CalendarClock,
        label: 'Vagtplan',
        href: '/care-portal-vagtplan',
        badge: 0,
        activeMatch: 'vagtplan',
      },
      {
        icon: MessageSquare,
        label: 'Beskeder',
        href: '/care-portal-beskeder',
        badge: msgBadge,
      },
      {
        icon: BookOpen,
        label: 'Journal',
        href: '/care-portal-journal',
        badge: 0,
        activeMatch: 'journal',
      },
      {
        icon: Upload,
        label: 'Importer beboere',
        href: '/care-portal-import',
        badge: 0,
        roleOnly: 'leder',
      },
      { icon: BrainCircuit, label: 'Faglig støtte', href: '/care-portal-assistant', badge: 0 },
      {
        icon: Sparkles,
        label: 'Borger-app (Lys)',
        href: '/park-hub',
        badge: 0,
        activeMatch: 'park',
      },
      { icon: Settings, label: 'Indstillinger', href: '/care-portal-dashboard/settings', badge: 0 },
    ];
    return base
      .filter((item) => !item.roleOnly || item.roleOnly === staffRole)
      .map((item) => (item.cpActiveTab === 'alerts' ? { ...item, badge: alertCount } : item));
  }, [pilot, alertCount, staffRole]);

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
          : name.slice(0, 2).toUpperCase()
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
      className={`
        fixed bottom-0 left-0 z-[10060] flex shrink-0 flex-col
        transition-[transform,width] duration-300
        top-[calc(52px+9.5rem)] sm:top-[calc(52px+3.5rem)] md:top-[52px]
        md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0 md:pointer-events-auto
        ${collapsed ? 'w-16' : 'w-56'}
        ${mobileClosed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        ${mobileClosed ? 'pointer-events-none md:pointer-events-auto' : 'pointer-events-auto'}
      `}
      style={{
        background: 'var(--cp-sidebar-bg)',
        borderRight: '1px solid var(--cp-sidebar-border)',
        color: 'var(--cp-sidebar-text)',
      }}
    >
      {/* Org branding header */}
      <div
        className={`flex shrink-0 items-center ${collapsed ? 'justify-center px-0 py-3' : 'gap-2.5 px-4 py-3'}`}
        style={{
          background: 'var(--cp-sidebar-header-bg)',
          borderBottom: '1px solid var(--cp-sidebar-border)',
        }}
      >
        {orgLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={orgLogoUrl}
            alt={orgName ?? 'Organisation'}
            className={
              collapsed ? 'h-6 w-6 object-contain' : 'h-7 w-auto max-w-[120px] object-contain'
            }
          />
        ) : (
          <>
            {/* Orb logo */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'radial-gradient(circle at 35% 35%, #6ee7b7, #059669)',
                boxShadow: '0 0 12px rgba(45,212,160,0.4)',
              }}
            />
            {!collapsed && (
              <div className="min-w-0">
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 15,
                    color: 'var(--cp-sidebar-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {orgName ?? 'BUDR'}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--cp-sidebar-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  Care Portal
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3 scrollbar-hide cp-scroll">
        {navItems.map((item) => {
          const active = navItemActive(pathname, searchParams, item, pilot);
          return (
            <Link
              key={item.label}
              href={item.href}
              scroll={item.cpActiveTab === undefined || item.cpActiveTab === null}
              onClick={() => onMobileClose()}
            >
              <div
                className="relative mx-2 mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-150 hover:bg-[var(--cp-sidebar-hover-bg)]"
                style={
                  active
                    ? {
                        backgroundColor: 'var(--cp-sidebar-active-bg)',
                        color: 'var(--cp-sidebar-text)',
                      }
                    : {
                        color: 'var(--cp-sidebar-muted)',
                      }
                }
              >
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 2,
                      height: '60%',
                      backgroundColor: 'var(--cp-green)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <item.icon size={16} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="flex-1 truncate" style={{ fontSize: 13, fontWeight: 400 }}>
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-bold"
                    style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--cp-sidebar-border)' }}>
        {!collapsed && displayName && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2dd4a0, #0694a2)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-xs font-medium"
                style={{ color: 'var(--cp-sidebar-text)' }}
              >
                {displayName}
              </div>
              <div className="truncate text-xs" style={{ color: 'var(--cp-sidebar-muted)' }}>
                Personale
              </div>
            </div>
          </div>
        )}
        {!collapsed && (
          <div className="mx-1 mb-2">
            <ThemeToggle />
          </div>
        )}
        <div className="mx-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded p-1 transition-colors"
            style={{ color: 'var(--cp-sidebar-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-muted)';
            }}
            aria-label="Log ud"
          >
            <LogOut size={16} />
          </button>
          {!collapsed && (
            <Link href="/care-portal-dashboard/settings" onClick={onMobileClose}>
              <button
                type="button"
                className="rounded p-1 transition-colors"
                style={{ color: 'var(--cp-sidebar-muted)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-text)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-muted)';
                }}
                aria-label="Indstillinger"
              >
                <Settings size={16} />
              </button>
            </Link>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full transition-colors md:flex"
        style={{
          border: '1px solid var(--cp-sidebar-border)',
          backgroundColor: 'var(--cp-sidebar-bg)',
          color: 'var(--cp-sidebar-muted)',
        }}
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
  staffRole: string | null;
};

export default function PortalSidebar({
  mobileOpen = false,
  onMobileClose = () => {},
  orgName = null,
  orgLogoUrl = null,
  staffRole,
}: PortalSidebarProps) {
  return (
    <Suspense
      fallback={
        <aside
          className="fixed bottom-0 left-0 z-40 hidden w-56 shrink-0 md:block"
          style={{
            top: '52px',
            background: 'var(--cp-sidebar-bg)',
            borderRight: '1px solid var(--cp-sidebar-border)',
          }}
          aria-hidden
        />
      }
    >
      <PortalSidebarInner
        mobileOpen={mobileOpen}
        onMobileClose={onMobileClose}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        staffRole={staffRole}
      />
    </Suspense>
  );
}
