import React, { useState } from 'react';
import { 
  Sparkles, ShieldCheck, AlertTriangle, Info, CheckCircle2, 
  HelpCircle, ChevronDown, ChevronUp, Droplets, Zap, HeartPulse,
  TrendingUp, Trash2, ShieldAlert
} from 'lucide-react';

export function AIProductIntelligenceCard({ aiData, mlPrediction, onExplainClick }) {
  const [showFactors, setShowFactors] = useState(false);

  if (!aiData && !mlPrediction) return null;

  const isMedicine = aiData?.product_type === 'medicine';
  const confidencePercent = Math.round((aiData?.confidence || 0.94) * 100);

  return (
    <div className={`rounded-3xl border shadow-xl overflow-hidden transition-all ${
      isMedicine
        ? 'border-indigo-300 dark:border-indigo-900 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900'
        : 'border-emerald-300 dark:border-emerald-900 bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900'
    }`}>
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-5 text-white flex items-center justify-between ${
        isMedicine
          ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800'
          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0 shadow-inner">
            {isMedicine ? '💊' : '🤖'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white shadow-2xs">
                {isMedicine ? 'PHARMA INTELLIGENCE PIPELINE' : 'AI PRODUCT INTELLIGENCE'}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/25 text-white">
                Confidence: {confidencePercent}%
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
              {isMedicine ? 'Medicine Safety & Label Verification' : 'Product Insights & Expiry Optimization'}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setShowFactors(!showFactors)}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center space-x-1 transition-all"
        >
          <span>Factors</span>
          {showFactors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200">
        
        {/* 1. Summary & Category */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Product Summary & Classification
            </span>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              {aiData?.category || 'General'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
            {aiData?.summary || 'Product cataloged and synchronized with safety engine.'}
          </p>
        </div>

        {/* 2. Allergy Alert Ribbon */}
        {aiData?.allergy_alert && (
          <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
            aiData.allergy_confidence === 'ATTENTION'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200'
              : aiData.allergy_confidence === 'VERIFY'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-950 dark:text-amber-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="p-2 rounded-xl bg-white/70 dark:bg-black/20 shrink-0">
              {aiData.allergy_confidence === 'ATTENTION' ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : aiData.allergy_confidence === 'VERIFY' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wide">
                  Allergy Check: {aiData.allergy_confidence}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold">
                {aiData.allergy_alert}
              </p>
              {aiData.allergy_explanation && (
                <p className="text-xs opacity-90 leading-relaxed pt-0.5">
                  {aiData.allergy_explanation}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 3. Nutrition Summary */}
        {aiData?.nutrition_summary && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start space-x-3 text-xs">
            <span className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 shrink-0">
              🥗
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Nutrition Interpretation
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                {aiData.nutrition_summary}
              </p>
            </div>
          </div>
        )}

        {/* 4. ML SMART ATTENTION & WASTE PREDICTION */}
        {mlPrediction && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-850 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  ML Smart Attention & Waste Prediction
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                {mlPrediction.is_trained_ml_model ? `Trained ML (${mlPrediction.model_version})` : 'Statistical Prior Model'}
              </span>
            </div>

            {/* Probability Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Attention Probability</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {Math.round(mlPrediction.attention_probability * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      mlPrediction.attention_probability >= 0.75 
                        ? 'bg-rose-500' 
                        : mlPrediction.attention_probability >= 0.45 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.round(mlPrediction.attention_probability * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 block mt-1">
                  Level: {mlPrediction.recommended_attention_level}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Waste Probability</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {Math.round(mlPrediction.waste_probability * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      mlPrediction.waste_probability >= 0.70 
                        ? 'bg-rose-500' 
                        : mlPrediction.waste_probability >= 0.45 
                        ? 'bg-amber-500' 
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.round(mlPrediction.waste_probability * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 block mt-1">
                  Risk Level: {mlPrediction.waste_risk_level}
                </span>
              </div>
            </div>

            {/* SEPARATE FOOD SAFETY STATUS VS WASTE RISK WARNING */}
            {mlPrediction.safety_vs_waste_clarification && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">
                  {mlPrediction.safety_vs_waste_clarification}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 5. Recommended Action & Storage Guidance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Recommended Action
            </span>
            <p className="font-bold text-slate-900 dark:text-white">
              {aiData?.recommended_action || mlPrediction?.recommended_action || 'Store safely.'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Storage Guidance
            </span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {aiData?.storage_guidance || 'Keep in cool, dry pantry conditions.'}
            </p>
          </div>
        </div>

        {/* Safe Disposal Guidance for Medicine */}
        {isMedicine && aiData?.safe_disposal_guidance && (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
              ♻️ Safe Medical Disposal Protocol
            </span>
            <p className="text-blue-950 dark:text-blue-200 font-medium">
              {aiData.safe_disposal_guidance}
            </p>
          </div>
        )}

        {/* Waste Reduction Suggestion for Food */}
        {!isMedicine && aiData?.waste_reduction_suggestion && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
              🌱 Waste Reduction Suggestion
            </span>
            <p className="text-emerald-950 dark:text-emerald-200 font-medium">
              {aiData.waste_reduction_suggestion}
            </p>
          </div>
        )}

        {/* 6. AI EXPLAINABILITY: "Why am I seeing this?" */}
        {showFactors && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Why am I seeing this? (Explainability Factors)
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {mlPrediction?.explainability?.summary || aiData?.explainability?.reason || 'Calculated using real package attributes, days remaining, and pantry history.'}
            </p>

            <div className="space-y-1.5 pt-1">
              {(mlPrediction?.explainability?.detailed_factors || aiData?.explainability?.factors || []).map((f, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{f.factor || f.detail || f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STRICT DISCLAIMER */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-200/60 dark:border-slate-800">
          <strong>Mandatory Safety Notice:</strong> {aiData?.safety_disclaimer || 'Verified printed packaging information always takes precedence over AI suggestions.'}
        </div>

      </div>
    </div>
  );
}
