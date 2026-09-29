import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, ShieldAlert, CheckCircle2, Info, Loader2, BookOpen, HeartPulse, Activity } from 'lucide-react';
import { explainIngredient } from '../../services/aiService';
import { getSingleIngredientScore } from '../../services/healthScoreService';
import { useApp } from '../../context/AppContext';

export function IngredientModal({ isOpen, onClose, ingredientName, translatedName, itemType = 'grocery' }) {
  const { settings } = useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Calculate health score for this specific ingredient
  const ingredientScore = useMemo(() => {
    if (!ingredientName) return null;
    return getSingleIngredientScore(ingredientName);
  }, [ingredientName]);

  useEffect(() => {
    if (!isOpen || !ingredientName) {
      setData(null);
      return;
    }

    let isMounted = true;
    const fetchExplanation = async () => {
      setLoading(true);
      try {
        const result = await explainIngredient(
          ingredientName, 
          settings.preferredLanguage || 'en',
          settings.apiKeys
        );
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        console.error('Failed to explain ingredient:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExplanation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, ingredientName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                  AI Ingredient Decoder
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {itemType === 'medicine' ? '💊 Pharmaceutical Excipient' : '🥗 Food Ingredient'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {ingredientName}
              </h3>
              {translatedName && translatedName !== ingredientName && (
                <p className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {translatedName}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Health Score Pill for this ingredient */}
          {ingredientScore && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Ingredient Health Score: {ingredientScore.score}/100
                    </span>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                      Grade {ingredientScore.grade}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {ingredientScore.novaClass}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hidden sm:inline">
                {ingredientScore.verdict.split(' ')[0]}
              </span>
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Consulting AI Knowledge Base...</p>
              <p className="text-xs text-slate-400 mt-1">Analyzing safety profile & culinary functions</p>
            </div>
          ) : data ? (
            <>
              {/* Section 1: What It Is */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center space-x-2 mb-1.5 text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>What It Is</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {data.whatItIs}
                </p>
              </div>

              {/* Section 2: Common Use */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex items-center space-x-2 mb-1.5 text-emerald-950 dark:text-emerald-200 font-extrabold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Purpose & Common Use</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 leading-relaxed font-medium">
                  {data.commonUse}
                </p>
              </div>

              {/* Section 3: Allergen / Caution Note */}
              {data.allergenOrCaution && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                  <div className="flex items-center space-x-2 mb-1.5 text-amber-950 dark:text-amber-200 font-extrabold text-xs sm:text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Allergen & Health Caution</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-300 leading-relaxed font-semibold">
                    {data.allergenOrCaution}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              No detailed breakdown found. Always verify dosage on package.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Plain language AI summary • Clean eating evaluation
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
}
