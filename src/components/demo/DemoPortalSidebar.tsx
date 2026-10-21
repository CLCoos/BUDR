'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { useDemoFortael } from '@/components/demo/DemoFortael';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  BrainCircuit,
  MessageSquare,
  Sun,
  Building2,
  Mic,
  Sparkles,
  FileText,
  ClipboardCopy,
} from 'lucide-react';

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  badge: number;
  cpActiveTab?: string | null;
};

const mainNavItems: NavItem[] = [
  { icon: Sun, label: 'Vagt', href: '/care-portal-demo', badge: 0, cpActiveTab: null },
  { icon: Users, label: 'Borgere', href: '/care-portal-demo/residents', badge: 0 },
  { icon: FileText, label: 'Frister', href: '/care-portal-demo/dokumenter', badge: 1 },
  { icon: Building2, label: 'Bosted', href: '/care-portal-demo/vagtplan', badge: 0 },
];

const moreNavItems: NavItem[] = [
  { icon: ClipboardList, label: 'Overlevering', href: '/care-portal-demo/handover', badge: 0 },
  { icon: MessageSquare, label: 'Beskeder', href: '/care-portal-demo/beskeder', badge: 2 },
  { icon: ClipboardCopy, label: 'Til fagsystem', href: '/care-portal-demo/fagsystem', badge: 0 },
  { icon: BrainCircuit, label: 'Faglig støtte', href: '/care-portal-demo/assistant', badge: 0 },
  { icon: Upload, label: 'Dataimport', href: '/care-portal-demo/import', badge: 0 },
  { icon: Sparkles, label: 'Borger-app (Lys)', href: '/resident-demo', badge: 0 },
  { icon: Settings, label: 'Indstillinger', href: '/care-portal-demo/settings', badge: 0 },
];

function navItemActive(pathname: string, searchParams: URLSearchParams, item: NavItem): boolean {
  if (item.href === '/resident-demo') {
    return pathname === '/resident-demo';
  }
  if (item.cpActiveTab !== undefined && item.cpActiveTab !== null) {
    return (
      pathname === '/care-portal-demo' && (searchParams.get('tab') ?? null) === item.cpActiveTab
    );
  }
  return pathname === item.href;
}

type InnerProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  orgName: string | null;
  orgLogoUrl: string | null;
};

function DemoPortalSidebarInner({ mobileOpen, onMobileClose, orgName, orgLogoUrl }: InnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const mobileClosed = !mobileOpen;
  const { openFortael } = useDemoFortael();

  const renderItem = (item: NavItem) => {
    const active = navItemActive(pathname, searchParams, item);
    return (
      <Link
        key={item.label}
        href={item.href}
        scroll={item.cpActiveTab === undefined || item.cpActiveTab === null}
        onClick={() => onMobileClose()}
      >
        <div
          className="relative mx-2 mb-0.5 flex min-h-[40px] cursor-pointer items-center gap-3 rounded-[10px] px-3 transition-colors duration-150"
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
          onMouseEnter={(e) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-sidebar-hover-bg)';
              (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-text)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.backgroundColor = '';
              (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-muted)';
            }
          }}
        >
          {active && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: '60%',
                backgroundColor: 'var(--cp-ink-accent)',
                borderRadius: '0 2px 2px 0',
              }}
            />
          )}
          <item.icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && (
            <span
              className="flex-1 truncate"
              style={{ fontSize: 14, fontWeight: active ? 500 : 400 }}
            >
              {item.label}
            </span>
          )}
          {!collapsed && item.badge > 0 && (
            <span
              className="cp-num flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium"
              style={{ backgroundColor: '#f59e0b', color: '#1a1206' }}
            >
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <aside
      className={`
        fixed bottom-0 left-0 z-[10060] flex shrink-0 flex-col
        transition-[transform,width] duration-300
        top-[calc(var(--cp-demo-stack-top)+9.5rem)] sm:top-[calc(var(--cp-demo-stack-top)+3.5rem)] md:top-[var(--cp-demo-stack-top)]
        md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0 md:pointer-events-auto
        ${collapsed ? 'w-16' : 'w-56'}
        ${mobileClosed ? '-translate-x-full invisible md:visible md:translate-x-0' : 'translate-x-0 visible'}
        ${mobileClosed ? 'pointer-events-none md:pointer-events-auto' : 'pointer-events-auto'}
      `}
      style={{
        backgroundColor: 'var(--cp-sidebar-bg)',
        borderRight: '1px solid var(--cp-sidebar-border)',
      }}
    >
      <div
        className={`flex shrink-0 items-center ${collapsed ? 'justify-center px-0 py-3' : 'gap-2.5 px-4 py-3'}`}
        style={{ borderBottom: '1px solid var(--cp-sidebar-border)' }}
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
            <div
              aria-hidden
              className="flex shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold"
              style={{
                width: 30,
                height: 30,
                background: 'var(--cp-ink-2)',
                color: 'var(--cp-ink-accent)',
              }}
            >
              {(orgName ?? CARE_PORTAL_DEMO_FACILITY_NAME).trim().charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--cp-sidebar-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {orgName ?? CARE_PORTAL_DEMO_FACILITY_NAME}
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
                  DEMO · Care Portal
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-2 pt-3">
        <button
          type="button"
          onClick={() => {
            onMobileClose();
            openFortael();
          }}
          className={`flex min-h-[48px] w-full items-center rounded-xl text-[15px] font-semibold transition-opacity hover:opacity-90 ${collapsed ? 'justify-center' : 'gap-2.5 px-4'}`}
          style={{ backgroundColor: 'var(--cp-ink-accent)', color: 'var(--cp-ink)' }}
          aria-label="Fortæl"
        >
          <Mic size={18} aria-hidden />
          {!collapsed && 'Fortæl'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-3 scrollbar-hide cp-scroll">
        {mainNavItems.map(renderItem)}
        {!collapsed && (
          <div
            className="mx-5 mb-1 mt-5 text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--cp-sidebar-muted)' }}
          >
            Mere
          </div>
        )}
        <div className="[&_span]:!text-[13px]">{moreNavItems.map(renderItem)}</div>
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--cp-sidebar-border)' }}>
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--cp-green)' }}
            >
              SK
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-xs font-medium"
                style={{ color: 'var(--cp-sidebar-text)' }}
              >
                Sara K.
              </div>
              <div className="truncate text-xs" style={{ color: 'var(--cp-sidebar-muted)' }}>
                Demo-personale
              </div>
            </div>
          </div>
        )}
        <div className="mx-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/care-portal-login')}
            className="rounded p-1 transition-colors"
            style={{ color: 'var(--cp-sidebar-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--cp-sidebar-muted)';
            }}
            aria-label="Gå til login"
          >
            <LogOut size={16} />
          </button>
          {!collapsed && (
            <Link
              href="/care-portal-demo/settings"
              className="rounded p-1 transition-colors"
              style={{ color: 'var(--cp-sidebar-muted)' }}
              onClick={() => onMobileClose()}
              aria-label="Indstillinger"
            >
              <Settings size={16} />
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

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  orgName?: string | null;
  orgLogoUrl?: string | null;
};

export default function DemoPortalSidebar({
  mobileOpen = false,
  onMobileClose = () => {},
  orgName = null,
  orgLogoUrl = null,
}: Props) {
  return (
    <Suspense
      fallback={
        <aside
          className="fixed bottom-0 left-0 z-40 hidden w-56 shrink-0 md:block"
          style={{
            top: 'var(--cp-demo-stack-top, 92px)',
            backgroundColor: 'var(--cp-sidebar-bg)',
            borderRight: '1px solid var(--cp-sidebar-border)',
          }}
          aria-hidden
        />
      }
    >
      <DemoPortalSidebarInner
        mobileOpen={mobileOpen}
        onMobileClose={onMobileClose}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
      />
    </Suspense>
  );
}
