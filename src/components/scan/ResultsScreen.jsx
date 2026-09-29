import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, AlertTriangle, Calendar, Tag, Sparkles, Languages, 
  ArrowLeft, Save, Edit3, HelpCircle, ShieldCheck, Clock, Check,
  HeartPulse, ShieldAlert, Award, Activity, Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ALL_CATEGORIES, SUPPORTED_LANGUAGES } from '../../constants';
import { translateIngredientsList } from '../../services/translationService';
import { calculateHealthScore } from '../../services/healthScoreService';
import { detectProductIntelligence } from '../../services/productIntelligenceService';
import { ProductIntelligenceCard } from '../common/ProductIntelligenceCard';
import { IngredientModal } from './IngredientModal';

export function ResultsScreen({ scanResult, onSaveComplete, onRetake }) {
  const { addItem, settings, getDaysRemaining } = useApp();

  // Editable Form State
  const [name, setName] = useState(scanResult.name || 'Scanned Product');
  const [type, setType] = useState(scanResult.type || 'grocery');
  const [category, setCategory] = useState(
    scanResult.type === 'medicine' ? 'Tablets & Capsules' : 'Dairy & Milk Products'
  );
  const [expiryDate, setExpiryDate] = useState(scanResult.expiryDate || '');
  const [mfgDate, setMfgDate] = useState(scanResult.mfgDate || '');
  const [estimatedValue, setEstimatedValue] = useState(settings.defaultItemValue || 100);
  const [notes, setNotes] = useState('');

  // Product Intelligence State (Real Expiry, Composition & Lifespan)
  const [intelligenceData, setIntelligenceData] = useState(scanResult.productIntelligence || null);

  // Lazy generate product intelligence if not already passed from scanner
  useEffect(() => {
    if (!intelligenceData) {
      detectProductIntelligence({
        productName: name,
        frontText: scanResult.rawOcrText || '',
        existingExpiryDate: expiryDate,
        existingMfgDate: mfgDate
      }).then(res => {
        if (res) setIntelligenceData(res);
      });
    }
  }, [name, expiryDate, mfgDate, intelligenceData, scanResult.rawOcrText]);

  // Translation State
  const [activeLang, setActiveLang] = useState(scanResult.targetLanguage || settings.preferredLanguage || 'en');
  const [translatedList, setTranslatedList] = useState(
    scanResult.ingredientsTranslated?.[activeLang] || []
  );
  const [isTranslating, setIsTranslating] = useState(false);

  // Selected Ingredient for Modal
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // Days remaining calculation
  const daysLeft = getDaysRemaining(expiryDate);
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  // Calculate Health & Nutrition Score for ingredients
  const healthScore = useMemo(() => {
    return calculateHealthScore({
      name,
      type,
      ingredientsOriginal: scanResult.ingredientsOriginal || []
    });
  }, [name, type, scanResult.ingredientsOriginal]);

  // Handle language switch
  const handleLanguageChange = async (newLang) => {
    setActiveLang(newLang);
    if (newLang === 'en') {
      setTranslatedList([]);
      return;
    }

    if (scanResult.ingredientsTranslated?.[newLang]) {
      setTranslatedList(scanResult.ingredientsTranslated[newLang]);
      return;
    }

    setIsTranslating(true);
    try {
      const trans = await translateIngredientsList(scanResult.ingredientsOriginal, newLang, {
        apiKey: settings.apiKeys?.libreTranslateApiKey,
        libreTranslateUrl: settings.apiKeys?.libreTranslateUrl
      });
      setTranslatedList(trans);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Save to dashboard
  const handleSave = () => {
    const saved = addItem({
      name,
      type,
      category,
      frontImage: scanResult.frontImage,
      backImage: scanResult.backImage,
      rawOcrText: scanResult.rawOcrText,
      expiryDate,
      expirySource: 'scanned',
      mfgDate,
      ingredientsOriginal: scanResult.ingredientsOriginal || [],
      ingredientsTranslated: {
        ...(scanResult.ingredientsTranslated || {}),
        [activeLang]: translatedList
      },
      ingredientExplanations: {},
      productIntelligence: intelligenceData,
      estimatedValue: Number(estimatedValue) || 100,
      notes
    });

    onSaveComplete(saved);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 animate-fade-in">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onRetake}
          className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retake / Rescan</span>
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          ✨ OCR & AI Verification
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none space-y-8">
        
        {/* Urgent Status Header Banner */}
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
          isExpired
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
            : isUrgent
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {isExpired ? '🚨' : isUrgent ? '⏳' : '🥗'}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg">
                  {isExpired
                    ? `Expired ${Math.abs(daysLeft)} Day${Math.abs(daysLeft) === 1 ? '' : 's'} Ago`
                    : daysLeft === 0
                    ? 'Expires Today!'
                    : `Expires in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`}
                </span>
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800 shadow-xs">
                  {isExpired ? 'Red • Expired' : isUrgent ? 'Yellow • Urgent' : 'Green • Safe'}
                </span>
              </div>
              <p className="text-xs font-medium opacity-85 mt-0.5">
                Parsed from package label OCR • You can edit or fine-tune below
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
              Source: Scanned (Confirmed)
            </span>
          </div>
        </div>

        {/* Section 1: Item Details & Editable Verification Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Name & Type */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Product Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="e.g. Amul Milk, Paracetamol 500mg"
                />
                <Edit3 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  <option value="grocery">🥗 Grocery</option>
                  <option value="medicine">💊 Medicine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Estimated Value ({settings.currencySymbol})
              </label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="100"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Used to compute money saved when consumed before expiry
              </span>
            </div>
          </div>

          {/* Right Column: Dates & Expiry Verification */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Expiry Date (EXP / Use By)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={`w-full px-4 py-2.5 font-bold border rounded-xl focus:ring-2 focus:outline-none text-sm ${
                    isExpired
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-rose-500'
                      : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 focus:ring-emerald-500'
                  }`}
                />
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Extracted from label OCR. Adjust if needed.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Manufacturing Date (MFG / PKD)
              </label>
              <input
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>

            {/* Packaging thumbnail preview */}
            <div className="flex items-center space-x-3 pt-1">
              {scanResult.frontImage && (
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <img src={scanResult.frontImage} alt="Front" className="w-full h-full object-contain" />
                </div>
              )}
              {scanResult.backImage && (
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <img src={scanResult.backImage} alt="Back" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">Package Photos Attached</span>
                Saved to item record for future reference
              </div>
            </div>

          </div>

        </div>

        {/* SECTION 2: HEALTH & CLEAN EATING SCORE */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white dark:from-slate-850 dark:via-emerald-950/20 dark:to-slate-850 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      Clean Eating & Health Score
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">NOVA & Nutrients</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-center space-x-2">
                    <span>{healthScore.verdict}</span>
                  </h3>
                </div>
              </div>

              {/* Big Score Display */}
              <div className="flex items-center space-x-3 self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                    {healthScore.score}<span className="text-base text-slate-400 font-bold">/100</span>
                  </div>
                  <span className="text-[11px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                    Grade {healthScore.grade} Clean Score
                  </span>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md ${
                  healthScore.grade === 'A'
                    ? 'bg-emerald-600 shadow-emerald-600/20'
                    : healthScore.grade === 'B'
                    ? 'bg-teal-600 shadow-teal-600/20'
                    : healthScore.grade === 'C'
                    ? 'bg-amber-500 shadow-amber-500/20'
                    : 'bg-rose-500 shadow-rose-500/20'
                }`}>
                  {healthScore.grade}
                </div>
              </div>
            </div>

            {/* Classification & Dietary Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-100 dark:border-slate-800">
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                🏷️ {healthScore.novaClass}
              </span>
              {healthScore.dietaryTags.map((tag, i) => (
                <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✨ {tag}
                </span>
              ))}
            </div>

            {/* Detailed Positives vs Cautions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Positives */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-850/80 border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide text-[10px] block mb-1.5 flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Wholesome Ingredients & Highlights</span>
                </span>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300 pl-4 list-disc">
                  {healthScore.positivePoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Cautions or Clean Label confirmation */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-700">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] block mb-1.5 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>Additives & Caution Check</span>
                </span>
                {healthScore.cautionPoints.length > 0 ? (
                  <ul className="space-y-1 text-amber-800 dark:text-amber-300 pl-4 list-disc font-medium">
                    {healthScore.cautionPoints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1.5 pt-0.5">
                    <span>🛡️ No harmful chemical additives, synthetic colors, or trans fats detected.</span>
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 2.5: PRODUCT INTELLIGENCE API (REAL EXPIRY, COMPOSITION & LIFESPAN) */}
        {intelligenceData && (
          <ProductIntelligenceCard intelligenceData={intelligenceData} />
        )}

        {/* Section 3: Ingredients with Multi-Language Translation & Tap to Explain */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  Ingredients & Composition
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  {scanResult.ingredientsOriginal?.length || 0} Identified
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                👉 <strong className="text-emerald-700 dark:text-emerald-400">Tap any ingredient</strong> below to reveal AI safety notes & health functions.
              </p>
            </div>

            {/* Language Switcher Dropdown */}
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <select
                value={activeLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Ingredients Pills */}
          {scanResult.ingredientsOriginal && scanResult.ingredientsOriginal.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {scanResult.ingredientsOriginal.map((orig, index) => {
                const trans = translatedList[index];
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedIngredient({ original: orig, translated: trans })}
                    className="group flex flex-col text-left px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-xs hover:shadow transition-all"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-950 dark:group-hover:text-emerald-300 flex items-center space-x-1.5">
                      <span>{orig}</span>
                      <Sparkles className="w-3 h-3 text-emerald-500 opacity-60 group-hover:opacity-100" />
                    </span>
                    {trans && trans !== orig && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {trans}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              No specific ingredients text parsed. You can still save the item with its expiry date.
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onRetake}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Discard & Retake
          </button>

          <button
            onClick={handleSave}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>Save to Dashboard & Track</span>
          </button>
        </div>

      </div>

      {/* Tapped Ingredient Explanation Modal */}
      <IngredientModal
        isOpen={!!selectedIngredient}
        onClose={() => setSelectedIngredient(null)}
        ingredientName={selectedIngredient?.original}
        translatedName={selectedIngredient?.translated}
        itemType={type}
      />

    </div>
  );
}
