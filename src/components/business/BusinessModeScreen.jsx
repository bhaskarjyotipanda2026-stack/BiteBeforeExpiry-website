import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, PackageCheck, AlertOctagon, TrendingDown, 
  ArrowUpRight, Download, Upload, Plus, ShieldCheck, Check, 
  Search, Filter, ShieldAlert, BarChart3, Truck
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { 
  computeBusinessMetrics, 
  parseBulkInventoryImport, 
  hasPermission,
  ROLE_PERMISSIONS
} from '../../services/businessService';
import { useApp } from '../../context/AppContext';

export function BusinessModeScreen() {
  const { showToast } = useApp();
  const [businessProfile, setBusinessProfile] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [currentStaffRole, setCurrentStaffRole] = useState('admin'); // 'admin', 'manager', 'staff'
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Bulk import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState(
`Organic Whole Milk,890103001,Dairy,BATCH-MLK-01,50,FarmDirect,2026-09-25,2026-10-03,Walk-in Cooler 1,45.00
Whole Wheat Pita Bread,890103002,Bakery,BATCH-BRD-88,30,SunBake Bakery,2026-09-28,2026-10-02,Aisle 2 Bakery,25.00
Hass Avocados 4pk,890103003,Produce,BATCH-AVO-19,40,GreenGroves,2026-09-20,2026-10-04,Produce Island B,80.00
Atlantic Salmon Fillet,890103004,Seafood,BATCH-SAL-77,15,Nordic Fisheries,2026-09-29,2026-10-02,Seafood Counter,190.00`
  );

  // Add staff modal state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ staff_name: '', staff_email: '', role: 'staff' });

  const loadData = async () => {
    setLoading(true);
    try {
      const biz = await dbService.getBusinessProfile('usr_demo_primary_001');
      setBusinessProfile(biz);

      if (biz) {
        const staff = await dbService.getBusinessStaff(biz.id);
        setStaffList(staff || []);

        const inv = await dbService.getBusinessInventory(biz.id);
        setInventory(inv || []);
      }
    } catch (err) {
      console.error('Error loading business mode:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) return;
    try {
      const parsedItems = parseBulkInventoryImport(bulkCsvText);
      if (parsedItems.length === 0) {
        showToast?.('No valid items found in CSV input', 'error');
        return;
      }
      await dbService.bulkImportBusinessInventory(businessProfile.id, parsedItems);
      showToast?.(`Successfully imported ${parsedItems.length} inventory items`, 'success');
      setShowImportModal(false);
      loadData();
    } catch (err) {
      console.error('Bulk import error:', err);
      showToast?.('Failed to import inventory', 'error');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.staff_name || !newStaff.staff_email) return;
    await dbService.addBusinessStaff({
      business_id: businessProfile.id,
      ...newStaff
    });
    showToast?.(`Added ${newStaff.staff_name} as ${newStaff.role}`, 'success');
    setShowStaffModal(false);
    setNewStaff({ staff_name: '', staff_email: '', role: 'staff' });
    loadData();
  };

  const handleDispatchFefo = async (item) => {
    if (item.isExpired) {
      showToast?.('VIOLATION: Cannot dispatch expired stock! Quarantine item for disposal.', 'error');
      return;
    }
    await dbService.updateBusinessInventoryItem(item.id, {
      inventory_status: 'DISPATCHED_FEFO'
    });
    showToast?.(`Dispatched "${item.product_name}" (Batch ${item.batch_number}) via FEFO priority`, 'success');
    loadData();
  };

  const handleExportReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inventory, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `inventory_fefo_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast?.('Inventory audit report exported', 'info');
  };

  const { items: enhancedInventory, metrics } = computeBusinessMetrics(inventory);

  const filteredItems = enhancedInventory.filter(item => {
    const matchSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode || '').includes(searchQuery);
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const categories = ['ALL', ...new Set(inventory.map(i => i.category).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Business Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>Enterprise & Commercial Stock Mode</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {businessProfile?.business_name || 'Commercial Inventory Management'}
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm">
              Type: <strong className="text-white capitalize">{businessProfile?.business_type || 'Supermarket'}</strong> • Reg: <strong className="text-white font-mono">{businessProfile?.registration_number || 'N/A'}</strong>
            </p>
            <p className="mt-1 text-slate-400 text-xs">
              First-Expired, First-Out (FEFO) automated dispatch, bulk barcode ingestion, batch tracking, and loss prevention.
            </p>
          </div>

          {/* Current Staff Role Switcher (RBAC Simulation) */}
          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Simulated Staff Role:</span>
              <span className="font-mono text-indigo-400 font-bold uppercase">{currentStaffRole}</span>
            </div>
            <div className="flex space-x-1.5">
              {['admin', 'manager', 'staff'].map(role => (
                <button
                  key={role}
                  onClick={() => setCurrentStaffRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    currentStaffRole === role
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* METRICS & CAPITAL AT RISK */}
      <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">In-Stock Units</span>
            <PackageCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.totalUnits || 0}
          </p>
          <span className="text-[11px] text-slate-400">Across {metrics.inStockCount || 0} batches</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Stock Value</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ₹{metrics.totalInventoryValue || 0}
          </p>
          <span className="text-[11px] text-slate-400">Inventory valuation</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400">Capital at Risk</span>
            <AlertOctagon className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-300 mt-1">
            ₹{metrics.capitalAtRisk || 0}
          </p>
          <span className="text-[11px] text-amber-700 dark:text-amber-400">
            {metrics.nearExpiryUnits || 0} units expiring in ≤ 7d
          </span>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-300 dark:border-rose-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Expired Loss</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-300 mt-1">
            ₹{metrics.expiredValue || 0}
          </p>
          <span className="text-[11px] text-rose-700 dark:text-rose-400">
            {metrics.expiredUnits || 0} units strictly quarantined
          </span>
        </div>
      </section>

      {/* FEFO DISPATCH QUEUE SECTION */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📦</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                First-Expired, First-Out (FEFO) Dispatch Queue
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Stock items automatically sorted by nearest valid expiry. Follow this dispatch queue to eliminate stock write-offs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission(currentStaffRole, 'bulk_import') && (
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk CSV Import</span>
              </button>
            )}

            <button
              onClick={handleExportReport}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, barcode, or lot number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Product Categories' : c}</option>
            ))}
          </select>
        </div>

        {/* FEFO Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">FEFO Rank</th>
                <th className="py-3 px-4">Product & Barcode</th>
                <th className="py-3 px-3">Batch #</th>
                <th className="py-3 px-3">Shelf Life</th>
                <th className="py-3 px-3">Quantity</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">FEFO Dispatch Directive</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No active stock found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    item.isExpired ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                  }`}>
                    <td className="py-3 px-3">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                        item.fefoRank === 1
                          ? 'bg-rose-600 text-white animate-pulse'
                          : item.fefoRank <= 3
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.fefoRank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.product_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {item.barcode || 'NO-BARCODE'} • {item.supplier}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.batch_number}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.expiry_date}
                      </div>
                      <div className="text-[10px]">
                        {item.isExpired ? (
                          <span className="font-bold text-rose-600">Expired</span>
                        ) : (
                          <span className="text-amber-600 font-medium">{item.daysRemaining}d left</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {item.quantity} units
                      <div className="text-[10px] font-normal text-slate-400">
                        ₹{item.calculatedTotalValue} total
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {item.storage_location}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        item.isExpired
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : item.daysRemaining <= 3
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300'
                          : item.daysRemaining <= 7
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {item.dispatchRecommendation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.isExpired ? (
                        <span className="text-[10px] font-bold text-rose-600 uppercase">
                          Quarantined
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDispatchFefo(item)}
                          disabled={!hasPermission(currentStaffRole, 'dispatch_fefo')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] disabled:opacity-40 transition-colors"
                          title="Record Stock Dispatch"
                        >
                          Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* STAFF ACCOUNTS & ROLES SECTION */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Staff Accounts & Access Control (RBAC)
            </h3>
          </div>

          {hasPermission(currentStaffRole, 'manage_staff') && (
            <button
              onClick={() => setShowStaffModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {staffList.map(member => (
            <div key={member.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {member.staff_name}
                </h4>
                <p className="text-[11px] text-slate-400">{member.staff_email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                member.role === 'admin'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  : member.role === 'manager'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* BULK CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Bulk Commercial Stock Ingestion
                </h3>
                <p className="text-xs text-slate-500">
                  Paste batch records in CSV format (Product, Barcode, Category, Batch, Qty, Supplier, Mfg Date, Expiry Date, Location, Cost)
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={8}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Import Stock Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Add Business Staff Account
              </h3>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newStaff.staff_name}
                  onChange={(e) => setNewStaff({ ...newStaff, staff_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="sarah@freshmart.local"
                  value={newStaff.staff_email}
                  onChange={(e) => setNewStaff({ ...newStaff, staff_email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Assignment
                </label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="staff">Staff (Scanning & Dispatch)</option>
                  <option value="manager">Manager (Inventory & Reports)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
