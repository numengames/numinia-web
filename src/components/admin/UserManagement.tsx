'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, ShieldOff, Crown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/admin/users/RankBadge';
import { BanDialog } from '@/components/admin/users/BanDialog';
import { RankChangeDialog } from '@/components/admin/users/RankChangeDialog';
import { useI18n } from '@/lib/i18n';
import type { Rank } from '@/types/rank';
import { RANK_HIERARCHY } from '@/types/rank';

interface UserRow {
  id: string;
  username: string;
  role: string;
  rank: Rank;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserManagementProps {
  sessionRank?: Rank;
}

export function UserManagement({ sessionRank = 'archon' }: UserManagementProps) {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRank, setFilterRank] = useState<string>('all');

  // Dialog state
  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [rankTarget, setRankTarget] = useState<UserRow | null>(null);

  const isOracle = sessionRank === 'oracle';

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  function handleUnban(userId: string) {
    // Find the user's ban and remove it — simplified for now
    // In full implementation, would call DELETE /api/admin/moderation/ban with banId
    fetchUsers();
  }

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const matchesRank = filterRank === 'all' || u.rank === filterRank;
    return matchesSearch && matchesRank;
  });

  const bannedCount = users.filter(u => u.banned).length;
  const rankCounts = RANK_HIERARCHY.reduce((acc, r) => {
    acc[r] = users.filter(u => u.rank === r).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('admin.users.title') || 'Users'}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label={(t('admin.users.total') as string) || 'Total'} value={String(users.length)} />
        <StatCard label={(t('admin.users.banned') as string) || 'Banned'} value={String(bannedCount)} variant={bannedCount > 0 ? 'danger' : 'default'} />
        <StatCard label="Oracle" value={String(rankCounts.oracle ?? 0)} />
        <StatCard label="Archon" value={String(rankCounts.archon ?? 0)} />
        <StatCard label="Vernacular" value={String(rankCounts.vernacular ?? 0)} />
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.users.search') as string || 'Search by username or ID...'}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
        />
        <select
          value={filterRank}
          onChange={e => setFilterRank(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All ranks</option>
          {RANK_HIERARCHY.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(user => (
                <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</span>
                      <span className="block text-[10px] font-mono text-gray-400 truncate max-w-[180px]">{user.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RankBadge rank={user.rank} />
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                        <ShieldOff className="h-3 w-3" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Shield className="h-3 w-3" /> Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!user.banned && user.rank !== 'oracle' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBanTarget(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                        >
                          Ban
                        </Button>
                      ) : user.banned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnban(user.id)}
                          className="text-green-600 hover:text-green-700 text-xs"
                        >
                          Unban
                        </Button>
                      ) : null}
                      {isOracle && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRankTarget(user)}
                          className="text-xs"
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          Rank
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      {banTarget && (
        <BanDialog
          open={!!banTarget}
          onClose={() => setBanTarget(null)}
          identifier={banTarget.id}
          identifierType="github"
          onBanned={fetchUsers}
        />
      )}
      {rankTarget && (
        <RankChangeDialog
          open={!!rankTarget}
          onClose={() => setRankTarget(null)}
          userId={rankTarget.id}
          username={rankTarget.username}
          currentRank={rankTarget.rank}
          onChanged={fetchUsers}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'danger' }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className={`text-2xl font-bold ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
