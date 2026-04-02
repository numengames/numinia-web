'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Lock, CheckCircle2, Flame, Clock, Timer, Star, ExternalLink, Loader2 } from 'lucide-react';
import type { Season, Adventure, UserSeasonStatus, PuzzleType } from '@/types/season';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useCountdown(endDate: string) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function calc() {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      if (days > 0) setRemaining(`${days}d ${hours}h`);
      else {
        const mins = Math.floor((diff % 3_600_000) / 60_000);
        setRemaining(`${hours}h ${mins}m`);
      }
    }
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [endDate]);

  return remaining;
}

const PUZZLE_LABELS: Record<PuzzleType, { en: string; ja: string; color: string }> = {
  hieroglyph:    { en: 'Hieroglyph',    ja: 'ヒエログリフ',   color: 'text-amber-400' },
  logic:         { en: 'Logic',         ja: 'ロジック',       color: 'text-blue-400' },
  brain_puzzle:  { en: 'Brain Puzzle',  ja: '脳パズル',       color: 'text-pink-400' },
  visual_acuity: { en: 'Visual Acuity', ja: '視覚',          color: 'text-cyan-400' },
  escape_room:   { en: 'Escape Room',   ja: '脱出ゲーム',     color: 'text-red-400' },
  maze:          { en: 'Maze',          ja: '迷路',          color: 'text-green-400' },
  easter_egg:    { en: 'Easter Egg',    ja: 'イースターエッグ', color: 'text-yellow-400' },
  mixed:         { en: 'Mixed',         ja: 'ミックス',       color: 'text-purple-400' },
};

function DifficultyStars({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-2.5 h-2.5 ${i < level ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Adventure tooltip (hover card)
// ---------------------------------------------------------------------------

function AdventureTooltip({
  adv,
  locale,
  visible,
}: {
  adv: Adventure;
  locale: string;
  visible: boolean;
}) {
  if (!visible) return null;
  const puzzle = PUZZLE_LABELS[adv.puzzleType] ?? PUZZLE_LABELS.mixed;

  return (
    <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl pointer-events-none">
      <p className="text-xs font-medium text-gray-100 mb-1">
        {adv.name[locale] ?? adv.name.en}
      </p>
      <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
        {adv.description[locale] ?? adv.description.en}
      </p>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-0.5">
          <Timer className="w-2.5 h-2.5" /> {adv.durationMinutes}min
        </span>
        <DifficultyStars level={adv.difficulty} />
        <span className={puzzle.color}>{puzzle[locale as 'en' | 'ja'] ?? puzzle.en}</span>
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-700" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SeasonTimeline() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.startsWith('/ja') ? 'ja' : 'en';

  const [season, setSeason] = useState<Season | null>(null);
  const [userProgress, setUserProgress] = useState<UserSeasonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [hoveredAdv, setHoveredAdv] = useState<string | null>(null);

  // Admin state
  const [adminWallet, setAdminWallet] = useState('');
  const [adminUpdating, setAdminUpdating] = useState<string | null>(null);

  const fetchSeason = useCallback(async () => {
    try {
      const res = await fetch('/api/seasons');
      const data = await res.json();
      setSeason(data.season);
      setUserProgress(data.userProgress);
    } catch (err) {
      console.error('Failed to fetch season:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSeason(); }, [fetchSeason]);

  // Handle ?purchase=success redirect from Stripe — poll until pass is confirmed
  const pollRef = useRef(false);

  useEffect(() => {
    if (searchParams.get('purchase') !== 'success') return;
    setPurchaseSuccess(true);
    pollRef.current = true;

    let attempt = 0;
    const maxAttempts = 5;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (!pollRef.current || attempt >= maxAttempts) return;
      attempt++;
      try {
        const res = await fetch('/api/seasons');
        const data = await res.json();
        setSeason(data.season);
        setUserProgress(data.userProgress);
        if (data.userProgress?.hasPass) {
          pollRef.current = false;
          return;
        }
      } catch { /* retry next cycle */ }
      timer = setTimeout(poll, 2000);
    };

    timer = setTimeout(poll, 2000);
    return () => { pollRef.current = false; clearTimeout(timer); };
  }, [searchParams]);

  const countdown = useCountdown(season?.endDate ?? '');
  const hasPass = userProgress?.hasPass ?? false;
  const completedSet = new Set(userProgress?.completedAdventures ?? []);

  // ---- Handlers ----

  async function handleBuyPass() {
    setPurchasing(true);
    try {
      const res = await fetch('/api/seasons/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch {
      alert('Failed to start checkout');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleAdminProgress(adventureId: string) {
    if (!adminWallet || !season) return;
    setAdminUpdating(adventureId);
    try {
      await fetch('/api/seasons/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: season.id,
          address: adminWallet,
          adventureId,
        }),
      });
      await fetchSeason();
    } catch (err) {
      console.error('Admin progress update failed:', err);
    } finally {
      setAdminUpdating(null);
    }
  }

  // ---- Loading / empty states ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-gray-500 border-t-amber-500 rounded-full" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
        <Flame className="w-8 h-8 opacity-40" />
        <p className="text-sm">
          {locale === 'ja' ? 'アクティブなシーズンはありません' : 'No active season'}
        </p>
      </div>
    );
  }

  const adventures = [...season.adventures].sort((a, b) => a.order - b.order);

  // ---- Render ----

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px] mx-auto">
      {/* Purchase success banner — adapts to actual pass state */}
      {purchaseSuccess && (
        <div className={`border rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
          hasPass
            ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300'
            : 'bg-amber-900/40 border-amber-700/50 text-amber-300'
        }`}>
          {hasPass ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {locale === 'ja'
                ? '購入完了！シーズンパスが有効になりました。'
                : 'Purchase complete! Your season pass is now active.'}
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              {locale === 'ja'
                ? '購入処理中...パスを確認しています。'
                : 'Processing purchase... verifying your pass.'}
            </>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* HEADER                                                        */}
      {/* ============================================================= */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[2px] text-gray-500 uppercase">
              numinia.store &middot; LAP
            </p>
            <h1 className="text-lg sm:text-xl font-medium text-gray-100 mt-1">
              {season.title[locale] ?? season.title.en}
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-lg">
              {season.description[locale] ?? season.description.en}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {countdown}
            </span>
            {hasPass ? (
              <span className="bg-emerald-900/60 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-lg">
                {locale === 'ja' ? 'パス有効 ✓' : 'Pass active ✓'}
              </span>
            ) : (
              <button
                onClick={handleBuyPass}
                disabled={purchasing}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {purchasing
                  ? '...'
                  : locale === 'ja'
                    ? `パスを購入 · ${season.passPriceEur}€`
                    : `Buy pass · ${season.passPriceEur.toFixed(2)}€`}
              </button>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              hasPass
                ? 'bg-emerald-900/50 text-emerald-400'
                : 'bg-amber-900/50 text-amber-400'
            }`}
          >
            {hasPass
              ? locale === 'ja' ? 'パス有効' : 'Pass active'
              : locale === 'ja' ? 'パスなし' : 'No pass'}
          </span>
          <span className="text-xs text-gray-500">
            {locale === 'ja' ? '進捗' : 'Progress'}: <strong className="text-gray-300">{completedSet.size}</strong>/{adventures.length}
          </span>
        </div>
      </div>

      {/* ============================================================= */}
      {/* TIMELINE                                                      */}
      {/* ============================================================= */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Free loot row */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${adventures.length}, 1fr)` }}>
            {adventures.map((adv) => {
              const done = completedSet.has(adv.id);
              return (
                <div key={`free-${adv.id}`} className="flex flex-col items-center">
                  <div
                    className={`w-16 h-16 rounded-lg border flex items-center justify-center text-center p-1 transition-colors ${
                      done
                        ? 'border-purple-500/60 bg-purple-950/40'
                        : 'border-gray-700/50 bg-gray-800/40'
                    }`}
                  >
                    <span className={`text-[10px] leading-tight ${done ? 'text-purple-300' : 'text-gray-500'}`}>
                      {adv.freeLoot.name[locale] ?? adv.freeLoot.name.en}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-1">
                    {locale === 'ja' ? '無料' : 'free'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Adventure nodes + connecting line */}
          <div className="relative mt-6 mb-6" style={{ height: '100px' }}>
            {/* The veil line (SVG) */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {adventures.map((_, i) => {
                if (i >= adventures.length - 1) return null;
                const x1 = ((i + 0.5) / adventures.length) * 100 + 2;
                const x2 = ((i + 1.5) / adventures.length) * 100 - 2;
                const bothDone =
                  completedSet.has(adventures[i].id) &&
                  completedSet.has(adventures[i + 1].id);
                return (
                  <line
                    key={`line-${i}`}
                    x1={`${x1}%`}
                    y1="40%"
                    x2={`${x2}%`}
                    y2="40%"
                    stroke={bothDone ? '#7c3aed' : '#374151'}
                    strokeWidth="2"
                    strokeDasharray={bothDone ? 'none' : '6 4'}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            <div
              className="relative grid h-full"
              style={{ gridTemplateColumns: `repeat(${adventures.length}, 1fr)` }}
            >
              {adventures.map((adv) => {
                const done = completedSet.has(adv.id);
                const isLocked = adv.requiresPass && !hasPass;
                const puzzle = PUZZLE_LABELS[adv.puzzleType] ?? PUZZLE_LABELS.mixed;

                return (
                  <div
                    key={`node-${adv.id}`}
                    className="flex flex-col items-center relative"
                    style={{ paddingTop: '12px' }}
                    onMouseEnter={() => setHoveredAdv(adv.id)}
                    onMouseLeave={() => setHoveredAdv(null)}
                  >
                    {/* Tooltip */}
                    <AdventureTooltip
                      adv={adv}
                      locale={locale}
                      visible={hoveredAdv === adv.id}
                    />

                    {/* Node circle */}
                    <button
                      onClick={() => {
                        if (!isLocked && adv.url) window.open(adv.url, '_blank');
                      }}
                      disabled={isLocked}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all hover:scale-110 ${
                        done
                          ? 'border-purple-500 bg-purple-600 text-white'
                          : isLocked
                            ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'border-gray-600 bg-gray-900 text-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : done ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        adv.order
                      )}
                    </button>

                    {/* Name */}
                    <span className="text-[11px] font-medium text-gray-200 mt-1">
                      {adv.name[locale] ?? adv.name.en}
                    </span>

                    {/* Meta line: duration + puzzle type */}
                    <span className={`text-[9px] mt-0.5 ${puzzle.color}`}>
                      {adv.durationMinutes}min &middot; {puzzle[locale as 'en' | 'ja'] ?? puzzle.en}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium loot row */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${adventures.length}, 1fr)` }}>
            {adventures.map((adv) => {
              const done = completedSet.has(adv.id);
              const premActive = hasPass && done;
              return (
                <div key={`prem-${adv.id}`} className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-600 mb-1">
                    {hasPass
                      ? locale === 'ja' ? 'パス' : 'pass'
                      : locale === 'ja' ? 'パス限定' : 'pass only'}
                  </span>
                  <div
                    className={`w-16 h-16 rounded-lg border flex items-center justify-center text-center p-1 transition-colors ${
                      premActive
                        ? 'border-emerald-500/60 bg-emerald-950/40'
                        : 'border-gray-700/30 bg-gray-800/20 opacity-50'
                    }`}
                  >
                    <span
                      className={`text-[10px] leading-tight ${
                        premActive ? 'text-emerald-300' : 'text-gray-600'
                      }`}
                    >
                      {adv.premiumLoot.name[locale] ?? adv.premiumLoot.name.en}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* BURN RITUAL                                                    */}
      {/* ============================================================= */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-amber-900/40 flex items-center justify-center shrink-0">
          <Flame className="w-7 h-7 text-amber-500" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm font-medium text-gray-200">
            {locale === 'ja'
              ? '最終報酬 — 焼却の儀式'
              : 'Final reward — Burn ritual'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {season.burnRitual.reward.description[locale] ?? season.burnRitual.reward.description.en}
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center bg-gray-800/50">
            <span className="text-[10px] text-gray-500">
              NFT<br />
              {locale === 'ja' ? '限定' : 'exclusive'}
            </span>
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            {completedSet.size}/{season.burnRitual.requiredItems} req.
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* ADMIN PANEL                                                    */}
      {/* ============================================================= */}
      <AdminProgressPanel
        season={season}
        adventures={adventures}
        adminWallet={adminWallet}
        onWalletChange={setAdminWallet}
        onMarkComplete={handleAdminProgress}
        updatingId={adminUpdating}
        locale={locale}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin sub-component
// ---------------------------------------------------------------------------

function AdminProgressPanel({
  season,
  adventures,
  adminWallet,
  onWalletChange,
  onMarkComplete,
  updatingId,
  locale,
}: {
  season: Season;
  adventures: Adventure[];
  adminWallet: string;
  onWalletChange: (v: string) => void;
  onMarkComplete: (adventureId: string) => void;
  updatingId: string | null;
  locale: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(document.cookie.includes('tw_jwt'));
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="bg-gray-900/80 border border-amber-900/30 rounded-xl p-4 sm:p-5 space-y-3">
      <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">
        Admin — {locale === 'ja' ? '進捗管理' : 'Progress Management'}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="0x..."
          value={adminWallet}
          onChange={(e) => onWalletChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-600"
        />
      </div>

      {adminWallet && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {adventures.map((adv) => (
            <button
              key={adv.id}
              onClick={() => onMarkComplete(adv.id)}
              disabled={updatingId === adv.id}
              className="text-[10px] bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 rounded-lg py-2 px-1 text-gray-300 transition-colors flex flex-col items-center gap-0.5"
              title={adv.name[locale] ?? adv.name.en}
            >
              <span>{updatingId === adv.id ? '...' : `✓ ${adv.order}`}</span>
              <span className="text-gray-500 truncate w-full text-center">
                {(adv.name[locale] ?? adv.name.en).slice(0, 8)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
