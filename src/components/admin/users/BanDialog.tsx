'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface BanDialogProps {
  open: boolean;
  onClose: () => void;
  identifier: string;
  identifierType: 'wallet' | 'github';
  onBanned: () => void;
}

export function BanDialog({ open, onClose, identifier, identifierType, onBanned }: BanDialogProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [permanent, setPermanent] = useState(true);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const csrfToken = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] ?? '';

  async function handleSubmit() {
    if (!reason.trim()) return;
    setLoading(true);

    const expiresAt = permanent
      ? null
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetch('/api/admin/moderation/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ identifier, identifierType, reason: reason.trim(), expiresAt }),
      });
      if (res.ok) {
        onBanned();
        onClose();
        setReason('');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog onClick={onClose}>
      <DialogContent onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t('admin.users.ban') || 'Ban User'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">{t('admin.users.banTarget') || 'User'}</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white truncate">{identifier}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">{t('admin.users.banReason') || 'Reason'}</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white resize-none"
              rows={3}
              placeholder="Violation of community guidelines..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={permanent} onChange={e => setPermanent(e.target.checked)} className="rounded" />
              {t('admin.users.permanent') || 'Permanent'}
            </label>
            {!permanent && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason.trim()}>
              {loading ? 'Banning...' : 'Ban'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
