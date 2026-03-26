'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', route: '/care-portal-dashboard', badge: 0 },
  { icon: ClipboardList, label: 'Vagtoverlev.', route: '/handover-workspace', badge: 2 },
  { icon: Users, label: 'Beboere', route: '/resident-360-view', badge: 0 },
  { icon: Bell, label: 'Advarsler', route: '/care-portal-dashboard', badge: 3 },
  { icon: Calendar, label: 'Planlægger', route: '/care-portal-dashboard', badge: 0 },
  { icon: BookOpen, label: 'Journal', route: '/care-portal-dashboard', badge: 0 },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="fixed left-0 top-12 bottom-0 z-40 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? 64 : 200,
        backgroundColor: '#0F1B2D',
      }}
    >
      <div className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {navItems?.map(item => {
          const active = pathname === item?.route;
          return (
            <Link key={`nav-${item?.route}-${item?.label}`} href={item?.route}>
              <div
                className={`flex items-center gap-3 mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  active
                    ? 'bg-[#1D9E75]/20 text-[#1D9E75]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium flex-1 truncate">{item?.label}</span>
                )}
                {!collapsed && item?.badge > 0 && (
                  <span className="bg-[#EF4444] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {item?.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">SK</div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">Sara K.</div>
              <div className="text-gray-500 text-xs truncate">Dagvagt</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mx-1">
          <button className="text-gray-500 hover:text-gray-300 p-1 rounded transition-colors">
            <LogOut size={16} />
          </button>
          {!collapsed && (
            <button className="text-gray-500 hover:text-gray-300 p-1 rounded transition-colors">
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-[#0F1B2D] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}