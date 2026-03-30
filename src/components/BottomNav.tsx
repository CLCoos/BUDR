'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sun, LayoutList, BookOpen, Zap, User, Heart, Moon, Users, MoreHorizontal, Flower2 } from 'lucide-react';
import LysChatFab from '@/components/LysChatFab';

const primaryNavItems = [
  { key: 'nav-morning', label: 'Morgen', icon: Sun, path: '/morning-check-in' },
  { key: 'nav-structure', label: 'Dag', icon: LayoutList, path: '/daily-structure' },
  { key: 'nav-challenges', label: 'Udfordringer', icon: Zap, path: '/daily-challenges' },
  { key: 'nav-journal', label: 'Journal', icon: BookOpen, path: '/journal' },
  { key: 'nav-more', label: 'Mere', icon: MoreHorizontal, path: null },
];

const moreNavItems = [
  { key: 'nav-park', label: 'PARK', icon: Flower2, path: '/park' },
  { key: 'nav-social', label: 'Social', icon: Users, path: '/social' },
  { key: 'nav-hviledag', label: 'Hviledag', icon: Moon, path: '/hviledag' },
  { key: 'nav-krise', label: 'Krise & Støtte', icon: Heart, path: '/krise' },
  { key: 'nav-profile', label: 'Profil', icon: User, path: '/profile' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreNavItems.some((item) => item.path === pathname);

  const handleNavClick = (path: string | null, key: string) => {
    if (key === 'nav-more') {
      setShowMore(!showMore);
      return;
    }
    if (path) {
      setShowMore(false);
      router.push(path);
    }
  };

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-20 bg-midnight-950/60 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More drawer */}
      {showMore && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 max-w-lg mx-auto px-3">
          <div className="bg-midnight-800/98 backdrop-blur-xl border border-midnight-600/50 rounded-2xl p-3 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {moreNavItems.map((item) => {
                const isActive = pathname === item.path;
                const NavIcon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.path, item.key)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl transition-all duration-200 active:scale-95 ${
                      isActive ? 'bg-sunrise-400/15 border border-sunrise-400/30' : 'bg-midnight-700/50 border border-midnight-600/30 hover:bg-midnight-700'
                    }`}
                  >
                    <NavIcon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={isActive ? 'text-sunrise-400' : 'text-midnight-400'}
                    />
                    <span className={`text-sm font-medium ${isActive ? 'text-sunrise-400' : 'text-midnight-300'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-midnight-900/95 backdrop-blur-xl border-t border-midnight-700/50">
        <div className="max-w-lg mx-auto flex items-center justify-around px-1 pb-safe">
          {primaryNavItems?.map((item) => {
            const isActive = item.path ? pathname === item.path : (showMore || isMoreActive);
            const NavIcon = item.icon;
            return (
              <button
                key={item?.key}
                onClick={() => handleNavClick(item.path, item.key)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl transition-all duration-200 cursor-pointer min-h-[56px] min-w-[56px] flex-1 ${isActive ? 'text-sunrise-400' : 'text-midnight-400'}`}
                aria-label={item?.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-sunrise-400/15' : ''
                  }`}
                >
                  <NavIcon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? 'text-sunrise-400' : 'text-midnight-500'}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 leading-none truncate max-w-full ${
                    isActive ? 'text-sunrise-400' : 'text-midnight-500'
                  }`}
                >
                  {item?.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <LysChatFab />
    </>
  );
}