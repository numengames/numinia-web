'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RankBadge } from './RankBadge';
import { RANK_HIERARCHY, type Rank } from '@/types/rank';
import { useI18n } from '@/lib/i18n';

interface RankChangeDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  currentRank: Rank;
  onChanged: () => void;
}

export function RankChangeDialog({ open, onClose, userId, username, currentRank, onChanged }: RankChangeDialogProps) {
  const { t } = useI18n();
  const [selectedRank, setSelectedRank] = useState<Rank>(currentRank);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const csrfToken = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] ?? '';

  async function handleSubmit() {
    if (!reason.trim() || selectedRank === currentRank) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ rank: selectedRank, reason: reason.trim() }),
      });
      if (res.ok) {
        onChanged();
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
          <DialogTitle>{t('admin.users.changeRank') || 'Change Rank'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">User</label>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{username}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-2">Current rank</label>
            <RankBadge rank={currentRank} size="md" />
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-2">New rank</label>
            <div className="flex flex-wrap gap-2">
              {RANK_HIERARCHY.map(rank => (
                <button
                  key={rank}
                  onClick={() => setSelectedRank(rank)}
                  className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                    selectedRank === rank
                      ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <RankBadge rank={rank} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white resize-none"
              rows={2}
              placeholder="Reason for rank change..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !reason.trim() || selectedRank === currentRank}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
