import React from 'react';
import { 
  Flame, Award, ShieldCheck, Trophy, Lock, CheckCircle2, 
  Sparkles, Calendar, Zap, AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BADGES_DEFINITION } from '../../constants';
import { triggerCelebration } from '../../services/streakService';

export function StreaksScreen() {
  const { stats, items } = useApp();

  const earnedBadgeIds = new Set(stats.badgesEarned || []);

  // Find next unearned badge for progress indicator
  const nextBadge = BADGES_DEFINITION.find(b => !earnedBadgeIds.has(b.id));

  const today = new Date().toISOString().split('T')[0];
  const scannedToday = stats.lastScanDate === today;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Title */}
      <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
          <span>🔥 Daily Waste Vigilance</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Streaks & Milestones
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Scan at least one grocery or medicine daily to maintain your streak and unlock zero-waste achievements.
        </p>
      </div>

      {/* Hero Streak Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white p-6 sm:p-10 shadow-2xl shadow-orange-500/20 mb-8 sm:mb-10">
        
        {/* Decorative background effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Animated Flame Icon */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-5xl sm:text-6xl shadow-inner group">
              <span className="animate-bounce">🔥</span>
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-200">
                  Current Streak
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                  Active
                </span>
              </div>
              <div className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-1">
                {stats.currentStreak || 1} <span className="text-xl sm:text-2xl font-bold opacity-90">Days</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-sm">
                {scannedToday
                  ? '✨ You scanned today! Streak safe for 24 hours.'
                  : '⚠️ Scan an item today to keep your streak alive!'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center min-w-[120px]">
              <span className="text-xs font-bold text-amber-200 block">Longest Streak</span>
              <span className="text-2xl font-black text-white">{stats.longestStreak || 1} Days</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center min-w-[120px]">
              <span className="text-xs font-bold text-amber-200 block">Badges Earned</span>
              <span className="text-2xl font-black text-white">{earnedBadgeIds.size}</span>
            </div>
          </div>

        </div>

        {/* Progress bar towards next badge */}
        {nextBadge && (
          <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
            <div className="flex justify-between items-center text-xs font-bold text-amber-100 mb-2">
              <span className="flex items-center space-x-1.5">
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Next Milestone: <strong>{nextBadge.name}</strong></span>
              </span>
              <span>{nextBadge.current(stats, items)} / {nextBadge.target}</span>
            </div>
            <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5 backdrop-blur-xs">
              <div 
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-200 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (nextBadge.current(stats, items) / nextBadge.target) * 100)}%` }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Badges & Milestones Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Zero Waste Milestones ({earnedBadgeIds.size} / {BADGES_DEFINITION.length} Unlocked)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Earn badges by scanning, saving products before expiration, and preventing waste.
            </p>
          </div>

          <button
            onClick={() => triggerCelebration('badge')}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            🎉 Celebrate
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {BADGES_DEFINITION.map(badge => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const currentVal = badge.current(stats, items);
            const targetVal = badge.target;
            const progress = Math.min(100, Math.round((currentVal / targetVal) * 100));

            return (
              <div
                key={badge.id}
                className={`relative rounded-3xl p-5 border transition-all ${
                  isEarned
                    ? 'bg-white dark:bg-slate-900 border-amber-300/80 dark:border-amber-800/80 shadow-md shadow-amber-500/10 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-75'
                }`}
              >
                {/* Badge Icon */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${
                    isEarned
                      ? 'bg-gradient-to-tr from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800'
                      : 'bg-slate-200/80 dark:bg-slate-800 grayscale'
                  }`}>
                    {badge.icon}
                  </div>

                  {isEarned ? (
                    <span className="flex items-center space-x-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                {/* Badge Name & Description */}
                <h4 className={`font-extrabold text-sm ${isEarned ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {badge.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  {badge.description}
                </p>

                {/* Progress bar for locked badges */}
                {!isEarned && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>{currentVal} / {targetVal}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
