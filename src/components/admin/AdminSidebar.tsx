'use client';

import { useState } from 'react';
import { Package, Upload, BarChart3, Settings, Bell, LogOut, ChevronLeft, ChevronRight, Diamond, Globe } from 'lucide-react';
import { LATEST_VERSION, CHANGELOG_DATA } from '@/components/admin/Changelog';

export type AdminView = 'assets' | 'upload' | 'archive' | 'portals' | 'digital-goods' | 'stats' | 'settings' | 'updates';

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  walletAddress?: string;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: AdminView; label: string; icon: typeof Package }[] = [
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'archive', label: 'Archive', icon: Package },
  { id: 'portals', label: 'Portals', icon: Globe },
  { id: 'digital-goods', label: 'Digital Goods', icon: Diamond },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'updates', label: 'Updates', icon: Bell },
];

export function AdminSidebar({ activeView, onViewChange, walletAddress, onSignOut }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 640;
    return true;
  });

  // Notification badge: count versions newer than last seen
  const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('admin-last-seen-version') : null;
  const unseenCount = lastSeen
    ? CHANGELOG_DATA.findIndex(e => e.version === lastSeen)
    : CHANGELOG_DATA.length; // never visited = all are unseen
  const badgeCount = unseenCount > 0 ? unseenCount : 0;

  const handleViewChange = (view: AdminView) => {
    onViewChange(view);
    if (view === 'updates') {
      localStorage.setItem('admin-last-seen-version', LATEST_VERSION);
    }
  };

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
        /* Mobile: fixed overlay when open, hidden when collapsed */
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
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const showBadge = item.id === 'updates' && badgeCount > 0 && !isActive;
          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {showBadge && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {badgeCount}
                </span>
              )}
              {showBadge && collapsed && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-2 h-2" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Wallet / Sign out */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        {walletAddress && !collapsed && (
          <div className="text-[11px] text-gray-400 font-mono mb-2 truncate px-1">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
