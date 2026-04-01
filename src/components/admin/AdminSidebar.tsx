'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, BarChart3, Settings, Bell, LogOut, ChevronLeft, ChevronRight, Globe, Swords, Archive, User, BookOpen, Flame } from 'lucide-react';
import { LATEST_VERSION, CHANGELOG_DATA } from '@/components/admin/Changelog';
import { useI18n } from '@/lib/i18n';

/** The slug used in /en/LAP/{section} routes. */
export type LAPSection = 'assets' | 'upload' | 'character' | 'portals' | 'loot' | 'seasons' | 'codex' | 'stats' | 'settings' | 'updates';

// Keep the old name as alias so nothing else breaks during migration.
export type AdminView = LAPSection;

interface AdminSidebarProps {
  walletAddress?: string;
  onSignOut: () => void;
}

type NavItem = { id: LAPSection | 'archive'; icon: typeof Package };

const MAIN_NAV: NavItem[] = [
  { id: 'character', icon: User },
  { id: 'portals', icon: Globe },
  { id: 'loot', icon: Swords },
  { id: 'seasons', icon: Flame },
  { id: 'codex', icon: BookOpen },
  { id: 'assets', icon: Package },
  { id: 'archive', icon: Archive },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'updates', icon: Bell },
  { id: 'stats', icon: BarChart3 },
  { id: 'settings', icon: Settings },
];

/** Derive the active section from the current pathname. */
function useActiveSection(): LAPSection {
  const pathname = usePathname();
  // pathname = /en/LAP/codex  →  segment = "codex"
  const segments = pathname.split('/');
  const lapIdx = segments.findIndex((s) => s === 'LAP');
  const section = segments[lapIdx + 1] as LAPSection | undefined;
  return section || 'character';
}

export function AdminSidebar({ walletAddress, onSignOut }: AdminSidebarProps) {
  const activeSection = useActiveSection();
  const pathname = usePathname();
  const { locale, t } = useI18n();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 640;
    return true;
  });

  // Notification badge: count versions newer than last seen
  const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('admin-last-seen-version') : null;
  const unseenCount = lastSeen
    ? CHANGELOG_DATA.findIndex(e => e.version === lastSeen)
    : CHANGELOG_DATA.length;
  const badgeCount = unseenCount > 0 ? unseenCount : 0;

  /** Build the href for a LAP section or a top-level page */
  const sectionHref = (id: string) => id === 'archive' ? `/${locale}/archive` : `/${locale}/LAP/${id}`;

  return (
    <>
    {/* Mobile hamburger button */}
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="fixed top-3 left-3 z-50 p-2 bg-cream dark:bg-cream-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm sm:hidden"
      title="Menu"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
    </button>

    {/* Mobile overlay backdrop */}
    {!collapsed && (
      <div className="fixed inset-0 bg-black/30 z-30 sm:hidden" onClick={() => setCollapsed(true)} />
    )}

    <aside
      className={`h-screen flex flex-col border-r border-gray-200 dark:border-gray-800 bg-cream dark:bg-cream-dark transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      } ${
        collapsed ? 'hidden sm:flex sm:sticky sm:top-0' : 'fixed sm:sticky sm:relative top-0 left-0 z-40 sm:z-auto'
      }`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img src="/icon-khepri.svg" alt="Numinia" className="h-[18px] w-[18px]" />
            <img src="/logo-numinia.svg" alt="Numinia" className="h-4 w-auto" />
          </div>
        ) : (
          <img src="/icon-khepri.svg" alt="Numinia" className="h-[18px] w-[18px]" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title={collapsed ? t('admin.sidebar.expand') as string : t('admin.sidebar.collapse') as string}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {MAIN_NAV.map((item) => {
          const Icon = item.icon;
          const href = sectionHref(item.id);
          const isActive = item.id === activeSection;

          return (
            <Link
              key={item.id}
              href={href}
              onClick={() => {
                // Mark updates as seen
                if (item.id === 'updates') localStorage.setItem('admin-last-seen-version', LATEST_VERSION);
                // Collapse mobile sidebar on nav
                if (window.innerWidth < 640) setCollapsed(true);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={collapsed ? t(`admin.nav.${item.id}`) as string : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(`admin.nav.${item.id}`)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav + wallet */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <nav className="px-2 py-2 space-y-0.5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;
            const showBadge = item.id === 'updates' && badgeCount > 0 && !isActive;
            return (
              <Link
                key={item.id}
                href={sectionHref(item.id)}
                onClick={() => {
                  if (item.id === 'updates') localStorage.setItem('admin-last-seen-version', LATEST_VERSION);
                  if (window.innerWidth < 640) setCollapsed(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={collapsed ? t(`admin.nav.${item.id}`) as string : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{t(`admin.nav.${item.id}`)}</span>}
                {showBadge && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badgeCount}
                  </span>
                )}
                {showBadge && collapsed && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-2 h-2" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          {walletAddress && !collapsed && (
            <div className="text-[11px] text-gray-400 font-mono mb-2 truncate px-1">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          )}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            title={t('admin.sidebar.signOutTitle') as string}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t('admin.sidebar.signOut')}</span>}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
