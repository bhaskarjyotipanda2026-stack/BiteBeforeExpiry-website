import React, { useState, useMemo } from 'react';
import { 
  X, CheckCircle2, Trash2, Calendar, Clock, Sparkles, Tag, 
  AlertTriangle, ShieldCheck, Edit3, Save, ChevronRight, FileText, ChefHat,
  HeartPulse, Activity, Check, ShieldAlert, Bell, BellRing, Volume2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateHealthScore } from '../../services/healthScoreService';
import { analyzeProductComposition, analyzeProductLifespan } from '../../services/productIntelligenceService';
import { ALARM_SOUND_TYPES, WARNING_SIGN_OPTIONS, previewAlarmSound } from '../../services/alarmSoundService';
import { ProductIntelligenceCard } from '../common/ProductIntelligenceCard';
import { IngredientModal } from '../scan/IngredientModal';

export function ItemDetailModal({ isOpen, onClose, item, onNavigateToRecipes }) {
  const { getItemUrgency, markAsUsed, markAsWasted, markAsDiscarded, deleteItem, updateItem, settings, triggerAlarmForItem } = useApp();
  
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Calculate health score
  const healthScore = useMemo(() => {
    if (!item) return null;
    return calculateHealthScore(item);
  }, [item]);

  // Compute or retrieve Product Intelligence (Real Expiry, Composition & Lifespan)
  const productIntelligence = useMemo(() => {
    if (!item) return null;
    if (item.productIntelligence) return item.productIntelligence;

    const composition = analyzeProductComposition(
      item.ingredientsOriginal || [],
      item.name,
      item.rawOcrText || '',
      null
    );

    const lifespan = analyzeProductLifespan(
      item.name,
      item.rawOcrText || '',
      item.mfgDate || null,
      item.expiryDate || null
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let daysRemaining = null;
    let formattedHumanDate = item.expiryDate || 'N/A';
    if (item.expiryDate) {
      const exp = new Date(item.expiryDate);
      exp.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      formattedHumanDate = exp.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    return {
      verifiedName: item.name,
      productType: item.type,
      barcode: null,
      openFoodFactsData: null,
      expiryInfo: {
        realExpiryDate: item.expiryDate,
        mfgDate: item.mfgDate,
        isRealPrintedExpiry: item.expirySource === 'scanned',
        confidence: item.expirySource === 'scanned' ? 'high' : 'medium',
        detectionSource: item.expirySource === 'scanned' ? 'Verified Package OCR Date' : 'Estimated Expiry Profile',
        daysRemaining,
        statusText: daysRemaining !== null ? (daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)}d ago` : `${daysRemaining} days remaining`) : 'Tracked',
        formattedHumanDate
      },
      composition,
      lifespan
    };
  }, [item]);

  if (!isOpen || !item) return null;

  const urgency = getItemUrgency(item);
  const days = urgency.daysRemaining;

  const handleStartEdit = () => {
    setEditName(item.name);
    setEditExpiryDate(item.expiryDate || '');
    setEditNotes(item.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateItem(item.id, {
      name: editName,
      expiryDate: editExpiryDate,
      notes: editNotes
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {item.type === 'medicine' ? '💊' : '🥛'}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  {item.category}
                </span>
                {item.expirySource === 'ai_estimated' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300">
                    ~AI Estimated
                  </span>
                )}
                {item.expirySource === 'manual' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Manual Entry
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white line-clamp-1">
                {item.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Urgency Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            urgency.color === 'red'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
              : urgency.color === 'yellow'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {urgency.color === 'red' ? '🚨' : urgency.color === 'yellow' ? '⏳' : '✅'}
              </span>
              <div>
                <span className="font-extrabold text-sm sm:text-base">
                  {urgency.label}
                </span>
                <p className="text-xs opacity-80 mt-0.5">
                  Expiry Date: <strong className="font-bold">{item.expiryDate || 'Unknown'}</strong>
                  {item.mfgDate && <span className="ml-2 font-normal">• Mfg: <strong className="font-bold">{item.mfgDate}</strong></span>}
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="font-bold opacity-80">Tracked Value:</span>
              <div className="font-extrabold text-sm">
                {settings.currencySymbol}{item.estimatedValue || 100}
              </div>
            </div>
          </div>

          {/* Dual Date Showcase: Manufacturing & Expiry Dates */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                🏭 Manufacturing Date
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {item.mfgDate || 'Production Batch Record'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                📅 Real Expiry Date
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {item.expiryDate || 'Calculated Valid'}
              </span>
            </div>
          </div>

          {/* HEALTH & NUTRITION SCORE CARD */}
          {healthScore && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/50 dark:from-slate-850 dark:to-slate-850 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      Clean Eating & Health Score
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {healthScore.verdict}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                      {healthScore.score}<span className="text-xs text-slate-400">/100</span>
                    </span>
                    <span className="text-[10px] font-bold block text-emerald-600 dark:text-emerald-400">
                      Grade {healthScore.grade}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm ${
                    healthScore.grade === 'A' ? 'bg-emerald-600' : healthScore.grade === 'B' ? 'bg-teal-600' : healthScore.grade === 'C' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}>
                    {healthScore.grade}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="font-semibold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  🏷️ {healthScore.novaClass}
                </span>
                {healthScore.dietaryTags.map((t, idx) => (
                  <span key={idx} className="font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                    ✨ {t}
                  </span>
                ))}
              </div>

              {healthScore.positivePoints && healthScore.positivePoints.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-emerald-100 dark:border-slate-800">
                  <strong className="text-emerald-700 dark:text-emerald-400">Key Nutrients:</strong> {healthScore.positivePoints.join(' • ')}
                </div>
              )}
            </div>
          )}

          {/* Edit Panel (if toggled) */}
          {isEditing ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Edit Details</h4>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Storage / Usage Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : null}

          {/* PRODUCT INTELLIGENCE (REAL EXPIRY, COMPOSITION & LIFESPAN) */}
          {productIntelligence && (
            <ProductIntelligenceCard intelligenceData={productIntelligence} isCompact={true} />
          )}

          {/* EXPIRY ALARM & WARNING SIGN OPTION PANEL */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50/70 via-amber-50/40 to-slate-50 dark:from-slate-850 dark:via-rose-950/20 dark:to-slate-850 border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  🚨
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    Expiry Alarm & Warning Sign Options
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure audio alarm ringtone & visual danger sign for this product
                  </p>
                </div>
              </div>

              {/* Sound Alarm Now Button */}
              <button
                onClick={() => triggerAlarmForItem(item)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all animate-pulse self-start sm:self-auto"
                title="Sound alarm sound right now"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Sound Alarm Now</span>
              </button>
            </div>

            {/* Warning Sign Style Selector */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Visual Warning Sign Option:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WARNING_SIGN_OPTIONS.map(sign => {
                  const isSelected = (item.warningSign || settings.defaultWarningSign || 'flashing-siren') === sign.id;
                  return (
                    <button
                      key={sign.id}
                      onClick={() => updateItem(item.id, { warningSign: sign.id })}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center space-x-2 ${
                        isSelected
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm scale-102'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                      }`}
                    >
                      <span className="text-lg">{sign.icon}</span>
                      <div className="truncate">
                        <span className="font-extrabold text-xs block truncate">{sign.name}</span>
                        <span className={`text-[10px] block truncate ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                          {sign.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alarm Sound Selector & Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300">
                  Audio Alarm Ringtone:
                </label>
                <span className="text-[10px] text-slate-400">Click 🔊 to test sound</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALARM_SOUND_TYPES.map(snd => {
                  const isSelected = (item.alarmSound || settings.alarmSoundDefault || 'siren') === snd.id;
                  return (
                    <div
                      key={snd.id}
                      className={`p-2 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/20 shadow-xs'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={() => updateItem(item.id, { alarmSound: snd.id })}
                        className="flex items-center space-x-2 text-left flex-1 truncate"
                      >
                        <span className="text-base">{snd.icon}</span>
                        <div className="truncate">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">
                            {snd.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {snd.description}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => previewAlarmSound(snd.id)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-700 text-xs font-bold transition-colors ml-1.5 shrink-0"
                        title="Preview audio tone"
                      >
                        🔊 Test
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Photo Gallery (Front & Back) */}
          {(item.frontImage || item.backImage) && (
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2.5">
                Attached Package Photos
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {item.frontImage && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-center">
                    <img src={item.frontImage} alt="Front" className="w-full h-36 object-contain rounded-xl mb-1" />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Front Label</span>
                  </div>
                )}
                {item.backImage && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-center">
                    <img src={item.backImage} alt="Back" className="w-full h-36 object-contain rounded-xl mb-1" />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Back (Label & Expiry)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ingredients & Decoded Components */}
          {item.ingredientsOriginal && item.ingredientsOriginal.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Ingredients List ({item.ingredientsOriginal.length})
                </h4>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  Tap to decode safety & health
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.ingredientsOriginal.map((ing, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIngredient(ing)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-800 dark:text-slate-200 hover:text-emerald-950 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>{ing}</span>
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes or Shelf-life advice */}
          {item.notes && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-extrabold text-slate-900 dark:text-white block mb-0.5">Notes:</span>
              {item.notes}
            </div>
          )}

          {/* Contextual Zero-Waste Action Callout: Cook Recipes or Safe Disposal Protocol */}
          {onNavigateToRecipes && (
            <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              item.type === 'medicine' || urgency.color === 'red'
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
                : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
            }`}>
              <div className="flex items-center space-x-3">
                <span className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-2xs text-lg shrink-0">
                  {item.type === 'medicine' ? '💊' : urgency.color === 'red' ? '⚠️' : '👨‍🍳'}
                </span>
                <div>
                  <span className="font-extrabold text-xs block">
                    {item.type === 'medicine'
                      ? 'Expired Medicine Safe Disposal Protocol'
                      : urgency.color === 'red'
                      ? 'Post-Expiry Safe Action & Food Repurposing'
                      : 'Cook Zero-Waste Recipe With This Ingredient'}
                  </span>
                  <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                    {item.type === 'medicine'
                      ? 'Never flush down sinks! Follow the sealed coffee-grounds trash method or pharmacy drop-box.'
                      : urgency.color === 'red'
                      ? 'Check if this item can be converted into cheese/fertilizer, or if it violates health safety red lines.'
                      : 'Calculate protein, carbs, healthy fats, and step-by-step 15-minute quick prep.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onNavigateToRecipes();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto text-center shrink-0 ${
                  item.type === 'medicine' || urgency.color === 'red'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {item.type === 'medicine' || urgency.color === 'red'
                  ? 'View Disposal Guide →'
                  : 'View Instant Recipes →'}
              </button>
            </div>
          )}

          {/* Tracking Timestamps */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Date Added: {item.dateAdded || 'Recently'}</span>
            {item.mfgDate && <span>MFG Date: {item.mfgDate}</span>}
          </div>

        </div>

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={() => {
                deleteItem(item.id);
                onClose();
              }}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                markAsWasted(item.id);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 hover:text-rose-700 text-xs font-bold transition-colors"
            >
              Mark Wasted
            </button>

            <button
              onClick={() => {
                markAsUsed(item.id);
                onClose();
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Used</span>
            </button>
          </div>

        </div>

      </div>

      {/* Selected Ingredient Explanation Modal */}
      <IngredientModal
        isOpen={!!selectedIngredient}
        onClose={() => setSelectedIngredient(null)}
        ingredientName={selectedIngredient}
        itemType={item.type}
      />

    </div>
  );
}
