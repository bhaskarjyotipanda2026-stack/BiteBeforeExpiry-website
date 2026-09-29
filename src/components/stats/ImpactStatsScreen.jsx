import React, { useMemo } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, CheckCircle2, Trash2, 
  Flame, Award, ShieldAlert, Sparkles, ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ImpactStatsScreen() {
  const { stats, items, settings } = useApp();

  // Metrics
  const totalTracked = stats.itemsTracked || items.length;
  const usedCount = stats.itemsUsedBeforeExpiry || 0;
  const wastedCount = stats.itemsWasted || 0;
  const moneySaved = stats.estimatedMoneySaved || 0;
  const currentStreak = stats.currentStreak || 1;
  const longestStreak = stats.longestStreak || 1;

  // Waste Prevention Rate
  const totalDecided = usedCount + wastedCount;
  const saveRate = totalDecided > 0 ? Math.round((usedCount / totalDecided) * 100) : 85;

  // Mock monthly trend data for waste vs saved
  const trendData = [
    { month: 'Apr', used: 6, wasted: 3 },
    { month: 'May', used: 9, wasted: 2 },
    { month: 'Jun', used: 12, wasted: 4 },
    { month: 'Jul', used: 15, wasted: 2 },
    { month: 'Aug', used: 18, wasted: 3 },
    { month: 'Sep', used: usedCount || 21, wasted: wastedCount || 2 },
  ];

  const maxVal = Math.max(...trendData.map(d => Math.max(d.used, d.wasted)), 15);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <BarChart3 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          <span>Sustainability & Waste Impact Stats</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Measurable environmental and financial impact of keeping items out of the trash.
        </p>
      </div>

      {/* Primary KPI Metrics Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        
        {/* Metric 1: Items Tracked */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Items Tracked
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {totalTracked}
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5" /> Pantry Safe
          </span>
        </div>

        {/* Metric 2: Used Before Expiry */}
        <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Used in Time
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-200 mt-2">
            {usedCount}
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            🌱 Zero Waste
          </span>
        </div>

        {/* Metric 3: Items Wasted */}
        <div className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            Items Wasted
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-200 mt-2">
            {wastedCount}
          </div>
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
            {saveRate}% Prevention Rate
          </span>
        </div>

        {/* Metric 4: Estimated Money Saved */}
        <div className="p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            Money Saved
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-200 mt-2">
            {settings.currencySymbol}{moneySaved}
          </div>
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1">
            💰 Preserved Budget
          </span>
        </div>

        {/* Metric 5: Current Streak */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Active Streak
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 flex items-center space-x-1">
            <span>{currentStreak}</span>
            <span className="text-sm font-bold text-orange-500">🔥</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Days Active
          </span>
        </div>

        {/* Metric 6: Longest Streak */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Longest Streak
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {longestStreak}
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Days Record
          </span>
        </div>

      </div>

      {/* Main Impact Visualizations: Trend Chart & Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Chart Column (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Pantry Consumption vs Waste Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly breakdown of items consumed safely before expiry versus discarded items.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-3 text-xs font-bold">
              <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                <span>Used in Time</span>
              </div>
              <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-3 h-3 rounded-md bg-rose-400 inline-block" />
                <span>Wasted</span>
              </div>
            </div>
          </div>

          {/* Responsive SVG Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-3 pt-8 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {trendData.map((d, index) => {
              const usedHeightPercent = Math.max(10, Math.round((d.used / maxVal) * 100));
              const wasteHeightPercent = Math.max(5, Math.round((d.wasted / maxVal) * 100));

              return (
                <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full max-w-[48px] flex items-end justify-center space-x-1.5 h-full">
                    {/* Used Bar */}
                    <div 
                      className="w-1/2 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110 relative"
                      style={{ height: `${usedHeightPercent}%` }}
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition-opacity">
                        {d.used}
                      </span>
                    </div>

                    {/* Wasted Bar */}
                    <div 
                      className="w-1/2 bg-gradient-to-t from-rose-500 to-rose-300 rounded-t-lg transition-all duration-500 group-hover:brightness-110 relative"
                      style={{ height: `${wasteHeightPercent}%` }}
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition-opacity">
                        {d.wasted}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>Scale: Units cataloged per month</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Trend: Waste decreasing by 34%</span>
          </div>
        </div>

        {/* Ratio & Ecological Impact Card (1 Col) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Zero Waste Quotient
            </span>
            <h3 className="text-2xl font-black mt-1">
              {saveRate}% Success Rate
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              You prevent over 8 out of every 10 expiring items from ending in the trash!
            </p>

            {/* Visual Circular Gauge / Bar */}
            <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span>Safe Consumption</span>
                <span className="text-emerald-300">{saveRate}%</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full"
                  style={{ width: `${saveRate}%` }}
                />
              </div>
            </div>

            {/* Environmental Savings */}
            <div className="mt-6 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <span>🌍</span>
                <span>Avoided approx. <strong className="text-white">12.4 kg</strong> CO₂ footprint</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>💧</span>
                <span>Conserved approx. <strong className="text-white">3,800 Litres</strong> virtual water</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>💊</span>
                <span>Zero improper pharmaceutical sink flushing</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 text-[11px] text-slate-400">
            Stats auto-update upon marking items as Used or Wasted.
          </div>
        </div>

      </div>

    </div>
  );
}
