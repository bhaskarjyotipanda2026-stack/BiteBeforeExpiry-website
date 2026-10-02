import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, Sparkles, Clock, Calendar, CheckCircle2, 
  Trash2, Eye, ShieldCheck, Tag, ArrowUpRight, HeartPulse, Barcode,
  FileText, Check, XCircle, ArrowUpDown, AlertTriangle, AlertOctagon, Utensils
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ItemDetailModal } from '../dashboard/ItemDetailModal';
import { calculateHealthScore } from '../../services/healthScoreService';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return dateStr;
  }
}

export function ScanHistoryScreen() {
  const { 
    items, 
    userScans = [], 
    getDaysRemaining, 
    markScanStatus, 
    deleteUserScan, 
    markAsUsed, 
    markAsDiscarded,
    showToast 
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'food', 'medicine', 'other'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'expiring_soon', 'expired', 'consumed', 'discarded'
  const [sortBy, setSortBy] = useState('expiry_asc'); // 'expiry_asc', 'expiry_desc', 'scanned_desc'
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Unify userScans (from Supabase/relational backend) with existing pantry items
  const unifiedHistory = useMemo(() => {
    if (userScans && userScans.length > 0) {
      return userScans.map(s => {
        const days = s.expiry_date ? getDaysRemaining(s.expiry_date) : null;
        let dynamicStatus = s.status || 'active';
        if (dynamicStatus !== 'consumed' && dynamicStatus !== 'discarded' && s.expiry_date) {
          if (days !== null) {
            dynamicStatus = days <= 0 ? 'expired' : (days <= 7 ? 'expiring_soon' : 'active');
          }
        }
        return {
          id: s.id,
          name: s.product?.product_name || s.product_name || 'Scanned Product',
          brand: s.product?.brand || s.brand || '',
          category: s.product?.category || s.category || 'Food',
          barcode: s.barcode || s.product?.barcode || null,
          scanType: s.scan_type || 'barcode',
          scannedAt: s.scanned_at || s.created_at || new Date().toISOString(),
          expiryDate: s.expiry_date || null,
          manufacturingDate: s.manufacturing_date || null,
          status: dynamicStatus,
          daysRemaining: days,
          notes: s.notes || '',
          image: s.scan_image_url || s.product?.image_url || null,
          rawItem: s
        };
      });
    }

    return items.map(item => {
      const days = getDaysRemaining(item.expiryDate);
      let status = 'active';
      if (item.status === 'used') status = 'consumed';
      else if (item.status === 'wasted') status = 'discarded';
      else if (days !== null) {
        status = days <= 0 ? 'expired' : (days <= 7 ? 'expiring_soon' : 'active');
      }

      return {
        id: item.id,
        name: item.name,
        brand: item.brand || '',
        category: item.type === 'medicine' ? 'Medicine' : (item.category || 'Food'),
        barcode: item.barcode || null,
        scanType: item.sourceOfInfo?.toLowerCase().includes('ocr') ? 'OCR' : (item.barcode ? 'barcode' : 'manual'),
        scannedAt: item.dateAdded || new Date().toISOString(),
        expiryDate: item.expiryDate || null,
        manufacturingDate: item.mfgDate || null,
        status,
        daysRemaining: days,
        notes: item.notes || '',
        image: item.frontImage || null,
        rawItem: item
      };
    });
  }, [userScans, items, getDaysRemaining]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: unifiedHistory.length,
      food: unifiedHistory.filter(i => (i.category || '').toLowerCase().includes('food') || (i.category || '').toLowerCase().includes('grocery') || (i.category || '').toLowerCase().includes('dairy')).length,
      medicine: unifiedHistory.filter(i => (i.category || '').toLowerCase().includes('medicine') || (i.category || '').toLowerCase().includes('pharma')).length,
      active: unifiedHistory.filter(i => i.status === 'active').length,
      expiringSoon: unifiedHistory.filter(i => i.status === 'expiring_soon').length,
      expired: unifiedHistory.filter(i => i.status === 'expired').length
    };
  }, [unifiedHistory]);

  // Filtered & Sorted Scans
  const filteredScans = useMemo(() => {
    return unifiedHistory
      .filter(item => {
        // Category Filter
        if (categoryFilter !== 'all') {
          const cat = (item.category || '').toLowerCase();
          if (categoryFilter === 'food') {
            if (!cat.includes('food') && !cat.includes('grocery') && !cat.includes('dairy') && !cat.includes('beverage')) return false;
          } else if (categoryFilter === 'medicine') {
            if (!cat.includes('medicine') && !cat.includes('pharma')) return false;
          } else if (categoryFilter === 'other') {
            if (cat.includes('food') || cat.includes('medicine')) return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all') {
          if (item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
        }

        // Search Query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchBrand = (item.brand || '').toLowerCase().includes(q);
          const matchBarcode = (item.barcode || '').toLowerCase().includes(q);
          const matchCat = (item.category || '').toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchBarcode && !matchCat && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry_asc') {
          const dA = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
          const dB = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
          return dA - dB;
        }
        if (sortBy === 'expiry_desc') {
          const dA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          const dB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          return dB - dA;
        }
        if (sortBy === 'scanned_desc') {
          return new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime();
        }
        return 0;
      });
  }, [unifiedHistory, categoryFilter, statusFilter, sortBy, search]);

  // Action handlers
  const handleMarkConsumed = async (e, id) => {
    e.stopPropagation();
    if (markScanStatus) await markScanStatus(id, 'consumed');
    if (markAsUsed) markAsUsed(id);
  };

  const handleMarkDiscarded = async (e, id) => {
    e.stopPropagation();
    if (markScanStatus) await markScanStatus(id, 'discarded');
    if (markAsDiscarded) markAsDiscarded(id, 'Expired or spoiled in pantry');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this scan record? This cannot be undone.')) {
      if (deleteUserScan) await deleteUserScan(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Title */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <History className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Scan History & Personal Expiry Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete user-specific audit trail of all scanned food & medicines, expiry tracking, and status transitions.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-extrabold text-base">
            {counts.total}
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Scans</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">All Records</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold text-base">
            {counts.active}
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">&gt; 7 Days</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-extrabold text-base">
            {counts.expiringSoon}
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Expiring Soon</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">1–7 Days</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-extrabold text-base">
            {counts.expired}
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Expired</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">Past Expiry</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="space-y-3 mb-6">
        
        {/* Row 1: Category & Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-1">Category:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'food', label: '🥗 Food' },
              { id: 'medicine', label: '💊 Medicine' },
              { id: 'other', label: 'Other' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-1">Status:</span>
            {[
              { id: 'all', label: 'All Status' },
              { id: 'active', label: 'Active' },
              { id: 'expiring_soon', label: 'Expiring Soon' },
              { id: 'expired', label: 'Expired' },
              { id: 'consumed', label: 'Consumed' },
              { id: 'discarded', label: 'Discarded' },
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

        </div>

        {/* Row 2: Search Input and Sort Picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, brand, barcode, ingredients..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="expiry_asc">Sort: Expiry Date (Soonest first)</option>
              <option value="expiry_desc">Sort: Expiry Date (Furthest first)</option>
              <option value="scanned_desc">Sort: Scan Date (Newest first)</option>
            </select>
          </div>

        </div>

      </div>

      {/* History Items List View */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none overflow-hidden">
        {filteredScans.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredScans.map(scan => {
              const isConsumed = scan.status === 'consumed';
              const isDiscarded = scan.status === 'discarded';
              const isExpired = scan.status === 'expired';
              const isExpiringSoon = scan.status === 'expiring_soon';

              return (
                <div
                  key={scan.id}
                  onClick={() => setSelectedItem(scan.rawItem)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      {scan.image ? (
                        <img src={scan.image} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl">
                          {scan.category.toLowerCase().includes('medicine') ? '💊' : '🥗'}
                        </span>
                      )}
                    </div>
                    
                    <div className="truncate space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {scan.category}
                        </span>

                        {scan.brand && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            • {scan.brand}
                          </span>
                        )}

                        {scan.barcode && (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Barcode className="w-3 h-3 text-slate-400" />
                            <span>{scan.barcode}</span>
                          </span>
                        )}

                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {scan.scanType}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {scan.name}
                      </h4>

                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Scanned: {formatDate(scan.scannedAt)}
                        {scan.manufacturingDate ? ` • MFG: ${formatDate(scan.manufacturingDate)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Right: Expiry Status, Badge & Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    
                    {/* Status & Expiry Date */}
                    <div className="text-left sm:text-right space-y-1">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center sm:justify-end space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Expires: <strong className="text-slate-900 dark:text-white">{formatDate(scan.expiryDate)}</strong></span>
                      </div>

                      <div>
                        {isConsumed ? (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block">
                            Consumed
                          </span>
                        ) : isDiscarded ? (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 inline-block">
                            Discarded
                          </span>
                        ) : isExpired ? (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-block">
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-block">
                            Expiring Soon ({scan.daysRemaining}d left)
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block">
                            Active ({scan.daysRemaining}d left)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (Mark Consumed, Mark Discarded, Delete) */}
                    <div className="flex items-center space-x-1.5">
                      {!isConsumed && (
                        <button
                          onClick={(e) => handleMarkConsumed(e, scan.id)}
                          title="Mark as Consumed"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-all flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Consumed</span>
                        </button>
                      )}

                      {!isDiscarded && (
                        <button
                          onClick={(e) => handleMarkDiscarded(e, scan.id)}
                          title="Mark as Discarded"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden lg:inline">Discarded</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDelete(e, scan.id)}
                        title="Delete Scan Record"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
            No scan history matches your filter criteria.
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}

    </div>
  );
}
