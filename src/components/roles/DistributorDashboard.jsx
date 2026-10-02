import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { calculateDaysRemaining } from '../../services/fefoService';
import { 
  Truck, Building2, Package, MapPin, Thermometer,
  Calendar, ArrowRight, CheckCircle2, AlertTriangle, Clock,
  Search, ShieldCheck, Layers, Send
} from 'lucide-react';

export function DistributorDashboard({ onNavigateToScan }) {
  const { activeRole, activeOrganization } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [isCreatingDispatch, setIsCreatingDispatch] = useState(false);
  const [newDispatch, setNewDispatch] = useState({
    recipient_name: '',
    recipient_type: 'RETAILER',
    product_name: '',
    batch_number: '',
    quantity_cases: 20,
    unit_count: 240,
    expiry_date: '',
    transit_temp: '4.0°C'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const whs = await dbService.getWarehouses();
        const dsps = await dbService.getDispatches();
        setWarehouses(whs);
        setDispatches(dsps);
      } catch (err) {
        console.error('Failed to load distributor data:', err);
      }
    }
    loadData();
  }, []);

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!newDispatch.product_name || !newDispatch.batch_number || !newDispatch.expiry_date) {
      alert('Please fill product name, batch number, and expiry date');
      return;
    }

    try {
      const created = await dbService.createDispatch({
        ...newDispatch,
        origin_warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : 'wh_central_01',
        origin_warehouse_name: warehouses.find(w => w.id === selectedWarehouse)?.warehouse_name || 'Central Distribution Hub',
        dispatch_status: 'IN_TRANSIT'
      });
      setDispatches([created, ...dispatches]);
      setIsCreatingDispatch(false);
      setNewDispatch({
        recipient_name: '',
        recipient_type: 'RETAILER',
        product_name: '',
        batch_number: '',
        quantity_cases: 20,
        unit_count: 240,
        expiry_date: '',
        transit_temp: '4.0°C'
      });
    } catch (err) {
      console.error('Failed to create dispatch:', err);
    }
  };

  const totalPallets = warehouses.reduce((acc, w) => acc + (w.capacity_pallets || 0), 0);
  const occupiedPallets = warehouses.reduce((acc, w) => acc + (w.current_occupancy_pallets || 0), 0);
  const occupancyRate = totalPallets > 0 ? Math.round((occupiedPallets / totalPallets) * 100) : 0;
  const expiringBatchesCount = warehouses.reduce((acc, w) => acc + (w.batches_expiring_soon || 0), 0);

  const filteredDispatches = dispatches.filter(d => {
    if (selectedWarehouse !== 'ALL' && d.origin_warehouse_id !== selectedWarehouse) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🚚</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                {activeRole === 'WHOLESALER' ? 'Wholesaler Pallet Management' : 'Distributor Logistics Center'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                Multi-Warehouse Traceability
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeOrganization?.name || 'Metro Food & Pharma Logistics'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Warehouse network oversight, cold-chain temperature verification, FEFO dispatch fulfillment, and upstream manufacturer $\rightarrow$ downstream retailer traceability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreatingDispatch(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/20 flex items-center space-x-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Create Retailer Dispatch</span>
            </button>
            <button
              onClick={onNavigateToScan}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center space-x-2 transition-all"
            >
              <span>Scan Pallet Barcode</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Warehouse Network</span>
            <Building2 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {warehouses.length}
            </span>
            <span className="text-xs text-slate-500">depots active</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Total capacity: {totalPallets.toLocaleString()} pallets
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {occupancyRate}%
            </span>
            <span className="text-xs text-slate-500">utilized</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {occupiedPallets.toLocaleString()} pallets in stock
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Near-Expiry Batches</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {expiringBatchesCount}
            </span>
            <span className="text-xs text-slate-500">batches</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            FEFO dispatch recommended
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Dispatches</span>
            <Truck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {dispatches.length}
            </span>
            <span className="text-xs text-slate-500">completed/in-transit</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            100% cold-chain compliant
          </div>
        </div>
      </div>

      {/* Multi-Warehouse Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏢</span>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Warehouse Depot Locations & Inventory
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold"
            >
              <option value="ALL">All Warehouses ({warehouses.length})</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.warehouse_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses.map((wh) => {
            const occ = Math.round((wh.current_occupancy_pallets / wh.capacity_pallets) * 100);
            return (
              <div key={wh.id} className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {wh.warehouse_name}
                    </h3>
                    <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                      {wh.location}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                    {wh.code}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Pallet Occupancy</span>
                    <span>{wh.current_occupancy_pallets} / {wh.capacity_pallets} ({occ}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        occ > 85 ? 'bg-amber-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${occ}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                  <div className="text-slate-500 font-semibold">Temperature Zones:</div>
                  <div className="flex flex-wrap gap-1">
                    {(wh.temperature_zones || []).map((z, zi) => (
                      <span key={zi} className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200 dark:border-purple-800">
                        {z}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Active Batches: {wh.total_active_batches}</span>
                  <span className="text-amber-600 dark:text-amber-400">Expiring Soon: {wh.batches_expiring_soon}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Retailer Dispatch Logs */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📋</span>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Downstream Dispatch Log (Retailers, Hospitals, Pharmacies)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredDispatches.length} dispatches shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Dispatch #</th>
                <th className="px-4 py-3">Recipient Partner</th>
                <th className="px-4 py-3">Product & Batch</th>
                <th className="px-4 py-3">Cases / Units</th>
                <th className="px-4 py-3">Cold Chain Temp</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredDispatches.map((disp, i) => (
                <tr key={disp.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-400">
                    {disp.dispatch_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {disp.recipient_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {disp.recipient_type}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {disp.product_name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Batch: {disp.batch_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                    {disp.quantity_cases} cases ({disp.unit_count} units)
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center space-x-1">
                      <Thermometer className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{disp.transit_temp}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                    {disp.expiry_date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      disp.dispatch_status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : disp.dispatch_status === 'RECALLED_HOLD'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                    }`}>
                      {disp.dispatch_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dispatch Modal */}
      {isCreatingDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Create Retailer Dispatch (FEFO Allocation)
            </h3>
            <form onSubmit={handleCreateDispatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Recipient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FreshMart Supermarket (Indiranagar)"
                  value={newDispatch.recipient_name}
                  onChange={e => setNewDispatch({ ...newDispatch, recipient_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greek Yogurt 500g"
                    value={newDispatch.product_name}
                    onChange={e => setNewDispatch({ ...newDispatch, product_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOT-DAIRY-8891"
                    value={newDispatch.batch_number}
                    onChange={e => setNewDispatch({ ...newDispatch, batch_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cases</label>
                  <input
                    type="number"
                    value={newDispatch.quantity_cases}
                    onChange={e => setNewDispatch({ ...newDispatch, quantity_cases: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newDispatch.expiry_date}
                    onChange={e => setNewDispatch({ ...newDispatch, expiry_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingDispatch(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold"
                >
                  Dispatch Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
