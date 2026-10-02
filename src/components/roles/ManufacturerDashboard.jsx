import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { executeManufacturerRecallWorkflow } from '../../services/roleService';
import { 
  Factory, Package, ShieldAlert, Truck, AlertTriangle, 
  Send, Plus, FileText, CheckCircle2, ChevronRight, Layers, ArrowUpRight
} from 'lucide-react';

export function ManufacturerDashboard({ onNavigateToScan }) {
  const { activeOrganization } = useAuth();
  const [productMaster, setProductMaster] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [issuedRecalls, setIssuedRecalls] = useState([]);
  const [isInitiatingRecall, setIsInitiatingRecall] = useState(false);
  const [recallForm, setRecallForm] = useState({
    batch_number: '',
    product_sku: '',
    classification: 'Class I',
    reason: '',
    recommended_action: '',
    regulatory_bulletin_url: 'https://www.fda.gov/safety/recalls'
  });

  useEffect(() => {
    async function loadManufacturerData() {
      try {
        const pm = await dbService.getProductMaster();
        const dsps = await dbService.getDispatches();
        setProductMaster(pm);
        setDispatches(dsps);
      } catch (err) {
        console.error('Failed to load manufacturer data:', err);
      }
    }
    loadManufacturerData();
  }, []);

  const handleInitiateRecall = (e) => {
    e.preventDefault();
    if (!recallForm.batch_number || !recallForm.reason) {
      alert('Please specify the affected batch number and reason');
      return;
    }

    try {
      const recallRecord = executeManufacturerRecallWorkflow({
        manufacturerOrgId: activeOrganization?.id || 'org_mfg_01',
        productSku: recallForm.product_sku,
        batchNumber: recallForm.batch_number,
        recallClassification: recallForm.classification,
        regulatoryBulletinUrl: recallForm.regulatory_bulletin_url,
        reason: recallForm.reason,
        recommendedAction: recallForm.recommended_action
      });

      setIssuedRecalls([recallRecord, ...issuedRecalls]);
      setIsInitiatingRecall(false);
      setRecallForm({
        batch_number: '',
        product_sku: '',
        classification: 'Class I',
        reason: '',
        recommended_action: '',
        regulatory_bulletin_url: 'https://www.fda.gov/safety/recalls'
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏭</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Manufacturer Master Console
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                End-to-End Batch Traceability
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeOrganization?.name || 'Apex Bio-Nutrition & Pharmaceuticals Ltd'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Centralized product master management, production batch generation, downstream distribution visibility, and verified statutory recall broadcasting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsInitiatingRecall(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/20 flex items-center space-x-2 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Initiate Verified Recall</span>
            </button>
            <button
              onClick={onNavigateToScan}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center space-x-2 transition-all"
            >
              <span>Scan Batch QA Barcode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recall Workflow Description */}
      <div className="bg-slate-100 dark:bg-slate-850 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <div className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
          <span className="text-base">🔄</span>
          <span>Verified Manufacturer Recall Workflow:</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center pt-2">
          {[
            { step: '1', title: 'Initiate Recall', desc: 'Select affected batch' },
            { step: '2', title: 'Trace Holders', desc: 'Scan downstream logistics' },
            { step: '3', title: 'Broadcast Alert', desc: 'Notify distributors/retailers' },
            { step: '4', title: 'Quarantine', desc: 'Freeze stock from selling' },
            { step: '5', title: 'Reverse Logistics', desc: 'Retrieve physical stock' },
            { step: '6', title: 'Resolution', desc: 'Record final disposal' }
          ].map((s, idx) => (
            <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white inline-flex items-center justify-center font-bold text-[10px] mb-1">
                {s.step}
              </span>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{s.title}</div>
              <div className="text-[10px] text-slate-500">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recalls Initiated Table */}
      {issuedRecalls.length > 0 && (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-red-500/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-extrabold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>Active Manufacturer Recall Broadcasts ({issuedRecalls.length})</span>
          </div>

          <div className="space-y-3">
            {issuedRecalls.map((rec, i) => (
              <div key={i} className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-red-700 dark:text-red-400">{rec.recall_id}</span>
                    <span className="mx-2 text-slate-400">•</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">Batch: {rec.batch_number}</span>
                    <span className="mx-2 text-slate-400">•</span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-red-100 text-red-800">{rec.classification}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-red-600 text-white">
                    {rec.status}
                  </span>
                </div>

                <div className="text-slate-600 dark:text-slate-300">
                  <strong>Reason:</strong> {rec.reason}
                </div>
                <div className="text-red-700 dark:text-red-300 font-semibold">
                  <strong>Action Directive:</strong> {rec.recommended_action}
                </div>

                <div className="pt-2 border-t border-red-200 dark:border-red-900 flex justify-between text-[11px] text-slate-500">
                  <span>Downstream holders alerted: <strong>{rec.downstream_holders_notified} locations</strong></span>
                  <a href={rec.regulatory_bulletin_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    Official Bulletin URL
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Master Catalog */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📦</span>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Product Master Catalog (Registered SKUs)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {productMaster.length} SKUs registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {productMaster.map((prod) => (
            <div key={prod.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-2">
              <div className="flex justify-between items-start">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {prod.product_name}
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 font-bold">
                  {prod.sku}
                </span>
              </div>
              <div className="text-slate-500">
                {prod.brand} • {prod.category} ({prod.subcategory})
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px]">
                <span className="text-slate-500">Shelf life: {prod.standard_shelf_life_days} days</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  Temp: {prod.storage_temp_min_c}°C to {prod.storage_temp_max_c}°C
                </span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <span>Mfg Batches: {prod.total_manufactured_batches}</span>
                <span>Active in Market: {prod.active_in_circulation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Downstream Distribution Logs */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🚚</span>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Downstream Dispatches & Reverse-Logistics Traceability
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {dispatches.length} logged dispatches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Dispatch #</th>
                <th className="px-4 py-3">Downstream Recipient</th>
                <th className="px-4 py-3">Product & Batch</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {dispatches.map((d, idx) => (
                <tr key={d.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {d.dispatch_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-extrabold text-slate-900 dark:text-white">{d.recipient_name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{d.recipient_type}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {d.product_name} <span className="font-mono text-slate-400">({d.batch_number})</span>
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {d.unit_count} units
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                    {d.expiry_date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      d.dispatch_status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {d.dispatch_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Recall Modal */}
      {isInitiatingRecall && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-extrabold text-red-600 dark:text-red-400 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5" />
              <span>Broadcast Verified Statutory Recall</span>
            </h3>
            <p className="text-xs text-slate-500">
              This workflow will scan all downstream distributor, wholesaler, retailer, and hospital holding records for the specified batch and broadcast an urgent quarantine alert.
            </p>
            <form onSubmit={handleInitiateRecall} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Batch Number to Recall</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LOT-DAIRY-8891 or PARA-REC-2024-09"
                  value={recallForm.batch_number}
                  onChange={e => setRecallForm({ ...recallForm, batch_number: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Severity Classification</label>
                  <select
                    value={recallForm.classification}
                    onChange={e => setRecallForm({ ...recallForm, classification: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Class I">Class I (Dangerous / Life-threatening)</option>
                    <option value="Class II">Class II (Temporary or reversible hazard)</option>
                    <option value="Class III">Class III (Unlikely adverse consequences)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-DAIRY-YOG-500"
                    value={recallForm.product_sku}
                    onChange={e => setRecallForm({ ...recallForm, product_sku: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Recall</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Microbial contamination risk identified during routine post-packaging QA."
                  value={recallForm.reason}
                  onChange={e => setRecallForm({ ...recallForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Recommended Action Directive</label>
                <input
                  type="text"
                  placeholder="e.g. Quarantine immediately. Cease distribution. Reverse-logistics will retrieve."
                  value={recallForm.recommended_action}
                  onChange={e => setRecallForm({ ...recallForm, recommended_action: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInitiatingRecall(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
                >
                  Confirm & Broadcast Recall
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
