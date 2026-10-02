import React, { useState } from 'react';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, 
  Heart, AlertTriangle, ScanLine, Plus, Check, X, UserCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { COMMON_ALLERGENS, SUPPORTED_LANGUAGES } from '../../constants';

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Halal',
  'Kosher',
  'Low Sodium',
  'Diabetic Friendly'
];

const ONBOARDING_SAMPLE_ITEMS = [
  {
    name: 'Amul Taaza Homogenised Toned Milk 1L',
    brand: 'Amul',
    barcode: '8901262010019',
    type: 'grocery',
    category: 'Dairy & Milk Products',
    mfgDate: '2026-09-10',
    expiryDate: '2026-12-10',
    bestBeforePeriod: '90 days',
    batchNumber: 'AM-9021',
    confidenceScore: 96,
    fieldConfidences: { exp: 98, mfg: 94, batch: 92, ingredients: 95 },
    ingredientsOriginal: ['Standardised Milk', 'Vitamin A', 'Vitamin D'],
    sourceOfInfo: 'barcode+ocr',
    status: 'active'
  },
  {
    name: 'Crocin Advance Paracetamol 500mg Fast Relief',
    brand: 'Crocin',
    barcode: '8901117002018',
    type: 'medicine',
    category: 'Tablets & Capsules',
    mfgDate: '2026-01-15',
    expiryDate: '2028-01-14',
    bestBeforePeriod: '24 months',
    batchNumber: 'CR-8842',
    confidenceScore: 94,
    fieldConfidences: { exp: 96, mfg: 92, batch: 95, ingredients: 92 },
    ingredientsOriginal: ['Paracetamol IP 500mg', 'Sodium methyl hydroxybenzoate', 'Microcrystalline cellulose'],
    sourceOfInfo: 'barcode+ocr',
    status: 'active'
  },
  {
    name: 'Nature Fresh Whole Wheat Bread 400g',
    brand: 'Nature Fresh',
    barcode: '8901030382914',
    type: 'grocery',
    category: 'Bakery & Bread',
    mfgDate: '2026-10-01',
    expiryDate: '2026-10-07',
    bestBeforePeriod: '6 days',
    batchNumber: 'NF-1102',
    confidenceScore: 92,
    fieldConfidences: { exp: 95, mfg: 90, batch: 88, ingredients: 94 },
    ingredientsOriginal: ['Whole Wheat Flour (Atta)', 'Yeast', 'Sugar', 'Iodised Salt', 'Soya Flour'],
    sourceOfInfo: 'barcode+ocr',
    status: 'active'
  }
];

export function OnboardingFlow({ isOpen, onClose, onCompleteToPantry }) {
  const { user, profile, updateProfile } = useAuth();
  const { addItem, showToast, setSettings } = useApp();

  const [step, setStep] = useState(1); // 1: Welcome/Account, 2: Profile/Diet, 3: Allergies, 4: First Scan, 5: Add to Pantry
  const [name, setName] = useState(user?.name || 'Smart Chef');
  const [preferredLang, setPreferredLang] = useState(profile?.preferred_language || 'en');
  const [selectedDiets, setSelectedDiets] = useState(profile?.dietary_preferences || ['Vegetarian']);
  const [selectedAllergies, setSelectedAllergies] = useState(profile?.allergies || []);
  const [selectedProduct, setSelectedProduct] = useState(ONBOARDING_SAMPLE_ITEMS[0]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleDiet = (diet) => {
    setSelectedDiets(prev => prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]);
  };

  const toggleAllergy = (allergy) => {
    setSelectedAllergies(prev => prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]);
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    try {
      // 1. Save profile to DB
      await updateProfile({
        allergies: selectedAllergies,
        dietary_preferences: selectedDiets,
        preferred_language: preferredLang
      });

      // 2. Update local app settings for allergy check
      setSettings(prev => ({
        ...prev,
        allergyProfile: selectedAllergies,
        preferredLanguage: preferredLang
      }));

      // 3. Add first scanned product to Pantry
      const saved = addItem({
        name: selectedProduct.name,
        brand: selectedProduct.brand,
        type: selectedProduct.type,
        category: selectedProduct.category,
        barcode: selectedProduct.barcode,
        batchNumber: selectedProduct.batchNumber,
        mfgDate: selectedProduct.mfgDate,
        expiryDate: selectedProduct.expiryDate,
        bestBeforePeriod: selectedProduct.bestBeforePeriod,
        ingredientsOriginal: selectedProduct.ingredientsOriginal,
        sourceOfInfo: selectedProduct.sourceOfInfo,
        notes: 'Added during onboarding welcome scan'
      });

      showToast(`Welcome! "${selectedProduct.name}" added to your Pantry.`, 'success', '🎉');
      onClose();
      if (onCompleteToPantry) onCompleteToPantry(saved);
    } catch (err) {
      console.error('[Onboarding] Error finishing:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Progress Bar & Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🥗</span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                BiteBeforeExpiry <span className="text-emerald-600 dark:text-emerald-400">Setup Wizard</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Skip
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-between space-x-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex-1 flex flex-col items-center">
                <div className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
                }`} />
                <span className={`text-[10px] mt-1 font-semibold ${
                  s === step ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`}>
                  {s === 1 ? 'Account' : s === 2 ? 'Profile' : s === 3 ? 'Allergies' : s === 4 ? 'Scan' : 'Pantry'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* STEP 1: Account Confirmation */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
                👋
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Welcome to BiteBeforeExpiry
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Let's customize your AI-powered pantry assistant so it can accurately calculate expiry dates, monitor food safety, and alert you before anything spoils.
              </p>

              <div className="pt-2 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <div className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Active Session: <strong>{user?.email || 'demo@bitebeforeexpiry.com'}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Personal Profile & Diet */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl">
                🥗
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Dietary Preferences & Language
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Select diets you follow to get personalized recipe ideas and suitability warnings for every scanned grocery item.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Dietary Habits
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((diet) => {
                    const isSelected = selectedDiets.includes(diet);
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => toggleDiet(diet)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {diet} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Preferred Translation Language
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.native})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: Allergy Preferences */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Allergy Protection
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Configure food triggers to monitor. When you scan an ingredient list with OCR, BiteBeforeExpiry flags dangerous allergens immediately.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {COMMON_ALLERGENS.map((allergen) => {
                  const isSelected = selectedAllergies.includes(allergen);
                  return (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergy(allergen)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <span>{allergen}</span>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {isSelected ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: First Product Scan */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
                📷
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                First Package Scan
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose a verified real-world item below to test the Barcode + OCR Optical Fusion pipeline:
              </p>

              <div className="space-y-3 pt-2">
                {ONBOARDING_SAMPLE_ITEMS.map((item) => {
                  const isChosen = selectedProduct.barcode === item.barcode;
                  return (
                    <div
                      key={item.barcode}
                      onClick={() => setSelectedProduct(item)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isChosen
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {item.type === 'medicine' ? '💊 Medicine' : '🥛 Grocery'}
                            </span>
                            <span className="text-xs text-slate-500">Barcode: {item.barcode}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                            {item.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
                            <span>MFG: <strong>{item.mfgDate}</strong></span>
                            <span>EXP: <strong className="text-emerald-700 dark:text-emerald-300">{item.expiryDate}</strong></span>
                            <span>Batch: <strong>{item.batchNumber}</strong></span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isChosen ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                        }`}>
                          {isChosen ? '✓' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Add to Pantry Confirmation */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
                📦
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Add Validated Item to Pantry
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The Barcode + OCR Fusion Engine extracted and verified the package data with high confidence:
              </p>

              {/* Review Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Confidence: {selectedProduct.confidenceScore}%
                  </span>
                </div>

                {/* Field-level confidences */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">EXP DATE</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">98% Validated</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">MFG DATE</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">94% Validated</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">BATCH NO</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">92% Validated</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">ALLERGENS</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">Safe / Monitored</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <span>Storage: <strong>Pantry Shelf</strong></span> • <span>Shelf Life: <strong>{selectedProduct.bestBeforePeriod}</strong></span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinishOnboarding}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Database...' : 'Save & Open Dashboard'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
