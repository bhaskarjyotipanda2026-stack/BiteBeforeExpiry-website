import React, { useState, useEffect } from 'react';
import { 
  Home, Plus, AlertTriangle, CheckCircle, Trash2, Calendar, 
  MapPin, ShieldAlert, Sparkles, Filter, Search, Clock, 
  TrendingUp, BarChart2, DollarSign, Bell, ArrowRight
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { determineUseFirstPriority, calculateDaysRemaining } from '../../services/fefoService';
import { calculateHouseholdAnalytics } from '../../services/householdAnalyticsService';
import { useApp } from '../../context/AppContext';

export function HouseholdExpiryScreen({ onNavigateToScan, onNavigateToRecipes }) {
  const { showToast } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state
  const [newItem, setNewItem] = useState({
    product_name: '',
    category: 'Produce',
    quantity: 1,
    manufacturing_date: '',
    expiry_date: '',
    batch_number: '',
    storage_location: 'Refrigerator',
    entry_source: 'manual',
    estimated_value: 50.0,
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbService.getHouseholdInventory('usr_demo_primary_001');
      setItems(data || []);
    } catch (err) {
      console.error('Error loading household inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.product_name || !newItem.expiry_date) {
      showToast?.('Please provide product name and expiry date', 'error');
      return;
    }

    const priorityInfo = determineUseFirstPriority(newItem.expiry_date);
    const itemToSave = {
      ...newItem,
      use_first_priority: priorityInfo.priority,
      status: priorityInfo.isExpired ? 'EXPIRED' : (priorityInfo.priority !== 'SAFE' && priorityInfo.priority !== 'NONE' ? 'EXPIRING_SOON' : 'ACTIVE')
    };

    await dbService.saveHouseholdItem(itemToSave);
    setShowAddModal(false);
    setNewItem({
      product_name: '',
      category: 'Produce',
      quantity: 1,
      manufacturing_date: '',
      expiry_date: '',
      batch_number: '',
      storage_location: 'Refrigerator',
      entry_source: 'manual',
      estimated_value: 50.0,
      notes: ''
    });
    showToast?.('Product added to household inventory', 'success');
    loadData();
  };

  const handleMarkConsumed = async (item) => {
    await dbService.updateHouseholdItem(item.id, {
      status: 'CONSUMED',
      consumed_at: new Date().toISOString()
    });
    showToast?.(`Marked "${item.product_name}" as consumed! Waste prevented.`, 'success');
    loadData();
  };

  const handleMarkDiscarded = async (item) => {
    await dbService.updateHouseholdItem(item.id, {
      status: 'DISCARDED',
      discarded_at: new Date().toISOString()
    });
    showToast?.(`Marked "${item.product_name}" as discarded.`, 'info');
    loadData();
  };

  const handleDelete = async (id) => {
    await dbService.deleteHouseholdItem(id);
    showToast?.('Item removed', 'info');
    loadData();
  };

  // Empirical analytics
  const analytics = calculateHouseholdAnalytics(items);

  // Active items for USE-FIRST
  const activeItems = items.filter(i => i.status === 'ACTIVE' || i.status === 'EXPIRING_SOON');
  
  // High / Medium / Low / Expired prioritization
  const useFirstHigh = activeItems.filter(i => {
    const days = calculateDaysRemaining(i.expiry_date);
    return days === 1;
  });
  const useFirstMedium = activeItems.filter(i => {
    const days = calculateDaysRemaining(i.expiry_date);
    return days !== null && days > 1 && days <= 3;
  });
  const useFirstLow = activeItems.filter(i => {
    const days = calculateDaysRemaining(i.expiry_date);
    return days !== null && days > 3 && days <= 7;
  });
  const expiredItems = items.filter(i => {
    const days = calculateDaysRemaining(i.expiry_date);
    return i.status === 'EXPIRED' || (days !== null && days <= 0);
  });

  const filteredItems = items.filter(item => {
    const matchSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.batch_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'ALL' || item.category === filterCategory;
    const matchLoc = filterLocation === 'ALL' || item.storage_location === filterLocation;
    return matchSearch && matchCat && matchLoc;
  });

  const categories = ['ALL', ...new Set(items.map(i => i.category).filter(Boolean))];
  const locations = ['ALL', ...new Set(items.map(i => i.storage_location).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-3">
            <Home className="w-3.5 h-3.5" />
            <span>Household Expiry & Zero-Waste Hub</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Household Expiry Management
          </h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base leading-relaxed">
            Track everything in your pantry, fridge, and medicine cabinet. Prioritize consumption with our 
            deterministic <strong className="text-white">USE FIRST</strong> system to prevent food waste before it happens.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Household Item</span>
            </button>
            <button
              onClick={onNavigateToScan}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-sm border border-emerald-400/40 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Scan Barcode / OCR</span>
            </button>
          </div>
        </div>
      </div>

      {/* USE FIRST SECTION (Food Waste Reduction Priority Queue) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⚡</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                "USE FIRST" System
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ranked consumption priority based on nearest valid shelf life. Eat these first to save money and cut waste!
            </p>
          </div>
          {onNavigateToRecipes && (
            <button
              onClick={onNavigateToRecipes}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Get Recipes For Expiring Items</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Tier Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* HIGH PRIORITY: <= 1 Day */}
          <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-rose-200 dark:border-rose-900/60">
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                  High Priority
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Expires in ≤ 1 Day
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                {useFirstHigh.length === 0 ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400/80 italic py-3 text-center">
                    No items expiring in 24 hours. Great job!
                  </p>
                ) : (
                  useFirstHigh.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-xs flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.product_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">Expires Tomorrow</span>
                          <span>•</span>
                          <span>{item.storage_location}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkConsumed(item)}
                        className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 transition-colors"
                        title="Mark Consumed"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium text-rose-700 dark:text-rose-400 pt-2 border-t border-rose-200 dark:border-rose-900/40">
              💡 Action: Prepare today or freeze immediately.
            </p>
          </div>

          {/* MEDIUM PRIORITY: 2-3 Days */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-amber-200 dark:border-amber-900/60">
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white">
                  Medium Priority
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Expires in 2–3 Days
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                {useFirstMedium.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400/80 italic py-3 text-center">
                    No items in 2–3 day window.
                  </p>
                ) : (
                  useFirstMedium.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.product_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {calculateDaysRemaining(item.expiry_date)}d left
                          </span>
                          <span>•</span>
                          <span>{item.storage_location}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkConsumed(item)}
                        className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 transition-colors"
                        title="Mark Consumed"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-400 pt-2 border-t border-amber-200 dark:border-amber-900/40">
              💡 Action: Plan into this week's meals.
            </p>
          </div>

          {/* LOW PRIORITY: 4-7 Days */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-900/60">
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white">
                  Low Priority
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Expires in 4–7 Days
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                {useFirstLow.length === 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400/80 italic py-3 text-center">
                    All clear for the coming week.
                  </p>
                ) : (
                  useFirstLow.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.product_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {calculateDaysRemaining(item.expiry_date)}d left
                          </span>
                          <span>•</span>
                          <span>{item.storage_location}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkConsumed(item)}
                        className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 transition-colors"
                        title="Mark Consumed"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 pt-2 border-t border-emerald-200 dark:border-emerald-900/40">
              💡 Action: Fresh & safe. Keep an eye on date.
            </p>
          </div>

        </div>
      </section>

      {/* STRICT SAFETY ALERT: Expired Items Quarantine */}
      {expiredItems.length > 0 && (
        <section className="bg-rose-100/90 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-800 rounded-3xl p-5 shadow-md">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-rose-900 dark:text-rose-200">
                Food Safety Notice: {expiredItems.length} Expired Item(s)
              </h3>
              <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 mt-1">
                <strong>STRICT RULE:</strong> Do NOT consume expired food or medicines. Degraded items pose microbial 
                and toxicological hazards. Discard safely or compost organic food waste.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {expiredItems.map(item => (
                  <div key={item.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate mr-2">
                      {item.product_name}
                    </span>
                    <button
                      onClick={() => handleMarkDiscarded(item)}
                      className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0"
                    >
                      Discard
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOUSEHOLD ANALYTICS DASHBOARD (EMPIRICAL DATA ONLY) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Household Waste & Prevention Analytics
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Real Data Only • Zero Invented Stats
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Tracked</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {analytics.totalTracked}
            </p>
            <span className="text-[11px] text-slate-400">Household products</span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Saved Before Expiry</span>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {analytics.consumedBeforeExpiry}
            </p>
            <span className="text-[11px] text-emerald-600/80">Consumed in time</span>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/60">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Products Expired</span>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
              {analytics.expiredCount}
            </p>
            <span className="text-[11px] text-rose-600/80">Quarantined/Unsafe</span>
          </div>

          <div className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800/60">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">Waste Prevented</span>
            <p className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-1">
              ₹{analytics.estimatedWastePrevented}
            </p>
            <span className="text-[11px] text-teal-600/80">Estimated grocery value</span>
          </div>

          <div className="bg-cyan-50 dark:bg-cyan-950/40 p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800/60">
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">Prevention Rate</span>
            <p className="text-2xl font-black text-cyan-700 dark:text-cyan-300 mt-1">
              {analytics.preventionRatePercent}%
            </p>
            <span className="text-[11px] text-cyan-600/80">Of completed items</span>
          </div>
        </div>
      </section>

      {/* HOUSEHOLD INVENTORY TABLE & FILTERS */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Household Pantry & Refrigerator Inventory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredItems.length} products
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search item or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
              ))}
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
            >
              {locations.map(l => (
                <option key={l} value={l}>{l === 'ALL' ? 'All Locations' : l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Items List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Batch #</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">USE FIRST Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No matching household items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const priority = determineUseFirstPriority(item.expiry_date);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.product_name}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          Qty: {item.quantity} • Source: {item.entry_source}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {item.category}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {item.storage_location}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {item.batch_number || '—'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {item.expiry_date || 'Undated'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${priority.badgeClass}`}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'CONSUMED' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : item.status === 'DISCARDED'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            : priority.isExpired
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {item.status !== 'CONSUMED' && (
                          <button
                            onClick={() => handleMarkConsumed(item)}
                            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                            title="Mark Consumed"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Add Household Product
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sourdough Bread, Organic Milk"
                  value={newItem.product_name}
                  onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Medicine">Medicine</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Manufacturing Date
                  </label>
                  <input
                    type="date"
                    value={newItem.manufacturing_date}
                    onChange={(e) => setNewItem({ ...newItem, manufacturing_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-4091"
                    value={newItem.batch_number}
                    onChange={(e) => setNewItem({ ...newItem, batch_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Storage Location
                  </label>
                  <select
                    value={newItem.storage_location}
                    onChange={(e) => setNewItem({ ...newItem, storage_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Refrigerator Top Shelf">Refrigerator Top Shelf</option>
                    <option value="Refrigerator Middle Shelf">Refrigerator Middle Shelf</option>
                    <option value="Crisper Drawer">Crisper Drawer</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Pantry Shelf">Pantry Shelf</option>
                    <option value="Kitchen Counter">Kitchen Counter</option>
                    <option value="Medicine Cabinet">Medicine Cabinet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Grocery Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newItem.estimated_value}
                  onChange={(e) => setNewItem({ ...newItem, estimated_value: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save to Household
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
