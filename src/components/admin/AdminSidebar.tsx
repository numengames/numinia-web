'use client';

import { useState } from 'react';
import { Package, Upload, BarChart3, Settings, Bell, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export type AdminView = 'assets' | 'upload' | 'stats' | 'settings' | 'updates';

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  walletAddress?: string;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: AdminView; label: string; icon: typeof Package }[] = [
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'updates', label: 'Updates', icon: Bell },
];

export function AdminSidebar({ activeView, onViewChange, walletAddress, onSignOut }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-cream dark:bg-cream-dark transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <img src="/logo-numinia.svg" alt="Numinia" className="h-5 w-auto" />
        )}
        {collapsed && (
          <img src="/logo-numinia.svg" alt="Numinia" className="h-5 w-5 object-contain object-left" />
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
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
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
  );
}
