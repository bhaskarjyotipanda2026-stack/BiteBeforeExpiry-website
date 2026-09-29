import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Plus, ScanLine, AlertTriangle, CheckCircle2, 
  Sparkles, RefreshCw, ArrowUpDown, ShieldCheck, HeartPulse, ShoppingBasket, ChefHat
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ItemCard } from './ItemCard';
import { ItemDetailModal } from './ItemDetailModal';

export function DashboardScreen({ onNavigateToScan, onNavigateToRecipes, onOpenUndatedModal, initialFilter = 'all' }) {
  const { 
    items, 
    getItemUrgency, 
    getDaysRemaining, 
    markAsUsed, 
    markAsWasted, 
    settings, 
    resetToSampleData 
  } = useApp();

  const [activeTab, setActiveTab] = useState(initialFilter); // 'all', 'grocery', 'medicine', 'urgent'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('expiry_asc'); // 'expiry_asc', 'expiry_desc', 'date_added', 'name'
  const [selectedItem, setSelectedItem] = useState(null);

  // Tab counts
  const counts = useMemo(() => {
    const activeItems = items.filter(i => i.status !== 'used' && i.status !== 'wasted');
    return {
      all: activeItems.length,
      grocery: activeItems.filter(i => i.type === 'grocery').length,
      medicine: activeItems.filter(i => i.type === 'medicine').length,
      urgent: activeItems.filter(i => {
        const days = getDaysRemaining(i.expiryDate);
        return days !== null && days <= settings.notificationLeadDays;
      }).length
    };
  }, [items, settings.notificationLeadDays]);

  // Filtered and sorted items
  const displayItems = useMemo(() => {
    return items
      .filter(item => {
        // Exclude used or wasted items from primary active dashboard
        if (item.status === 'used' || item.status === 'wasted') return false;

        // Tab filter
        if (activeTab === 'grocery' && item.type !== 'grocery') return false;
        if (activeTab === 'medicine' && item.type !== 'medicine') return false;
        if (activeTab === 'urgent') {
          const days = getDaysRemaining(item.expiryDate);
          if (days === null || days > settings.notificationLeadDays) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchCat = (item.category || '').toLowerCase().includes(q);
          const matchIng = (item.ingredientsOriginal || []).some(ing => ing.toLowerCase().includes(q));
          if (!matchName && !matchCat && !matchIng) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry_asc') {
          const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
          const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
          return dateA - dateB;
        }
        if (sortBy === 'expiry_desc') {
          const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          return dateB - dateA;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        // date_added
        return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime();
      });
  }, [items, activeTab, searchQuery, sortBy, settings.notificationLeadDays]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Top Banner / Headline */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Pantry & Medicine Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracking items before expiry. Color-coded by urgency with clean eating health scores.
          </p>
        </div>

        {/* Quick CTA Actions */}
        <div className="flex items-center space-x-2 self-stretch sm:self-auto flex-wrap gap-y-2">
          {onNavigateToRecipes && (
            <button
              onClick={onNavigateToRecipes}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 font-extrabold text-xs sm:text-sm border border-amber-300 dark:border-amber-800 shadow-sm transition-all"
              title="Cook with expiring groceries and calculate nutrition"
            >
              <ChefHat className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>👨‍🍳 Chef & Reuse AI</span>
            </button>
          )}

          <button
            onClick={() => onOpenUndatedModal({})}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>+ Add Manually</span>
          </button>

          <button
            onClick={onNavigateToScan}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan New Item</span>
          </button>
        </div>
      </div>

      {/* Expiring Ingredients Cooking Callout Banner */}
      {counts.urgent > 0 && onNavigateToRecipes && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <span className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-2xl">
              👨‍🍳
            </span>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base">
                Rescue {counts.urgent} Expiring Item{counts.urgent > 1 ? 's' : ''} with Zero-Waste Recipes!
              </h4>
              <p className="text-xs text-amber-100 mt-0.5">
                Calculate Protein, Carbs, Healthy Fats & calories, or check safe post-expiry disposal protocols.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToRecipes}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white text-amber-950 font-extrabold text-xs shadow-sm hover:bg-amber-50 transition-all shrink-0"
          >
            <ChefHat className="w-4 h-4 text-amber-600" />
            <span>View Instant Recipes</span>
          </button>
        </div>
      )}

      {/* Urgency Color Legend */}
      <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px]">
          Urgency Legend:
        </span>
        <div className="flex flex-wrap items-center gap-4 font-semibold">
          <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Green = Safe (&gt; 7 days)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Yellow = Urgent (1–7 days)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-rose-800 dark:text-rose-300">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>Red = Expired</span>
          </div>
          <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>~Estimated = AI Shelf-Life</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar (Groceries vs Medicines) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        
        {/* Main Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>All Items</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('grocery')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'grocery'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <ShoppingBasket className="w-4 h-4" />
            <span>Groceries</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'grocery' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            }`}>
              {counts.grocery}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('medicine')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'medicine'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                : 'bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Medicines</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'medicine' ? 'bg-white/20 text-white' : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
            }`}>
              {counts.medicine}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('urgent')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'urgent'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Expiring Soon</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'urgent' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-extrabold'
            }`}>
              {counts.urgent}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, ingredients..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-bold bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="expiry_asc">Soonest Expiry</option>
            <option value="expiry_desc">Latest Expiry</option>
            <option value="date_added">Recently Added</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

      </div>

      {/* Cards Grid */}
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={(it) => setSelectedItem(it)}
              onMarkUsed={markAsUsed}
              onMarkWasted={markAsWasted}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 sm:p-16 border border-slate-200/80 dark:border-slate-800 text-center max-w-lg mx-auto shadow-sm my-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 text-3xl">
            {activeTab === 'medicine' ? '💊' : activeTab === 'urgent' ? '🎉' : '🥗'}
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            {searchQuery 
              ? 'No matching products found' 
              : activeTab === 'urgent'
              ? 'Zero Urgent Expiries!'
              : 'No items in this section'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
            {activeTab === 'urgent'
              ? 'All tracked groceries and medicines are safely within their expiry thresholds.'
              : 'Scan package labels or add unprinted items manually to prevent pantry and medical waste.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNavigateToScan}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan First Item</span>
            </button>
            <button
              onClick={resetToSampleData}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Demo Products</span>
            </button>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onNavigateToRecipes={onNavigateToRecipes}
      />

    </div>
  );
}
