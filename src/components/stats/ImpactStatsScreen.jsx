import React, { useMemo } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, CheckCircle2, Trash2, 
  Flame, Award, ShieldAlert, Sparkles, ArrowUpRight, AlertTriangle,
  Clock, ShieldCheck, HeartPulse, PieChart, Activity, Info, Tag, Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { predictSmartAttention } from '../../ml/mlPipeline';

export function ImpactStatsScreen() {
  const { stats, items, wasteRecords = [], settings, getAttentionStatus, getItemUrgency, checkAllergies } = useApp();

  // Active pantry items (not marked used/wasted)
  const activeItems = useMemo(() => {
    return items.filter(i => i.status !== 'used' && i.status !== 'wasted' && i.status !== 'discarded');
  }, [items]);

  // 1. PANTRY OVERVIEW COUNTS
  const pantryOverview = useMemo(() => {
    let safeCount = 0;
    let useSoonCount = 0;
    let expiredCount = 0;
    let verifyDateCount = 0;

    activeItems.forEach(item => {
      const att = getAttentionStatus(item);
      if (att.status === 'SAFE') safeCount++;
      else if (att.status === 'USE SOON') useSoonCount++;
      else if (att.status === 'EXPIRED') expiredCount++;
      else if (att.status === 'VERIFY DATE') verifyDateCount++;
    });

    return {
      total: activeItems.length,
      safe: safeCount,
      useSoon: useSoonCount,
      expired: expiredCount,
      verifyDate: verifyDateCount
    };
  }, [activeItems, getAttentionStatus]);

  // 2. EXPIRY ANALYTICS
  const expiryAnalytics = useMemo(() => {
    if (activeItems.length === 0) return null;

    const expiringSoon = [];
    const timeline = {
      today: 0,
      in1to3: 0,
      in4to7: 0,
      in8to14: 0,
      later: 0,
      expired: 0
    };
    const categoryDist = {};

    activeItems.forEach(item => {
      // Category count
      const cat = item.category || (item.type === 'medicine' ? 'Medicine' : 'Other');
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;

      const urgency = getItemUrgency(item);
      const days = urgency.daysRemaining;

      if (days !== null) {
        if (days < 0) timeline.expired++;
        else if (days === 0) {
          timeline.today++;
          expiringSoon.push({ item, days });
        } else if (days <= 3) {
          timeline.in1to3++;
          expiringSoon.push({ item, days });
        } else if (days <= 7) {
          timeline.in4to7++;
          expiringSoon.push({ item, days });
        } else if (days <= 14) {
          timeline.in8to14++;
        } else {
          timeline.later++;
        }
      }
    });

    // Sort expiring soon ascending
    expiringSoon.sort((a, b) => a.days - b.days);

    return {
      expiringSoon,
      timeline,
      categoryDist
    };
  }, [activeItems, getItemUrgency]);

  // 3. WASTE ANALYTICS (REAL DATABASE RECORDS)
  const wasteAnalytics = useMemo(() => {
    const wastedOrDiscarded = wasteRecords.filter(r => r.status === 'wasted' || r.status === 'discarded');
    
    if (wastedOrDiscarded.length === 0 && (!stats.itemsWasted || stats.itemsWasted === 0)) {
      return null;
    }

    let totalQuantity = 0;
    const categoryWaste = {};
    const reasonBreakdown = {};

    wastedOrDiscarded.forEach(rec => {
      const q = rec.quantity || 1;
      totalQuantity += q;

      const cat = rec.category || 'General';
      categoryWaste[cat] = (categoryWaste[cat] || 0) + q;

      const r = rec.reason || 'expired';
      reasonBreakdown[r] = (reasonBreakdown[r] || 0) + q;
    });

    // Fallback to stats counter if wasteRecords empty
    if (totalQuantity === 0 && stats.itemsWasted > 0) {
      totalQuantity = stats.itemsWasted;
    }

    return {
      totalCount: wastedOrDiscarded.length || stats.itemsWasted || 0,
      totalQuantity,
      categoryWaste,
      reasonBreakdown,
      recentRecords: wastedOrDiscarded.slice(0, 5)
    };
  }, [wasteRecords, stats.itemsWasted]);

  // 4. AI INSIGHTS CARD ENGINE (What happened? Why? What can the user do?)
  const aiInsights = useMemo(() => {
    if (activeItems.length === 0) return [];

    const insights = [];

    // Analyze high urgency items
    activeItems.forEach(item => {
      const att = getAttentionStatus(item);
      const days = att.daysRemaining;
      const isMed = item.type === 'medicine';
      const ml = predictSmartAttention(item, { userAllergies: settings.userAllergies || [] });
      const allergenCheck = checkAllergies(item.ingredientsOriginal || [], item.rawOcrText || '');

      // 1. Expired Items
      if (att.status === 'EXPIRED') {
        insights.push({
          id: `exp_${item.id}`,
          priority: 1,
          type: 'expired',
          item,
          what: isMed 
            ? `Medicine "${item.name}" has expired (${item.expiryDate || 'Past Date'}).`
            : `"${item.name}" is past its verified expiration date (${item.expiryDate || 'Expired'}).`,
          why: isMed
            ? 'Active pharmaceutical compounds decompose chemically over time, risking toxicity or lack of therapeutic efficacy.'
            : 'The package expiration date has elapsed, making continued consumption unsafe according to food safety standards.',
          action: isMed
            ? 'Never consume. Seal in a container with coffee grounds/dirt and discard in household trash or drop off at a pharmacy take-back kiosk.'
            : 'Removed from active meal recommendations. Safely discard or compost organic scraps; record waste outcome to maintain accurate pantry analytics.'
        });
      }
      // 2. High Allergy Matches
      else if (allergenCheck.hasMatch) {
        insights.push({
          id: `allergy_${item.id}`,
          priority: 2,
          type: 'allergy',
          item,
          what: `Allergen match detected in "${item.name}": contains ${allergenCheck.matches.join(', ')}.`,
          why: `Your saved allergy profile includes [${allergenCheck.matches.join(', ')}], which matched verified ingredients or OCR package text.`,
          action: 'Do not consume if you have severe dietary sensitivity. Verify ingredient list on package before handling.'
        });
      }
      // 3. Expiry Approaching / High Waste Probability
      else if (att.status === 'USE SOON' || ml.wasteRiskScore > 65) {
        insights.push({
          id: `soon_${item.id}`,
          priority: 3,
          type: 'use_soon',
          item,
          what: `"${item.name}" is expiring ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}.`,
          why: `Package expiration date is ${item.expiryDate}. ML predicts high waste risk (${ml.wasteRiskScore}%) if not prioritized.`,
          action: isMed
            ? 'Check if current treatment course requires this unit; store in cool, dry place.'
            : 'Prioritize in today’s cooking plan or view Zero-Waste Recipe suggestions to consume safely in time.'
        });
      }
      // 4. Verify Date Required
      else if (att.status === 'VERIFY DATE') {
        insights.push({
          id: `verify_${item.id}`,
          priority: 4,
          type: 'verify',
          item,
          what: `"${item.name}" requires package expiry date verification.`,
          why: item.verificationReason || 'Package OCR text lacked high confidence for an exact stamped date.',
          action: 'Open product details and inspect the printed package label to confirm or edit the expiry date manually.'
        });
      }
    });

    // Sort by priority and cap to top 6 insights
    insights.sort((a, b) => a.priority - b.priority);
    return insights.slice(0, 6);
  }, [activeItems, getAttentionStatus, settings.userAllergies, checkAllergies]);

  // 5. ALLERGY ANALYTICS
  const allergyAnalytics = useMemo(() => {
    const profile = settings.allergyProfile || settings.userAllergies || [];
    if (!profile || profile.length === 0) {
      return { profileConfigured: false, matchedItems: [], frequentAllergens: [] };
    }

    const matches = [];
    const allergenFreq = {};

    activeItems.forEach(item => {
      const res = checkAllergies(item.ingredientsOriginal || [], item.rawOcrText || '');
      if (res.hasMatch) {
        matches.push({ item, allergens: res.matches });
        res.matches.forEach(a => {
          allergenFreq[a] = (allergenFreq[a] || 0) + 1;
        });
      }
    });

    return {
      profileConfigured: true,
      userProfile: profile,
      matchedItems: matches,
      frequentAllergens: Object.entries(allergenFreq).sort((a, b) => b[1] - a[1])
    };
  }, [activeItems, settings.allergyProfile, settings.userAllergies, checkAllergies]);

  // 6. USER BEHAVIOR & CONSUMPTION PATTERNS
  const userBehavior = useMemo(() => {
    const usedCount = stats.itemsUsedBeforeExpiry || 0;
    const wastedCount = stats.itemsWasted || 0;
    const totalDecided = usedCount + wastedCount;
    
    // Frequently used products
    const usedProducts = {};
    const wastedCategories = {};

    // Analyze waste records
    wasteRecords.forEach(rec => {
      if (rec.status === 'used') {
        const p = rec.product || 'Unknown Item';
        usedProducts[p] = (usedProducts[p] || 0) + (rec.quantity || 1);
      } else if (rec.status === 'wasted' || rec.status === 'discarded') {
        const c = rec.category || 'General';
        wastedCategories[c] = (wastedCategories[c] || 0) + (rec.quantity || 1);
      }
    });

    // Also look at history log if records empty
    if (Object.keys(usedProducts).length === 0 && Array.isArray(stats.historyLog)) {
      stats.historyLog.forEach(entry => {
        if (entry.action === 'used' && entry.itemName) {
          usedProducts[entry.itemName] = (usedProducts[entry.itemName] || 0) + 1;
        }
      });
    }

    const hasEnoughData = totalDecided >= 2 || Object.keys(usedProducts).length > 0;

    return {
      hasEnoughData,
      totalDecided,
      usedCount,
      wastedCount,
      saveRate: totalDecided > 0 ? Math.round((usedCount / totalDecided) * 100) : null,
      topUsed: Object.entries(usedProducts).sort((a, b) => b[1] - a[1]).slice(0, 4),
      topWastedCategories: Object.entries(wastedCategories).sort((a, b) => b[1] - a[1]).slice(0, 4)
    };
  }, [stats, wasteRecords]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in space-y-8">
      
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
              <BarChart3 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              <span>AI Analytics & Pantry Intelligence</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Deterministic safety metrics, ML smart attention, and verified real-database statistics.
            </p>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold self-start sm:self-auto border border-emerald-300 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real Database Live</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: PANTRY OVERVIEW */}
      {/* ========================================================================= */}
      <section>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <span>📦</span>
            <span>Pantry Overview</span>
          </h2>
          <span className="text-xs text-slate-400">Total active tracked: {pantryOverview.total}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Total Items */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Items
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5">
              {pantryOverview.total}
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              Active in Pantry
            </span>
          </div>

          {/* Safe Items */}
          <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Safe Items
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-200 mt-1.5">
              {pantryOverview.safe}
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified Fresh
            </span>
          </div>

          {/* Use-Soon Items */}
          <div className="p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Use-Soon Items
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-200 mt-1.5">
              {pantryOverview.useSoon}
            </div>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" /> Prioritize Now
            </span>
          </div>

          {/* Expired Items */}
          <div className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Expired Items
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-200 mt-1.5">
              {pantryOverview.expired}
            </div>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 mt-1 flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Disposal Required
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 2: AI INSIGHTS CARD (Section 6) */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-indigo-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center space-x-2">
                <span>AI Insights</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Actionable Intelligence
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80">
                What happened, why it happened, and what you can do next.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-indigo-300/70 font-mono">
            {aiInsights.length} active insight{aiInsights.length === 1 ? '' : 's'}
          </span>
        </div>

        {aiInsights.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-sm font-bold text-slate-300 block">Not enough data yet.</span>
            <p className="text-xs text-slate-400">
              Add pantry items via Barcode or OCR scanning to receive real-time, personalized AI insights.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {aiInsights.map((ins) => (
              <div 
                key={ins.id}
                className="p-4 rounded-2xl bg-white/8 backdrop-blur-md border border-white/10 space-y-2.5 hover:bg-white/12 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {ins.type === 'expired' ? '🚨' : ins.type === 'allergy' ? '⚠️' : ins.type === 'use_soon' ? '⏳' : '🔍'}
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-white line-clamp-1">
                      {ins.what}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                    ins.type === 'expired' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/30' :
                    ins.type === 'allergy' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30' :
                    ins.type === 'use_soon' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/30' :
                    'bg-blue-500/30 text-blue-300 border border-blue-500/30'
                  }`}>
                    {ins.type.replace('_', ' ')}
                  </span>
                </div>

                {/* Why Section */}
                <div className="text-xs text-indigo-100/90 pl-6 border-l-2 border-indigo-400/40 space-y-0.5">
                  <span className="font-black text-[11px] uppercase tracking-wider text-indigo-300 block">Why:</span>
                  <p className="leading-relaxed opacity-95">{ins.why}</p>
                </div>

                {/* Action Section */}
                <div className="text-xs text-emerald-200/95 pl-6 border-l-2 border-emerald-400/50 space-y-0.5">
                  <span className="font-black text-[11px] uppercase tracking-wider text-emerald-400 block">Suggested Action:</span>
                  <p className="leading-relaxed font-medium">{ins.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODULE 3: EXPIRY ANALYTICS & TIMELINE */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expiry Timeline / Trends (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Expiry Horizon Distribution</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Timeline breakdown of when current pantry inventory reaches expiration.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">Real Data</span>
          </div>

          {!expiryAnalytics ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Not enough data yet. Add pantry items to see expiry timeline.
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Expires Today', count: expiryAnalytics.timeline.today, color: 'bg-rose-500', icon: '🚨' },
                { label: 'Next 1–3 Days', count: expiryAnalytics.timeline.in1to3, color: 'bg-amber-500', icon: '⏳' },
                { label: 'Next 4–7 Days', count: expiryAnalytics.timeline.in4to7, color: 'bg-yellow-500', icon: '📅' },
                { label: 'Next 8–14 Days', count: expiryAnalytics.timeline.in8to14, color: 'bg-teal-500', icon: '🌱' },
                { label: 'Later (> 14 Days)', count: expiryAnalytics.timeline.later, color: 'bg-emerald-500', icon: '✅' },
                { label: 'Past Expiry (Expired)', count: expiryAnalytics.timeline.expired, color: 'bg-rose-700', icon: '⚠️' }
              ].map((row, idx) => {
                const total = pantryOverview.total || 1;
                const percent = Math.round((row.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <span>{row.icon}</span>
                        <span>{row.label}</span>
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {row.count} item{row.count === 1 ? '' : 's'} <span className="text-[11px] text-slate-400 font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expiring Soon Products List */}
          {expiryAnalytics && expiryAnalytics.expiringSoon.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Urgent Priority Items (Expiring ≤ 7 Days)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {expiryAnalytics.expiringSoon.slice(0, 6).map(({ item, days }) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="truncate mr-2">
                      <span className="font-extrabold text-slate-900 dark:text-white block truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block">{item.category}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] shrink-0 ${
                      days === 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' :
                      days <= 2 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                      'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {days === 0 ? 'Today' : `${days}d left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Distribution (1 Col) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Category Distribution</span>
              </h2>
              <span className="text-xs text-slate-400">By Count</span>
            </div>

            {!expiryAnalytics || Object.keys(expiryAnalytics.categoryDist).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Not enough data yet.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(expiryAnalytics.categoryDist).map(([category, count], idx) => {
                  const pct = Math.round((count / (pantryOverview.total || 1)) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="truncate">{category}</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Real counts calculated across active pantry database records.
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* MODULE 4: WASTE ANALYTICS */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Waste Analytics & Recorded Disposals</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified records from database waste history: product, category, quantity, and recorded reason.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {wasteAnalytics ? `${wasteAnalytics.totalCount} items logged` : '0 logged'}
          </span>
        </div>

        {!wasteAnalytics ? (
          <div className="p-8 text-center space-y-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Not enough data yet.</span>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              When items expire or are marked as wasted/discarded, verified quantity and reason records will populate this section for ML waste prediction.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Breakdown by Reason */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Waste Reason Breakdown
              </h3>
              <div className="space-y-2.5">
                {Object.entries(wasteAnalytics.reasonBreakdown).map(([reason, qty], idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-extrabold capitalize text-slate-800 dark:text-slate-200">
                      {reason === 'expired' ? '⏳ Expired Date' :
                       reason === 'spoiled' ? '🦠 Spoiled / Mold' :
                       reason === 'unused' ? '📦 Unused / Forgotten' :
                       reason === 'damaged' ? '💥 Damaged Package' : '📝 Other'}
                    </span>
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                      {qty} unit{qty === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown by Category */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Wasted Categories
              </h3>
              <div className="space-y-2.5">
                {Object.entries(wasteAnalytics.categoryWaste).map(([cat, qty], idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate mr-2">{cat}</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm shrink-0">{qty} unit{qty === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Recorded Log Entries */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Recent Waste Database Records
              </h3>
              {wasteAnalytics.recentRecords.length === 0 ? (
                <div className="text-xs text-slate-400">No individual logs available.</div>
              ) : (
                <div className="space-y-2">
                  {wasteAnalytics.recentRecords.map((r, i) => (
                    <div key={r.id || i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex justify-between font-extrabold text-slate-900 dark:text-white">
                        <span className="truncate">{r.product || 'Item'}</span>
                        <span className="text-rose-600 dark:text-rose-400">+{r.quantity || 1} {r.status}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                        <span>{r.category || 'General'} • {r.reason || 'expired'}</span>
                        <span>{r.recorded_at ? String(r.recorded_at).split('T')[0] : 'Recorded'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODULE 5 & 6: ALLERGY INTELLIGENCE & USER BEHAVIOR */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Allergy Intelligence Analytics */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Allergy Intelligence</span>
            </h2>
            <span className="text-xs text-slate-400">Profile Cross-Check</span>
          </div>

          {!allergyAnalytics.profileConfigured ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">No allergy profile configured yet.</span>
              <p className="text-[11px] text-slate-400">
                Configure your dietary allergies in Settings to enable automatic cross-checking against scanned ingredients.
              </p>
            </div>
          ) : allergyAnalytics.matchedItems.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-1">
              <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Zero Allergen Risks Detected</span>
              </span>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                None of your current {pantryOverview.total} active pantry items trigger your saved allergens ({allergyAnalytics.userProfile.join(', ')}).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200">
                <strong>{allergyAnalytics.matchedItems.length} potential allergen match{allergyAnalytics.matchedItems.length === 1 ? '' : 'es'}</strong> detected across your pantry.
              </div>
              <div className="space-y-2">
                {allergyAnalytics.matchedItems.map(({ item, allergens }, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">{item.name}</span>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {allergens.map((a, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Behavior & Consumption Patterns */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>User Behavior & Consumption Patterns</span>
            </h2>
            <span className="text-xs text-slate-400">Historical Patterns</span>
          </div>

          {!userBehavior.hasEnoughData ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Not enough data yet.</span>
              <p className="text-[11px] text-slate-400">
                As you consume, track, and record items over time, your personalized consumption velocity and frequently used products will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Consumption Velocity KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Used In Time</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{userBehavior.usedCount} items</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Safely consumed</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Prevention Rate</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{userBehavior.saveRate !== null ? `${userBehavior.saveRate}%` : 'N/A'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Zero-waste score</span>
                </div>
              </div>

              {/* Frequently Used Products */}
              {userBehavior.topUsed.length > 0 && (
                <div>
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 block mb-2">
                    Frequently Used Products
                  </span>
                  <div className="space-y-1.5">
                    {userBehavior.topUsed.map(([name, count], i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{name}</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">{count}x consumed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Frequently Wasted Categories */}
              {userBehavior.topWastedCategories.length > 0 && (
                <div>
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 block mb-2">
                    Frequently Wasted Categories
                  </span>
                  <div className="space-y-1.5">
                    {userBehavior.topWastedCategories.map(([cat, count], i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                        <span className="font-bold text-rose-900 dark:text-rose-200 truncate">{cat}</span>
                        <span className="font-extrabold text-rose-700 dark:text-rose-400 shrink-0">{count} unit{count === 1 ? '' : 's'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Streak: <strong className="text-slate-700 dark:text-slate-300 font-bold">{stats.currentStreak || 1} days 🔥</strong></span>
            <span>Money Saved: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{settings.currencySymbol}{stats.estimatedMoneySaved || 0}</strong></span>
          </div>
        </div>

      </section>

      {/* Truthfulness & Architecture Verification Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start space-x-3 text-slate-600 dark:text-slate-300 text-xs">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Truthfulness & ML Transparency:</strong> All analytics above are computed from real Supabase / local database records. No synthetic trends or fake user statistics are fabricated. Where historical records are insufficient, explicit <em>&ldquo;Not enough data yet&rdquo;</em> indicators are preserved in accordance with production safety and ML verification standards.
        </p>
      </div>

    </div>
  );
}
