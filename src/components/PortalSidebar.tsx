'use client';
import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
};

function PortalSidebarInner({ mobileOpen, onMobileClose }: InnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  const mobileClosed = !mobileOpen;

  return (
    <aside
      className={`fixed bottom-0 left-0 z-[60] flex shrink-0 flex-col bg-[#0F1B2D] transition-[transform,width] duration-300 top-24 md:top-12 ${
        collapsed ? 'w-16' : 'w-64'
      } ${mobileClosed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} ${
        mobileClosed ? 'pointer-events-none md:pointer-events-auto' : 'pointer-events-auto'
      }`}
    >
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
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-semibold text-white">
              SK
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white">Sara K.</div>
              <div className="truncate text-xs text-gray-500">Dagvagt</div>
            </div>
          </div>
        )}
        <div className="mx-1 flex items-center gap-2">
          <button type="button" className="rounded p-1 text-gray-500 transition-colors hover:text-gray-300">
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
};

export default function PortalSidebar({
  mobileOpen = false,
  onMobileClose = () => {},
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
      <PortalSidebarInner mobileOpen={mobileOpen} onMobileClose={onMobileClose} />
    </Suspense>
  );
}
