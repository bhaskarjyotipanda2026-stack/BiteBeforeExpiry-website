import React, { useState, useMemo } from 'react';
import { 
  Camera, Upload, Sparkles, X, Plus, Check, Loader2, 
  ChefHat, ArrowRight, RefreshCw, ShoppingBasket, Info,
  Clock, Flame, HeartPulse, ChevronDown, ChevronUp, Utensils, CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  detectIngredientsFromImage, 
  KITCHEN_SAMPLE_SNAPSHOTS,
  generateRecipesForItems,
  DIETARY_GOALS
} from '../../services/recipeService';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import { triggerCelebration } from '../../services/streakService';

export function PantryVisionScannerModal({ isOpen, onClose, onIngredientsConfirmed }) {
  const { settings, showToast, addItem } = useApp();

  const [imagePreview, setImagePreview] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [progress, setProgress] = useState(0);

  // Detected & editable ingredients list
  const [detectedItems, setDetectedItems] = useState(['Milk', 'Bread', 'Eggs']);
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [saveToPantry, setSaveToPantry] = useState(true);

  // Dietary goal filter for recipes
  const [dietaryGoal, setDietaryGoal] = useState('all');

  // Recipe expansion state
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [cookedRecipeIds, setCookedRecipeIds] = useState([]);

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Calculate instant recipes right from detected home ingredients & selected dietary goal
  const instantRecipes = useMemo(() => {
    if (!detectedItems || detectedItems.length === 0) return [];
    const tempPantryItems = detectedItems.map((name, idx) => ({
      id: `scanned_ing_${idx}`,
      name,
      category: 'Available Kitchen Ingredient',
      type: 'grocery'
    }));
    return generateRecipesForItems(tempPantryItems, settings.apiKeys, dietaryGoal);
  }, [detectedItems, settings.apiKeys, dietaryGoal]);

  if (!isOpen) return null;

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedSnapshot(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setDetectedItems([]);
    };
    reader.readAsDataURL(file);
  };

  // Load a quick-test snapshot
  const handleSelectSnapshot = (snapshot) => {
    setSelectedSnapshot(snapshot);
    setImagePreview(snapshot.image);
    setDetectedItems(snapshot.detectedIngredients);
    showToast(`Loaded ${snapshot.title} snapshot! Instant recipes updated below.`, 'info');
  };

  // Run the Vision / OCR ingredient detector
  const handleRunDetection = async () => {
    if (!imagePreview && !selectedSnapshot) {
      showToast('Please take a photo, upload an image, or pick a sample snapshot', 'warning');
      return;
    }

    setIsScanning(true);
    setProgress(15);
    setScanStatus('Initializing kitchen vision engine...');

    try {
      const source = selectedSnapshot || imagePreview;
      const result = await detectIngredientsFromImage(source, settings.apiKeys, (p) => {
        setScanStatus(p.status);
        setProgress(Math.round(p.progress * 100));
      });

      setProgress(100);
      setDetectedItems(result.detectedIngredients || ['Bread', 'Milk', 'Eggs']);
      showToast(`Detected ${result.detectedIngredients.length} ingredients from your kitchen photo!`, 'success', '✨');
    } catch (err) {
      console.error('Detection failed:', err);
      showToast('Could not read image clearly. Loaded default staples for recipes below.', 'warning');
      setDetectedItems(['Bread', 'Milk', 'Eggs']);
    } finally {
      setIsScanning(false);
    }
  };

  // Add a custom ingredient manually
  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (!newIngredientInput.trim()) return;

    const clean = newIngredientInput.trim();
    if (!detectedItems.map(i => i.toLowerCase()).includes(clean.toLowerCase())) {
      setDetectedItems(prev => [...prev, clean]);
      showToast(`Added ${clean} to available kitchen ingredients!`, 'success');
    }
    setNewIngredientInput('');
  };

  // Remove an ingredient
  const handleRemoveIngredient = (index) => {
    setDetectedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Cook a specific instant recipe directly
  const handleCookRecipe = (recipe) => {
    setCookedRecipeIds(prev => [...prev, recipe.id]);
    triggerCelebration('used');
    showToast(`Bon appétit! Made "${recipe.title}" with available ingredients!`, 'success', '👨‍🍳');
  };

  // Confirm and proceed
  const handleConfirmAndCook = () => {
    if (detectedItems.length === 0) {
      showToast('Please have at least 1 ingredient selected to generate recipes', 'warning');
      return;
    }

    // Optionally save these detected items into user's pantry dashboard as active groceries
    if (saveToPantry) {
      detectedItems.forEach(name => {
        addItem({
          name: `${name} (Scanned)`,
          type: 'grocery',
          category: 'Vegetables & Fruits',
          expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          expirySource: 'ai_estimated',
          notes: 'Scanned via Kitchen Vision Scanner for instant cooking'
        });
      });
    }

    if (onIngredientsConfirmed) {
      onIngredientsConfirmed(detectedItems);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                  Kitchen AI Vision
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Instant Food Maker</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                Scan Available Ingredients & Make Food
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

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Quick Snapshot Presets */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-slate-50 dark:from-slate-800/60 dark:to-slate-800/30 border border-emerald-200/70 dark:border-emerald-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                <span>⚡ 1-Click Test Kitchen Snapshots:</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Try instant scan without a camera</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {KITCHEN_SAMPLE_SNAPSHOTS.map(snap => (
                <button
                  key={snap.id}
                  onClick={() => handleSelectSnapshot(snap)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2 ${
                    selectedSnapshot?.id === snap.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-850 hover:bg-emerald-50/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-lg">🥑</span>
                  <div className="truncate">
                    <span className="font-extrabold text-xs block truncate">{snap.title}</span>
                    <span className={`text-[10px] block truncate ${selectedSnapshot?.id === snap.id ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {snap.subtitle.split(',')[0]}...
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Capture / Upload Canvas */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
            {imagePreview ? (
              <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden bg-slate-900 mx-auto flex items-center justify-center group">
                <img src={imagePreview} alt="Kitchen preview" className="w-full h-full object-contain" />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedSnapshot(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-2">
                  <Camera className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Take or Upload a Photo of Your Fridge or Counter
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
                  Our Vision AI detects milk, bread, eggs, cheese, paneer, veggies, and pantry staples.
                </p>
              </div>
            )}

            {/* Input Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
              <button
                onClick={() => setCameraModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Open Camera</span>
              </button>

              <label className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>

              {imagePreview && (
                <button
                  onClick={handleRunDetection}
                  disabled={isScanning}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
                      <span>Detect Ingredients</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress indicator during scanning */}
            {isScanning && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <span>{scanStatus}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Detected Ingredients Interactive Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Detected Available Ingredients ({detectedItems.length})</span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Click ✕ to remove or add more below</span>
            </div>

            {detectedItems.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl min-h-[52px] items-center">
                {detectedItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-bold text-xs shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-slate-400 hover:text-rose-600 font-extrabold text-xs ml-0.5"
                      title="Remove ingredient"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                No ingredients detected yet. Take a photo above, pick a snapshot, or type ingredients below.
              </div>
            )}

            {/* Quick Add Custom Ingredient Bar */}
            <form onSubmit={handleAddIngredient} className="mt-2.5 flex items-center space-x-2">
              <input
                type="text"
                value={newIngredientInput}
                onChange={(e) => setNewIngredientInput(e.target.value)}
                placeholder="Type another ingredient at home (e.g. Garlic, Onion, Pasta, Curd)..."
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newIngredientInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all flex items-center space-x-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* USER OPTIONS & DIETARY GOALS FILTER TABS */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <span>🎯 Select Dietary & Fitness Goal:</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {DIETARY_GOALS.find(g => g.id === dietaryGoal)?.description}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 mb-3">
              {DIETARY_GOALS.map(goal => {
                const isSelected = dietaryGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setDietaryGoal(goal.id)}
                    className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">{goal.icon}</span>
                      <span className="font-extrabold text-[11px] truncate">{goal.label}</span>
                    </div>
                    <span className={`text-[9px] block truncate font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {goal.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC INSTANT RECIPES DIRECTLY IN SCANNER VIEW */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span className="text-lg">🍲</span>
                  <span>Instant Recipes Ready To Make ({instantRecipes.length})</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Made with your scanned ingredients • Protein, Carbs, Fats & Fiber computed:
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Ready in &lt;15 Mins
              </span>
            </div>

            {instantRecipes.length > 0 ? (
              <div className="space-y-3">
                {instantRecipes.map((recipe) => {
                  const isExpanded = expandedRecipeId === recipe.id;
                  const isCooked = cookedRecipeIds.includes(recipe.id);

                  return (
                    <div
                      key={recipe.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isCooked
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Recipe Card Header */}
                      <div className="p-3.5 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex-1">
                            {/* Health Score & Timing Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <HeartPulse className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Health Score: {recipe.nutrition.healthScore}/100 ({recipe.nutrition.healthGrade})</span>
                              </span>

                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Clock className="w-2.5 h-2.5 text-amber-500" />
                                <span>⏱️ Total: {recipe.timing.total} (Prep {recipe.timing.prep} • Cook {recipe.timing.cook})</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {recipe.title}
                              </span>
                              {recipe.matchedItemNames && recipe.matchedItemNames.length > 0 && (
                                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Uses: {recipe.matchedItemNames.join(', ')}
                                </span>
                              )}
                            </div>

                            {/* Macro Badges: Protein, Carbs, Fats, Fiber, Calories */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center space-x-1">
                                <span>🥩</span>
                                <span>Protein: <strong>{recipe.nutrition.protein}</strong></span>
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center space-x-1">
                                <span>🍞</span>
                                <span>Carbs: <strong>{recipe.nutrition.carbs}</strong></span>
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 flex items-center space-x-1">
                                <span>🥑</span>
                                <span>Fats: <strong>{recipe.nutrition.fats}</strong></span>
                              </span>
                              {/* Required Fiber Metric */}
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
                                <span>🌾</span>
                                <span>Fiber: <strong>{recipe.nutrition.fiber}</strong> ({recipe.nutrition.fiberDailyValue})</span>
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 flex items-center space-x-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                <span>{recipe.nutrition.calories}</span>
                              </span>
                              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg border ${
                                recipe.nutrition.isHealthy
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                              }`}>
                                {recipe.nutrition.healthinessRating}
                              </span>
                            </div>

                            {/* Required Fiber Health Benefit Box */}
                            <div className="mt-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300 flex items-start space-x-1.5">
                              <span className="shrink-0">🌾</span>
                              <span><strong>Required Fiber for Health:</strong> {recipe.nutrition.fiberHealthBenefit}</span>
                            </div>
                          </div>

                          {/* Quick Actions: Cook & Expand */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleCookRecipe(recipe)}
                              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                isCooked
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isCooked ? 'Cooked! 🎉' : 'Cook Meal'}</span>
                            </button>

                            <button
                              onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1"
                              title={isExpanded ? 'Hide Steps' : 'View Cooking Steps'}
                            >
                              <span className="text-[11px]">{isExpanded ? 'Hide' : 'Recipe'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Step-by-Step Cooking Guide */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in text-xs">
                          {/* Ingredients needed */}
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] block mb-1">
                              🛒 Ingredients & Pantry Rescue:
                            </span>
                            <ul className="space-y-1 pl-3 text-slate-600 dark:text-slate-300">
                              {recipe.ingredientsList.map((ing, i) => (
                                <li key={i} className="list-disc">
                                  {ing}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Cooking steps */}
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] block mb-1">
                              🍳 Simple Cooking Steps ({recipe.prepTime}):
                            </span>
                            <ol className="space-y-1.5 pl-4 text-slate-700 dark:text-slate-300 list-decimal font-medium">
                              {recipe.steps.map((st, i) => (
                                <li key={i}>
                                  {st}
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Chef tip */}
                          {recipe.chefTip && (
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-[11px] font-medium flex items-start space-x-2">
                              <span className="text-base shrink-0">💡</span>
                              <span><strong>Chef Tip:</strong> {recipe.chefTip}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                Add at least one grocery staple (e.g. Milk, Bread, Eggs, Paneer) to show matching recipes.
              </div>
            )}
          </div>

          {/* Option: Also save to pantry */}
          <div className="flex items-center space-x-2.5 pt-1">
            <input
              type="checkbox"
              id="save-pantry-chk"
              checked={saveToPantry}
              onChange={(e) => setSaveToPantry(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="save-pantry-chk" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Also save detected items to my Pantry Dashboard (with 5-day estimated expiry)
            </label>
          </div>

        </div>

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleConfirmAndCook}
            disabled={detectedItems.length === 0}
            className="flex items-center space-x-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
          >
            <ChefHat className="w-4 h-4" />
            <span>Open in Full Chef Tab ({detectedItems.length} items)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        label="Fridge or Kitchen Ingredients"
        onCapture={(dataUrl) => {
          setImagePreview(dataUrl);
          setSelectedSnapshot(null);
          setDetectedItems([]);
        }}
      />

    </div>
  );
}
