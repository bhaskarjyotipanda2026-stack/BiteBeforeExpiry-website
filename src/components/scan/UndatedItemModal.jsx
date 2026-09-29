import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Calendar, Tag, Check, ArrowRight, Loader2, 
  HelpCircle, Camera, Upload, ShieldCheck, Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ALL_CATEGORIES, GROCERY_CATEGORIES } from '../../constants';
import { estimateExpiry } from '../../services/aiService';

export function UndatedItemModal({ isOpen, onClose, initialData = null, onSaved }) {
  const { addItem, settings, showToast } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState('grocery');
  const [category, setCategory] = useState('Dairy & Milk Products');
  const [photo, setPhoto] = useState(null);
  const [estimatedValue, setEstimatedValue] = useState(settings.defaultItemValue || 100);
  const [notes, setNotes] = useState('');

  // Mode: 'choice' (showing two options), 'ai_estimate', 'manual_date'
  const [mode, setMode] = useState('choice');

  // AI Estimation State
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [manualDate, setManualDate] = useState('');

  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name || '');
      setType(initialData.type || 'grocery');
      setCategory(initialData.category || 'Dairy & Milk Products');
      setPhoto(initialData.frontImage || initialData.backImage || null);
      setEstimatedValue(initialData.estimatedValue || settings.defaultItemValue || 100);
      setNotes(initialData.notes || '');
      setMode('choice');
      setAiSuggestion(null);
      setManualDate('');
    } else if (isOpen) {
      setName('');
      setType('grocery');
      setCategory('Dairy & Milk Products');
      setPhoto(null);
      setEstimatedValue(settings.defaultItemValue || 100);
      setNotes('');
      setMode('choice');
      setAiSuggestion(null);
      setManualDate('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Trigger AI Estimation
  const handleRunAiEstimation = async () => {
    if (!name.trim()) {
      showToast('Please enter an item name first to estimate shelf life', 'warning');
      return;
    }

    setIsEstimating(true);
    setMode('ai_estimate');

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await estimateExpiry(name, category, today, settings.apiKeys);
      setAiSuggestion(result);
      setManualDate(result.estimatedExpiryDate);
    } catch (err) {
      console.error('AI Estimation error:', err);
      showToast('Failed to connect to estimation service. You can enter manually.', 'warning');
      setMode('manual_date');
    } finally {
      setIsEstimating(false);
    }
  };

  // Save Item (either AI-estimated or Manual)
  const handleSaveItem = (source) => {
    if (!name.trim()) {
      showToast('Please enter an item name', 'warning');
      return;
    }

    const expiryToSave = source === 'ai_estimated' ? (aiSuggestion?.estimatedExpiryDate || manualDate) : manualDate;

    if (!expiryToSave) {
      showToast('Please specify an expiry date', 'warning');
      return;
    }

    const saved = addItem({
      name,
      type,
      category,
      frontImage: photo,
      expiryDate: expiryToSave,
      expirySource: source, // 'ai_estimated' or 'manual'
      estimatedValue: Number(estimatedValue) || 100,
      notes: notes || (source === 'ai_estimated' ? `AI shelf life: ${aiSuggestion?.reasoning || 'Standard shelf life'}` : 'Manually entered date')
    });

    showToast(`Added "${name}" with ${source === 'ai_estimated' ? '~estimated' : 'manual'} expiry date!`, 'success');
    
    if (onSaved) onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                Undated Item Assistant
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                Add Item Without Expiry Date
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              placeholder="e.g. Fresh Dairy Paneer, Homemade Soup, Farm Apples"
            />
          </div>

          {/* Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Product Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
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
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                {ALL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Photo Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Optional Photo
            </label>
            <div className="flex items-center space-x-3">
              {photo ? (
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 group">
                  <img src={photo} alt="Item" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhoto(null)}
                    className="absolute inset-0 bg-red-600/80 text-white font-bold text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <label className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer transition-all">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Attach Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Helps AI evaluate visual freshness & packaging type
              </span>
            </div>
          </div>

          {/* ----------------------------------------------- */}
          {/* TWO CHOICES: (a) AI Estimate vs (b) Manual Date */}
          {/* ----------------------------------------------- */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Choose How to Set Expiry:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              
              {/* Option A: AI Shelf-Life Estimator */}
              <button
                type="button"
                onClick={handleRunAiEstimation}
                disabled={isEstimating}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  mode === 'ai_estimate'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50/30'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Estimate with AI
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  AI predicts shelf life based on product type, typical refrigeration, and food safety standards.
                </p>
              </button>

              {/* Option B: Manual Date Picker */}
              <button
                type="button"
                onClick={() => setMode('manual_date')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  mode === 'manual_date'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Enter Manually
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Type or pick your own expected expiry or discard date with a calendar picker.
                </p>
              </button>
            </div>

            {/* AI Estimation Result Panel */}
            {mode === 'ai_estimate' && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 animate-slide-up space-y-3">
                {isEstimating ? (
                  <div className="py-6 text-center">
                    <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Consulting Food Shelf-Life AI...</p>
                    <p className="text-[11px] text-slate-500">Calculating safe consumption window</p>
                  </div>
                ) : aiSuggestion ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                            ~AI Suggestion
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            (+{aiSuggestion.shelfLifeDays} days shelf life)
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                          Estimated Expiry: {aiSuggestion.estimatedExpiryDate}
                        </h4>
                      </div>
                      <span className="text-xl">✨</span>
                    </div>

                    {/* AI Reasoning quote */}
                    <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 italic">
                      "{aiSuggestion.reasoning}"
                    </div>

                    {/* Allow user to adjust date if desired */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Accept or Adjust Date:
                      </label>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveItem('ai_estimated')}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm & Save (~estimated)</span>
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* Manual Date Input Panel */}
            {mode === 'manual_date' && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 animate-slide-up space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                    Select Expected Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-emerald-300 dark:border-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Will be tagged as <strong className="text-emerald-800 dark:text-emerald-300">manual</strong> on your dashboard.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveItem('manual')}
                  disabled={!manualDate}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Item to Dashboard</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
