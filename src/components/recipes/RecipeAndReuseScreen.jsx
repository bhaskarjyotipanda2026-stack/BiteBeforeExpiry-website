import React, { useState, useMemo } from 'react';
import { 
  ChefHat, Sparkles, Utensils, AlertTriangle, ShieldCheck, Flame, 
  CheckCircle2, Clock, Info, ArrowRight, RefreshCw, Trash2, HeartPulse,
  Leaf, Search, ChevronDown, ChevronUp, Check, Droplets, BookOpen, Camera,
  Dumbbell, Apple, Activity, Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  generateRecipesForItems, 
  POST_EXPIRY_GUIDELINES, 
  DIETARY_GOALS 
} from '../../services/recipeService';
import { triggerCelebration } from '../../services/streakService';
import { PantryVisionScannerModal } from './PantryVisionScannerModal';

export function RecipeAndReuseScreen({ onNavigateToScan, onNavigateToDashboard }) {
  const { items, markAsUsed, markAsDiscarded, getDaysRemaining, settings, showToast } = useApp();

  // Active view: 'recipes' (Zero-waste chef) or 'disposal' (Post-expiry guide)
  const [activeSubTab, setActiveSubTab] = useState('recipes');

  // Fitness / Dietary Option Filter (e.g. 'all', 'gym', 'dieting', 'protein-rich', 'high-fiber', 'low-fiber')
  const [dietaryGoal, setDietaryGoal] = useState('all');

  // Filter for post-expiry guidelines
  const [disposalCategory, setDisposalCategory] = useState('all'); // 'all', 'medicines', 'groceries', 'hazard'
  const [disposalSearch, setDisposalSearch] = useState('');

  // Selected recipe detail expansion
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);

  // Expiring items in user's pantry (groceries nearing expiry)
  const expiringGroceries = useMemo(() => {
    return items.filter(item => {
      if (item.status === 'used' || item.status === 'wasted') return false;
      if (item.type !== 'grocery') return false;
      const days = getDaysRemaining(item.expiryDate);
      return days !== null && days <= (settings.notificationLeadDays || 5);
    });
  }, [items, settings.notificationLeadDays, getDaysRemaining]);

  // Expired items (groceries or medicines)
  const expiredItems = useMemo(() => {
    return items.filter(item => {
      if (item.status === 'used' || item.status === 'wasted') return false;
      const days = getDaysRemaining(item.expiryDate);
      return days !== null && days < 0;
    });
  }, [items, getDaysRemaining]);

  // Active pantry items for recipe generation (groceries in pantry)
  const activeGroceries = useMemo(() => {
    return items.filter(i => i.type === 'grocery' && i.status !== 'used' && i.status !== 'wasted');
  }, [items]);

  // Selected ingredients checkbox state (default all active groceries selected)
  const [selectedItemIds, setSelectedItemIds] = useState(() => {
    return activeGroceries.map(i => i.id);
  });

  const toggleItemSelection = (id) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Kitchen vision scanner modal state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [extraScannedIngredients, setExtraScannedIngredients] = useState([]);

  // Detected available ingredients (combines selected pantry groceries + scanned kitchen ingredients)
  const availableDetectedIngredients = useMemo(() => {
    const selectedPantry = activeGroceries.filter(i => selectedItemIds.includes(i.id));
    const extraItems = extraScannedIngredients.map((name, idx) => ({
      id: `scanned_extra_${idx}`,
      name: name,
      category: 'Vegetables & Fruits',
      type: 'grocery'
    }));
    return [...selectedPantry, ...extraItems];
  }, [activeGroceries, selectedItemIds, extraScannedIngredients]);

  // STRICTLY generate recipes from ONLY the detected available ingredients and selected dietary goal
  const suggestedRecipes = useMemo(() => {
    return generateRecipesForItems(availableDetectedIngredients, settings.apiKeys, dietaryGoal);
  }, [availableDetectedIngredients, settings.apiKeys, dietaryGoal]);

  // Handle "Cooked This Recipe" action
  const handleCookedRecipe = (recipe) => {
    const matched = recipe.matchedItemIds || [];
    if (matched.length === 0) {
      showToast(`Enjoy your ${recipe.title}!`, 'success', '🍳');
      triggerCelebration('used');
      return;
    }

    matched.forEach(id => {
      markAsUsed(id);
    });

    triggerCelebration('used');
    showToast(`Great chef! Cooked "${recipe.title}" and saved ${matched.length} item(s) from expiry!`, 'success', '🎉');
  };

  // Filtered disposal guidelines
  const filteredGuidelines = useMemo(() => {
    let list = [];
    if (disposalCategory === 'all' || disposalCategory === 'medicines') {
      list = [...list, ...POST_EXPIRY_GUIDELINES.medicines];
    }
    if (disposalCategory === 'all' || disposalCategory === 'groceries') {
      list = [...list, ...POST_EXPIRY_GUIDELINES.groceries];
    }
    if (disposalCategory === 'hazard') {
      list = [
        ...POST_EXPIRY_GUIDELINES.medicines.filter(m => m.severity === 'critical-hazard'),
        ...POST_EXPIRY_GUIDELINES.groceries.filter(g => g.severity === 'critical-hazard')
      ];
    }

    if (disposalSearch.trim()) {
      const q = disposalSearch.toLowerCase();
      list = list.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.summary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keyTakeaway.toLowerCase().includes(q)
      );
    }

    return list;
  }, [disposalCategory, disposalSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Zero-Waste Kitchen & Nutrition</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Healthy Recipes from Available Ingredients
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Detect your available home ingredients to generate clean healthy recipes with exact cooking timings, required dietary fiber, health scores, and personalized dietary goals (Gym Man, Dieting, Protein Rich, Low Fiber).
          </p>
        </div>

        {/* Action Controls: Vision Scanner & Switcher Tabs */}
        <div className="flex items-center space-x-2.5 self-stretch sm:self-auto flex-wrap gap-y-2">
          {/* Scan Available Home Ingredients Button */}
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
            title="Scan your fridge, counter, or shelf to detect available ingredients"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Detect Ingredients at Home</span>
          </button>

          {/* Top Switcher Tabs */}
          <div className="flex items-center p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700">
            <button
              onClick={() => setActiveSubTab('recipes')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeSubTab === 'recipes'
                  ? 'bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ChefHat className="w-4 h-4 text-emerald-600 dark:text-white" />
              <span>👨‍🍳 Healthy Recipes</span>
            </button>

            <button
              onClick={() => setActiveSubTab('disposal')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeSubTab === 'disposal'
                  ? 'bg-white dark:bg-rose-600 text-rose-800 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-white" />
              <span>♻️ Disposal Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: HEALTHY RECIPES FROM AVAILABLE INGREDIENTS */}
      {/* ======================================================== */}
      {activeSubTab === 'recipes' && (
        <div className="space-y-6">
          
          {/* DETECTED AVAILABLE INGREDIENTS STATUS BAR */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Your Detected Available Ingredients ({availableDetectedIngredients.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Recipes below are strictly derived from these ingredients. Click any item to toggle or scan new ingredients.
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsScannerModalOpen(true)}
                  className="flex items-center space-x-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan More</span>
                </button>
                <button
                  onClick={() => setSelectedItemIds(activeGroceries.map(i => i.id))}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline px-2 py-1"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => {
                    setSelectedItemIds([]);
                    setExtraScannedIngredients([]);
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Interactive Ingredient Chips */}
            {activeGroceries.length > 0 || extraScannedIngredients.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Extra scanned ingredients from camera / pantry scanner */}
                {extraScannedIngredients.map((name, idx) => (
                  <span
                    key={`scanned-${idx}`}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-xs"
                  >
                    <span>📸 {name}</span>
                    <button
                      onClick={() => setExtraScannedIngredients(prev => prev.filter((_, i) => i !== idx))}
                      className="ml-1 text-emerald-200 hover:text-white font-black"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Pantry ingredients */}
                {activeGroceries.map(item => {
                  const isChecked = selectedItemIds.includes(item.id);
                  const days = getDaysRemaining(item.expiryDate);
                  const isExpiringSoon = days !== null && days <= (settings.notificationLeadDays || 5);

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all ${
                        isChecked
                          ? isExpiringSoon
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 shadow-xs ring-1 ring-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] text-white ${
                        isChecked ? (isExpiringSoon ? 'bg-amber-600' : 'bg-emerald-600') : 'bg-slate-300 dark:bg-slate-600'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{item.name}</span>
                      {isExpiringSoon && (
                        <span className="text-[10px] font-extrabold px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          {days <= 0 ? 'Today' : `${days}d`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  No available ingredients detected yet!
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Click "📸 Detect Ingredients at Home" above to scan your fridge or pantry shelf.
                </p>
              </div>
            )}
          </div>

          {/* USER OPTIONS & DIETARY GOALS FILTER TABS */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Tailor Recipes By Dietary & Fitness Goal
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  Choose Your Food Option:
                </h3>
              </div>
              <span className="text-xs text-slate-300 font-medium">
                {DIETARY_GOALS.find(g => g.id === dietaryGoal)?.description}
              </span>
            </div>

            {/* Dietary Goal Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {DIETARY_GOALS.map(goal => {
                const isSelected = dietaryGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setDietaryGoal(goal.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30 scale-102'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="text-base">{goal.icon}</span>
                      <span className="font-extrabold text-xs truncate">{goal.label}</span>
                    </div>
                    <span className={`text-[10px] block truncate font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {goal.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUGGESTED RECIPES MATCHING AVAILABLE INGREDIENTS */}
          {suggestedRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestedRecipes.map(recipe => {
                const isExpanded = expandedRecipeId === recipe.id;
                const hasPantryMatches = recipe.matchedItemNames && recipe.matchedItemNames.length > 0;

                return (
                  <div
                    key={recipe.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Recipe Header */}
                      <div className="p-5 sm:p-6 pb-4">
                        
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            {/* Health Score & Timing Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {/* Health Score Badge */}
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <HeartPulse className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Health Score: {recipe.nutrition.healthScore}/100 ({recipe.nutrition.healthGrade})</span>
                              </span>

                              {/* Cooking Timing Badge */}
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>⏱️ Total: {recipe.timing.total} (Prep {recipe.timing.prep} • Cook {recipe.timing.cook})</span>
                              </span>
                            </div>

                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                              {recipe.title}
                            </h3>
                          </div>

                          <span className="text-2xl p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 shrink-0">
                            🍳
                          </span>
                        </div>

                        {/* Matching Available Ingredients Pill */}
                        {hasPantryMatches && (
                          <div className="mt-2 p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between text-xs">
                            <span className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center space-x-1">
                              <span>⚡ Made with {recipe.matchedItemNames.length} available ingredient(s):</span>
                            </span>
                            <span className="font-bold text-amber-800 dark:text-amber-200 truncate max-w-[200px]">
                              {recipe.matchedItemNames.join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Comprehensive Nutritional Breakdown including REQUIRED FIBER */}
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                              Macro & Fiber Analysis
                            </span>
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {recipe.nutrition.healthinessRating}
                            </span>
                          </div>

                          {/* 5-Column Grid: Protein, Carbs, Fats, Fiber, Calories */}
                          <div className="grid grid-cols-5 gap-1.5 text-center">
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Protein</span>
                              <span className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-400">{recipe.nutrition.protein}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Carbs</span>
                              <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400">{recipe.nutrition.carbs}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Fats</span>
                              <span className="text-xs sm:text-sm font-black text-teal-700 dark:text-teal-400">{recipe.nutrition.fats}</span>
                            </div>
                            {/* REQUIRED FIBER METRIC FOR GOOD HEALTH */}
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
                              <span className="text-[9px] uppercase font-black text-emerald-800 dark:text-emerald-300 block">🌾 Fiber</span>
                              <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">{recipe.nutrition.fiber}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Calories</span>
                              <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">{recipe.nutrition.calories}</span>
                            </div>
                          </div>

                          {/* Fiber Health Role Note */}
                          <div className="mt-2.5 p-2 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-[11px] text-emerald-950 dark:text-emerald-200 flex items-start space-x-1.5">
                            <span className="text-sm shrink-0">🌾</span>
                            <span><strong>Required Fiber for Health:</strong> {recipe.nutrition.fiberHealthBenefit} ({recipe.nutrition.fiberDailyValue})</span>
                          </div>
                        </div>

                        {/* Expandable Ingredients & Instructions */}
                        <button
                          onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                          className="mt-3.5 w-full flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline py-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Cooking Steps & Ingredients' : `View Recipe Steps (${recipe.timing.total})`}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-slide-up text-xs">
                            {/* Ingredients */}
                            <div>
                              <span className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                                Ingredients & Pantry Items:
                              </span>
                              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                {recipe.ingredientsList.map((ing, idx) => (
                                  <li key={idx} className="flex items-start space-x-1.5">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                                    <span>{ing}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Steps with Cook Timing */}
                            <div>
                              <span className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                                Simple Cooking Steps ({recipe.timing.cook} on stove):
                              </span>
                              <ol className="space-y-1.5 text-slate-700 dark:text-slate-300">
                                {recipe.steps.map((st, idx) => (
                                  <li key={idx} className="flex items-start space-x-2">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <span className="leading-relaxed">{st}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Chef tip */}
                            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 italic">
                              👨‍🍳 <strong>Zero-Waste Tip:</strong> {recipe.chefTip}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Cooking Time: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{recipe.timing.total}</strong>
                      </div>

                      <button
                        onClick={() => handleCookedRecipe(recipe)}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cooked! Mark Used</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty state when no recipes match available ingredients or selected goal */
            <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center max-w-lg mx-auto shadow-sm my-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 text-3xl">
                🍳
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {availableDetectedIngredients.length === 0
                  ? 'No Available Ingredients Detected Yet'
                  : `No "${DIETARY_GOALS.find(g => g.id === dietaryGoal)?.label}" Meals Found`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
                {availableDetectedIngredients.length === 0
                  ? 'Scan your kitchen fridge or pantry shelf to detect available ingredients and unlock instant healthy recipes!'
                  : 'Try selecting "All Healthy Meals" or scan additional ingredients in your kitchen.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsScannerModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Available Ingredients</span>
                </button>

                {dietaryGoal !== 'all' && (
                  <button
                    onClick={() => setDietaryGoal('all')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
                  >
                    View All Healthy Meals
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: POST-EXPIRY ACTIONS & CLINICAL DISPOSAL GUIDE */}
      {/* ======================================================== */}
      {activeSubTab === 'disposal' && (
        <div className="space-y-6">
          
          {/* Top Notice: What to do with Expired Items */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white shadow-xl">
            <div className="max-w-3xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-rose-300">
                Post-Expiry Safety & Repurposing Protocols
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1">
                What Can We Do After Groceries or Medicines Expire?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Some groceries can be intelligently repurposed (like sour milk into fresh paneer or plant fertilizer, and stale bread into croutons). In contrast, <strong>expired medicines must NEVER be flushed or consumed</strong> — follow the safe household coffee-grounds disposal method or pharmacy collection bins.
              </p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Protocols' },
                { id: 'medicines', label: '💊 Medicines & Clinical' },
                { id: 'groceries', label: '🥗 Grocery Repurposing' },
                { id: 'hazard', label: '🚨 Safety Red Lines' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDisposalCategory(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    disposalCategory === tab.id
                      ? 'bg-slate-900 dark:bg-rose-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={disposalSearch}
                onChange={(e) => setDisposalSearch(e.target.value)}
                placeholder="Search disposal or repurposing..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

          </div>

          {/* Currently Expired Items Alert Box (if user has any expired items in pantry) */}
          {expiredItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase text-rose-900 dark:text-rose-200 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>You have {expiredItems.length} expired item(s) in your records:</span>
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-400 font-bold">Action Recommended</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {expiredItems.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-xs shadow-2xs"
                  >
                    <span>{item.type === 'medicine' ? '💊' : '🥛'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <button
                      onClick={() => markAsDiscarded(item.id)}
                      className="ml-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-400 hover:underline"
                    >
                      Safe Discard
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuidelines.map(guide => {
              const isHazard = guide.severity === 'critical-hazard';
              const isRepurpose = guide.severity === 'repurpose-safe';

              return (
                <div
                  key={guide.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between ${
                    isHazard 
                      ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900/40' 
                      : isRepurpose 
                      ? 'border-emerald-200 dark:border-emerald-800' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isHazard 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' 
                              : isRepurpose 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                          }`}>
                            {guide.badge}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {guide.category}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                          {guide.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {guide.summary}
                    </p>

                    {/* Key takeaway callout box */}
                    <div className={`p-3 rounded-2xl mb-4 border ${
                      isHazard
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
                        : isRepurpose
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200'
                    }`}>
                      <div className="flex items-start space-x-2">
                        <span className="text-sm">📌</span>
                        <div className="text-xs">
                          <strong className="block mb-0.5">Golden Rule:</strong>
                          <span>{guide.keyTakeaway}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-2">
                        Action Protocol Steps:
                      </span>
                      <ol className="space-y-1.5 pl-4 list-decimal text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Hazard or Warning Note */}
                    {guide.hazardNote && (
                      <div className="mt-3.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                        ⚠️ <strong>Warning:</strong> {guide.hazardNote}
                      </div>
                    )}

                  </div>

                  {/* Footer safety indicator */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>Verified Safety Guidance</span>
                    <span>FDA • WHO • FSSAI Aligned</span>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Kitchen Vision Scanner Modal */}
      <PantryVisionScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onIngredientsConfirmed={(detected) => {
          setExtraScannedIngredients(detected);
          showToast(`Added ${detected.length} ingredients from your kitchen scan!`, 'success');
        }}
      />

    </div>
  );
}
