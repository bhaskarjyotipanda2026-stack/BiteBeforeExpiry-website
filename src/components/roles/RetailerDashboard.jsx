import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { computeBusinessMetrics, parseBulkInventoryImport } from '../../services/businessService';
import { calculateDaysRemaining } from '../../services/fefoService';
import { 
  Building2, Package, AlertTriangle, Clock, TrendingDown,
  ArrowUpRight, BarChart3, Upload, ShieldAlert, CheckCircle2,
  DollarSign, FileText, Search, Filter, ShieldCheck, ChevronRight
} from 'lucide-react';

export function RetailerDashboard({ onNavigateToScan, onNavigateToBusiness }) {
  const { activeOrganization } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL', 'EXPIRING_SOON', 'HIGH_RISK', 'EXPIRED'
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    async function loadRetailerData() {
      setIsLoading(false);
      try {
        const inv = await dbService.getBusinessInventory('biz_demo_supermarket_001');
        const dsps = await dbService.getDispatches({ recipientOrgId: 'org_retail_01' });
        setInventory(inv);
        setDispatches(dsps);

        const computed = computeBusinessMetrics(inv);
        setMetrics(computed.metrics || {});
      } catch (err) {
        console.error('Failed to load retailer data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRetailerData();
  }, []);

  const filteredItems = inventory.filter(item => {
    const matchesSearch = (item.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.batch_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.barcode || '').includes(searchQuery);
    if (!matchesSearch) return false;

    const days = calculateDaysRemaining(item.expiry_date);
    if (selectedFilter === 'EXPIRING_SOON') return days !== null && days >= 0 && days <= 7;
    if (selectedFilter === 'HIGH_RISK') return days !== null && days <= 3;
    if (selectedFilter === 'EXPIRED') return days !== null && days < 0;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner / Org Info */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏪</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Retailer & Shopkeeper Portal
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                FEFO Prioritization Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeOrganization?.name || 'FreshMart Supermarket'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Commercial batch inventory tracking, supplier dispatch intake, First-Expire First-Out sell-through guidance, and capital-at-risk analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToScan}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all"
            >
              <span>Bulk Barcode/OCR Scan</span>
            </button>
            <button
              onClick={onNavigateToBusiness}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center space-x-2 transition-all"
            >
              <span>Manage Batches & Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety & Non-Automated Action Directives */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold">Commercial Decision-Support Guarantee: </span>
          The system provides FEFO prioritization, alerts, and capital-at-risk recommendations based solely on stored data. It will never automatically discard or mark products as sold without physical staff confirmation.
        </div>
      </div>

      {/* Retail KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Inventory</span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {metrics.totalUnits || inventory.length}
            </span>
            <span className="text-xs text-slate-500">units in stock</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {inventory.length} distinct tracked product batches
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiring Soon</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {metrics.nearExpiryUnits || 0}
            </span>
            <span className="text-xs text-slate-500">within 7 days</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            Action: Prioritize front-of-shelf display
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capital at Risk</span>
            <DollarSign className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              ₹{metrics.capitalAtRisk || 0}
            </span>
            <span className="text-xs text-slate-500">valuation</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-500 font-semibold">
            Cost value of near-expiry inventory
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expired Stock</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
              {metrics.expiredUnits || 0}
            </span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <div className="mt-1 text-[11px] text-red-500 font-semibold">
            Strict Directive: Do not sell or dispatch
          </div>
        </div>
      </div>

      {/* Main Stock Table with FEFO Ranking */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search product, barcode, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'EXPIRING_SOON', 'HIGH_RISK', 'EXPIRED'].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setSelectedFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                  selectedFilter === filterKey
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {filterKey.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">FEFO Rank</th>
                <th className="px-4 py-3">Product & Batch</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Status & Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredItems.map((item, idx) => {
                const days = calculateDaysRemaining(item.expiry_date);
                const isExpired = days !== null && days < 0;
                const isSoon = days !== null && days >= 0 && days <= 7;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                        isExpired 
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                          : idx === 0 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Batch: {item.batch_number} • Barcode: {item.barcode || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {item.supplier || 'Standard Distributor'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                      {item.storage_location || 'Aisle 2 - Shelf B'}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {item.quantity} units
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {item.expiry_date || 'Undated'}
                      <div className={`text-[10px] font-bold ${
                        isExpired ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {days === null ? 'Undated' : isExpired ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isExpired ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                          DO NOT SELL / DISPOSE
                        </span>
                      ) : isSoon ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          FEFO PRIORITY (Sell First)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inbound Dispatches from Distributors */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🚚</span>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Recently Received Dispatches (Traceability Intake)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {dispatches.length} delivery records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dispatches.map((disp, i) => (
            <div key={disp.id || i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs flex justify-between items-start">
              <div className="space-y-1">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {disp.product_name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Dispatch #{disp.dispatch_number} • Batch: {disp.batch_number}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  From: {disp.origin_warehouse_name} • Temp: {disp.transit_temp}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  {disp.dispatch_status}
                </span>
                <div className="text-[10px] text-slate-400 mt-1">
                  Qty: {disp.unit_count} units
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
