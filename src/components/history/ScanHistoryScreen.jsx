import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, Sparkles, Clock, Calendar, CheckCircle2, 
  Trash2, Eye, ShieldCheck, Tag, ArrowUpRight, HeartPulse
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ItemDetailModal } from '../dashboard/ItemDetailModal';
import { calculateHealthScore } from '../../services/healthScoreService';

export function ScanHistoryScreen() {
  const { items, getItemUrgency, getDaysRemaining, settings } = useApp();
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'grocery', 'medicine', 'expired', 'active', 'used', 'wasted'
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Counts
  const groceryCount = items.filter(i => i.type === 'grocery').length;
  const medicineCount = items.filter(i => i.type === 'medicine').length;
  const expiredCount = items.filter(i => (getDaysRemaining(i.expiryDate) ?? 0) < 0).length;

  const filteredHistory = useMemo(() => {
    return items.filter(item => {
      const days = getDaysRemaining(item.expiryDate);

      // Filters
      if (filterTab === 'grocery' && item.type !== 'grocery') return false;
      if (filterTab === 'medicine' && item.type !== 'medicine') return false;
      if (filterTab === 'expired' && (days === null || days >= 0)) return false;
      if (filterTab === 'active' && (item.status === 'used' || item.status === 'wasted')) return false;
      if (filterTab === 'used' && item.status !== 'used') return false;
      if (filterTab === 'wasted' && item.status !== 'wasted') return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
      }

      return true;
    });
  }, [items, filterTab, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <History className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          <span>Complete Scan & Tracking History</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Full audit trail of all packages scanned, manual entries, clean eating health scores, and shelf-life estimations.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-extrabold text-lg">
            {items.length}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Items Cataloged</span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">All Time Scans</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-extrabold text-lg">
            🥗 {groceryCount}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Groceries</span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Food & Dairy Items</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 shadow-xs flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 flex items-center justify-center font-extrabold text-lg">
            💊 {medicineCount}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Medicines</span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Prescriptions & OTC</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        
        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'grocery', label: 'Groceries' },
            { id: 'medicine', label: 'Medicines' },
            { id: 'active', label: 'Active in Pantry' },
            { id: 'expired', label: 'Expired' },
            { id: 'used', label: 'Used / Saved' },
            { id: 'wasted', label: 'Wasted' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* History Table / List View */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none overflow-hidden">
        {filteredHistory.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredHistory.map(item => {
              const urgency = getItemUrgency(item);
              const days = urgency.daysRemaining;
              const hScore = calculateHealthScore(item);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  {/* Left: Thumbnail & Name & Category */}
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {item.frontImage ? (
                        <img src={item.frontImage} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl">{item.type === 'medicine' ? '💊' : '🥛'}</span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{item.category}</span>
                        {item.status === 'used' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            Consumed
                          </span>
                        )}
                        {item.status === 'wasted' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                            Wasted
                          </span>
                        )}
                        {hScore && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Health: {hScore.score}/100 ({hScore.grade})
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate mt-0.5">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Added: {item.dateAdded || 'Recently'} • Source: {item.expirySource || 'scanned'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Expiry Status & Action */}
                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Expires: <span className="font-extrabold text-slate-900 dark:text-white">{item.expiryDate || 'N/A'}</span>
                      </div>
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        urgency.color === 'red'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          : urgency.color === 'yellow'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      }`}>
                        {urgency.label}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
            No scan history matches this filter.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />

    </div>
  );
}
