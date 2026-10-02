import React, { useState } from 'react';
import { 
  Sparkles, AlertTriangle, TrendingUp, CheckCircle2, ChevronRight,
  ShieldAlert, Clock, ArrowRight, Info, BarChart3, HelpCircle
} from 'lucide-react';
import { computePersonalizedPantry } from '../../services/personalizedPantryService';

export function PersonalizedPantrySection({ items = [], wasteRecords = [], userProfile = null, onItemClick }) {
  const [activeTab, setActiveTab] = useState('use_soon'); // 'use_soon', 'waste_risk', 'stats'

  const insights = computePersonalizedPantry({
    pantryItems: items,
    wasteRecords,
    userProfile
  });

  const { useSoonList, frequentlyWasted, consumptionPattern, pantrySummary } = insights;

  return (
    <div className="mb-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none p-5 sm:p-6 space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/20">
            🧠
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Personalized AI Pantry Engine
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
              Smart Attention & Consumption Intelligence
            </h2>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('use_soon')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'use_soon'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Use Soon ({useSoonList.length})
          </button>
          <button
            onClick={() => setActiveTab('waste_risk')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'waste_risk'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Waste Prediction
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'stats'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Habit Patterns
          </button>
        </div>
      </div>

      {/* Pantry Narrative Summary */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 dark:from-slate-850 dark:via-emerald-950/20 dark:to-slate-850 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">
            Pantry Summary
          </span>
          <div className="font-bold text-slate-900 dark:text-white text-sm">
            {pantrySummary.narrative.join(' ')}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-center px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] uppercase text-slate-400 font-bold block">Expiring Soon</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400">
              {pantrySummary.approachingExpiryCount}
            </span>
          </div>
          {pantrySummary.approachingInWastedCategory > 0 && (
            <div className="text-center px-3 py-1 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900">
              <span className="text-[9px] uppercase text-rose-600 dark:text-rose-400 font-bold block">Waste Risk Match</span>
              <span className="text-base font-black text-rose-700 dark:text-rose-300">
                {pantrySummary.approachingInWastedCategory}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: USE SOON QUEUE */}
      {activeTab === 'use_soon' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Prioritized by ML Urgency and Consumption Velocity</span>
            <span>{useSoonList.length} items require prompt attention</span>
          </div>

          {useSoonList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {useSoonList.map(item => (
                <div
                  key={item.id}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                          {item.category}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.attentionLevel === 'URGENT' 
                            ? 'bg-rose-600 text-white' 
                            : item.attentionLevel === 'HIGH'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {item.attentionLevel}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {item.daysRemaining <= 0 ? 'Expired' : `${item.daysRemaining}d left`}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Waste: {Math.round(item.mlPrediction.waste_probability * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Why this item needs attention */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-[10px] uppercase text-indigo-600 dark:text-indigo-400 block">
                        Why this item needs attention:
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {item.whyAttentionNeeded}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              No items currently require urgent attention. All tracked products have comfortable shelf life.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI FOOD WASTE PREDICTION */}
      {activeTab === 'waste_risk' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block">Food Safety Status vs Waste Probability:</strong>
              <span>
                "SAFE + HIGH WASTE RISK" does not mean unsafe. It means the product is currently completely safe to consume, but our model predicts high probability of being unused before its expiration date.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.allEnrichedItems
              .filter(i => i.wasteRiskLevel === 'CRITICAL' || i.wasteRiskLevel === 'HIGH' || i.wasteRiskLevel === 'MODERATE')
              .map(item => (
                <div
                  key={item.id}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {item.foodSafetyStatus}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        item.wasteRiskLevel === 'CRITICAL'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {item.wasteRiskLevel} RISK
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {item.mlPrediction.recommended_action}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {item.mlPrediction.factors_used.map((factor, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        • {factor}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: HABIT PATTERNS & STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Products You Frequently Waste */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                Products You Frequently Waste
              </span>
              {frequentlyWasted.hasData ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {frequentlyWasted.message}
                  </p>
                  <div className="space-y-1 pt-1">
                    {frequentlyWasted.categories.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300">{c.category}</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">{c.count} wasted ({c.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {frequentlyWasted.message}
                </p>
              )}
            </div>

            {/* Consumption Pattern */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                Consumption Pattern & Waste Rate
              </span>
              {consumptionPattern.hasData ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Waste Prevention Rate</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{consumptionPattern.wastePreventionRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${consumptionPattern.wastePreventionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                    {consumptionPattern.summaryText}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {consumptionPattern.message}
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
