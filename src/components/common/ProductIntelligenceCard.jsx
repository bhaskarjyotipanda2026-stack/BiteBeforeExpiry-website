import React, { useState } from 'react';
import { 
  Calendar, ShieldCheck, AlertTriangle, Clock, Layers, Sparkles, 
  Info, ChevronDown, ChevronUp, Droplets, CheckCircle2, Zap, HeartPulse
} from 'lucide-react';

export function ProductIntelligenceCard({ intelligenceData, isCompact = false }) {
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  if (!intelligenceData) return null;

  const { expiryInfo, composition, lifespan, openFoodFactsData, medicineData, realDatasetSource, verifiedName } = intelligenceData;

  const isMedicine = !!medicineData || intelligenceData.productType === 'medicine';

  // Lifespan progress color
  const percent = lifespan?.remainingLifespanPercent ?? 50;
  const isExpired = expiryInfo?.daysRemaining !== null && expiryInfo?.daysRemaining < 0;
  const isUrgent = expiryInfo?.daysRemaining !== null && expiryInfo?.daysRemaining >= 0 && expiryInfo?.daysRemaining <= 7;

  const getMeterColor = () => {
    if (isExpired) return 'bg-rose-500';
    if (isUrgent || percent < 20) return 'bg-amber-500';
    if (percent < 50) return 'bg-teal-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={`rounded-3xl border shadow-md overflow-hidden transition-all ${
      isMedicine 
        ? 'border-indigo-200/90 dark:border-indigo-900/60 bg-white dark:bg-slate-850 shadow-indigo-100/50' 
        : 'border-emerald-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-slate-100'
    }`}>
      
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 text-white flex items-center justify-between ${
        isMedicine
          ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-800'
          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
      }`}>
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            {isMedicine ? <HeartPulse className="w-5 h-5 text-blue-200" /> : <Sparkles className="w-5 h-5 text-emerald-200" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white">
                {isMedicine ? '💊 Verified Medicine Dataset' : '🥫 Verified Food Dataset'}
              </span>
              {(realDatasetSource || openFoodFactsData?.source) && (
                <span className="text-[10px] font-bold text-white/90 bg-black/20 px-2 py-0.5 rounded-md">
                  • {realDatasetSource || openFoodFactsData?.source}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              {isMedicine ? 'Active Chemical Formula, Shelf-Life & Medical Safety' : 'Real Expiry Date, Composition & Lifespan'}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200">
        
        {/* ======================================================== */}
        {/* 1. REAL EXPIRY & MANUFACTURING DATE DETECTION */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Verified Expiry & Manufacturing Dates
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {expiryInfo.batchNumber && (
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Batch: {expiryInfo.batchNumber}
                </span>
              )}
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {expiryInfo.detectionSource}
              </span>
            </div>
          </div>

          {/* Side-by-Side Dual Date Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Manufacturing (Mfg) Date Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden">
              <div className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <span>🏭</span>
                <span>Manufacturing Date (Mfg Date)</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {expiryInfo.formattedHumanMfgDate || expiryInfo.mfgDate || 'Determined via Batch Lifecycle'}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {expiryInfo.mfgDate ? `Manufactured on ${expiryInfo.mfgDate}` : 'Official production run'}
              </div>
            </div>

            {/* Real Expiry (Exp) Date Card */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs relative overflow-hidden ${
              isExpired 
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : isUrgent 
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60' 
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
            }`}>
              <div className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider mb-1">
                <span>📅</span>
                <span className={isExpired ? 'text-rose-700 dark:text-rose-400' : isUrgent ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
                  Real Expiry Date (Exp Date)
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {expiryInfo.formattedHumanDate || expiryInfo.realExpiryDate || 'Date Not Found'}
              </div>
              <div className={`text-xs font-bold mt-1 flex items-center space-x-1.5 ${
                isExpired ? 'text-rose-600 dark:text-rose-400' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                <span>{isExpired ? '🚨' : isUrgent ? '⏳' : '✅'}</span>
                <span>{expiryInfo.statusText}</span>
              </div>
            </div>
          </div>

          {/* Timeline Bar connecting Mfg Date to Expiry Date */}
          {expiryInfo.mfgDate && expiryInfo.realExpiryDate && (
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Mfg: {expiryInfo.mfgDate}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Active Lifecycle</span>
                <span>Exp: {expiryInfo.realExpiryDate}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getMeterColor()}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 2. PRODUCT LIFESPAN & SHELF LIFE */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Product Lifespan & Shelf Life
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
              {lifespan.shelfLifeClass}
            </span>
          </div>

          {/* Lifespan Visual Meter */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-600 dark:text-slate-400">
                Stage: <strong className="text-slate-900 dark:text-white">{lifespan.lifespanStage}</strong>
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                {lifespan.remainingLifespanPercent}% Lifespan Remaining
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getMeterColor()}`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Packed (Day 0)</span>
              <span>Total Lifespan: {lifespan.totalLifespanHuman}</span>
              <span>Expiry ({expiryInfo.realExpiryDate})</span>
            </div>
          </div>

          {/* Lifespan Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Period After Opening (PAO) */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase text-amber-700 dark:text-amber-400 mb-0.5">
                <span>⏱️</span>
                <span>Period After Opening (PAO):</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lifespan.periodAfterOpening}
              </p>
            </div>

            {/* Storage Conditions */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase text-teal-700 dark:text-teal-400 mb-0.5">
                <span>❄️</span>
                <span>Storage Protocol to Maximize Life:</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lifespan.storageConditions}
              </p>
            </div>
          </div>

          {/* Degradation Risk Note */}
          {lifespan.degradationRisk && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-start space-x-1.5 pt-0.5">
              <span className="shrink-0">⚠️</span>
              <span><strong>Degradation Mechanism:</strong> {lifespan.degradationRisk}</span>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. WHAT THE PRODUCT IS MADE UP OF */}
        {/* ======================================================== */}
        {isExpanded && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. What The Product Is Made Up Of
                </span>
              </div>

              {composition.sourceOrigins && composition.sourceOrigins.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {composition.sourceOrigins.map((orig, i) => (
                    <span key={i} className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                      {orig}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Summary sentence */}
            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 font-medium">
              💡 <strong>Composition Summary:</strong> {composition.summary}
            </div>

            {/* Primary Raw Materials & Source Breakdown */}
            {composition.primaryRawMaterials && composition.primaryRawMaterials.length > 0 && (
              <div>
                <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                  Base Raw Materials & Origin:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {composition.primaryRawMaterials.map((mat, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white block">
                          {mat.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Source: {mat.origin}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 ml-2">
                        {mat.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Compounds & Medicine Ingredients (if applicable) */}
            {composition.activeCompounds && composition.activeCompounds.length > 0 && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <span className="text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-300 block mb-1">
                  💊 Active Pharmaceutical Compounds & Strength:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {composition.activeCompounds.map((act, i) => (
                    <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 shadow-sm">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Drug Indications & Classification (if medicine) */}
            {(composition.drugClass || composition.indications) && (
              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1">
                {composition.drugClass && (
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 block">Pharmacological Class:</span>
                    {composition.drugClass} {composition.dosageForm ? `(${composition.dosageForm})` : ''}
                  </div>
                )}
                {composition.indications && (
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed pt-0.5">
                    <strong>Medical Indications:</strong> {composition.indications}
                  </p>
                )}
              </div>
            )}

            {/* Post-Expiry Danger Warning */}
            {lifespan.degradationProfile && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70">
                <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-rose-800 dark:text-rose-300 mb-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Post-Expiry Risk & Degradation Warning:</span>
                </div>
                <p className="text-xs font-medium text-rose-950 dark:text-rose-200 leading-relaxed">
                  {lifespan.degradationProfile}
                </p>
              </div>
            )}

            {/* Safe Disposal Guidelines */}
            {lifespan.disposalGuidelines && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white block text-[10px] uppercase font-black mb-0.5">
                  ♻️ Safe Disposal Recommendation:
                </strong>
                {lifespan.disposalGuidelines}
              </div>
            )}

            {/* Allergens Warnings */}
            {composition.allergens && composition.allergens.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80">
                <div className="flex items-center space-x-1.5 text-[11px] font-black uppercase text-amber-900 dark:text-amber-300 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Detected Allergen Triggers ({composition.allergens.length}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {composition.allergens.map((alg, i) => (
                    <span key={i} className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100">
                      ⚠️ {alg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additives & Stabilizers */}
            {composition.additivesAndPreservatives && composition.additivesAndPreservatives.length > 0 && (
              <div>
                <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Additives & Stabilizers ({composition.additivesAndPreservatives.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {composition.additivesAndPreservatives.map((add, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center space-x-1 text-[11px] px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <strong className="text-emerald-700 dark:text-emerald-400">{add.code}</strong>
                      <span>({add.name}): {add.purpose}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
