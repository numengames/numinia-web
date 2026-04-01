'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Download, Link2, Share2, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface AssetActionsProps {
  name: string;
  assetUrl: string | null;
  pageUrl: string;
}

export function AssetActions({ name, assetUrl, pageUrl }: AssetActionsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const copyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    setOpen(false);
  };

  const shareOnX = () => {
    const text = encodeURIComponent(`Check out "${name}" on Numinia Digital Goods`);
    const url = encodeURIComponent(pageUrl);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    setOpen(false);
  };

  const items = [
    ...(assetUrl ? [{ label: t('avatar.actions.viewOriginal') as string, icon: ExternalLink, action: () => { window.open(assetUrl, '_blank'); setOpen(false); } }] : []),
    ...(assetUrl ? [{ label: t('avatar.actions.download') as string, icon: Download, action: () => { const a = document.createElement('a'); a.href = assetUrl; a.download = ''; a.click(); setOpen(false); } }] : []),
    { label: t('avatar.actions.copyLink') as string, icon: Link2, action: copyLink },
    { label: t('avatar.actions.shareOnX') as string, icon: Share2, action: shareOnX },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-full transition-all text-white/80 hover:text-white hover:bg-black/20"
        title={t('avatar.actions.tooltip') as string}
      >
        <MoreHorizontal className="h-4 w-4 drop-shadow-md" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={(e) => { e.stopPropagation(); item.action(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-gray-400" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
