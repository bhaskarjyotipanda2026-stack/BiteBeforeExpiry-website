import React, { useState, useEffect } from 'react';
import { 
  Pill, AlertTriangle, ShieldCheck, ShieldAlert, CheckCircle, 
  Trash2, Plus, Search, Filter, HelpCircle, Info, ExternalLink,
  Flame, Lock
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { 
  evaluateMedicineStatus, 
  getSafeDisposalGuidance, 
  MEDICINE_PROVENANCE,
  RECALL_STATUS
} from '../../services/medicineInventoryService';
import { useApp } from '../../context/AppContext';

export function MedicineInventoryScreen() {
  const { showToast } = useApp();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New medicine form
  const [newMed, setNewMed] = useState({
    medicine_name: '',
    brand: '',
    barcode: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    quantity: 1,
    storage_location: 'Main Medicine Cabinet (Cool, Dry)',
    source: 'barcode',
    verification_status: 'VERIFIED_SOURCE_DATA'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await dbService.getMedicineInventory('usr_demo_primary_001');
      setMedicines(items || []);
    } catch (err) {
      console.error('Error loading medicine inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!newMed.medicine_name || !newMed.expiry_date || !newMed.batch_number) {
      showToast?.('Medicine name, batch number, and expiry date are required', 'error');
      return;
    }

    const evaluation = evaluateMedicineStatus(newMed);
    const itemToSave = {
      ...newMed,
      status: evaluation.status,
      recall_status: evaluation.recallCheck.status,
      safe_disposal_guidance: evaluation.disposalGuidance.primaryInstructions
    };

    await dbService.saveMedicineItem(itemToSave);
    setShowAddModal(false);
    setNewMed({
      medicine_name: '',
      brand: '',
      barcode: '',
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      quantity: 1,
      storage_location: 'Main Medicine Cabinet (Cool, Dry)',
      source: 'barcode',
      verification_status: 'VERIFIED_SOURCE_DATA'
    });
    showToast?.('Medicine saved with batch safety tracking', 'success');
    loadData();
  };

  const handleDelete = async (id) => {
    await dbService.deleteMedicineItem(id);
    showToast?.('Medicine record removed', 'info');
    loadData();
  };

  const evaluatedItems = medicines.map(m => ({
    ...m,
    evaluation: evaluateMedicineStatus(m)
  }));

  const recalledItems = evaluatedItems.filter(m => m.evaluation.recallCheck.status === RECALL_STATUS.CONFIRMED_RECALL);
  const expiredItems = evaluatedItems.filter(m => m.evaluation.status === 'EXPIRED');

  const filteredItems = evaluatedItems.filter(m => {
    const matchSearch = m.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.batch_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLoc = selectedStorage === 'ALL' || m.storage_location === selectedStorage;
    return matchSearch && matchLoc;
  });

  const locations = ['ALL', ...new Set(medicines.map(m => m.storage_location).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Title & Clinical Safety Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/30">
            <Pill className="w-3.5 h-3.5 text-blue-300" />
            <span>Healthcare & Clinical Inventory Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Medicine Expiry & Batch Safety Management
          </h1>
          <p className="mt-2 text-blue-100 text-xs sm:text-sm leading-relaxed">
            Batch-tracked monitoring for households, clinics, pharmacies, and healthcare inventory. 
            Automated recall matching, provenance tracking, and verified FDA/WHO safe disposal protocols.
          </p>

          <div className="mt-5 flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Log Medicine Batch</span>
            </button>
          </div>
        </div>
      </div>

      {/* STRICT CLINICAL NON-LIABILITY & ACCURACY DIRECTIVE */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-2xl flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200">
          <strong className="font-extrabold uppercase tracking-wider block mb-0.5">
            Clinical Safety Mandate & Regulatory Disclaimer
          </strong>
          BiteBeforeExpiry does not provide medical diagnosis, dosage alterations, or treatment recommendations. 
          Pharmaceutical data must never be fabricated. Culinary recipes are strictly prohibited for medical products. 
          Expired medicines lose chemical stability and potency — never ingest expired drugs.
        </div>
      </div>

      {/* CRITICAL RECALL ALERTS SECTION */}
      {recalledItems.length > 0 && (
        <section className="bg-red-100/90 dark:bg-red-950/80 border-2 border-red-500 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 animate-bounce" />
            <h2 className="text-base sm:text-lg font-black text-red-950 dark:text-red-100">
              URGENT CLINICAL ALERT: Confirmed Manufacturer Batch Recalls ({recalledItems.length})
            </h2>
          </div>
          <p className="text-xs text-red-800 dark:text-red-300">
            The following batches match official safety recall advisories. Immediately quarantine all units. 
            DO NOT DISPENSE OR ADMINISTER TO PATIENTS.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {recalledItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-300 dark:border-red-900 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.medicine_name}
                    </h3>
                    <p className="text-xs text-slate-500">{item.brand} • Lot: <strong className="font-mono text-red-600">{item.batch_number}</strong></p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white">
                    {item.evaluation.recallCheck.details.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <strong className="text-red-600">Reason:</strong> {item.evaluation.recallCheck.details.reason}
                </p>
                <div className="text-[11px] bg-red-50 dark:bg-red-950/60 p-2 rounded-xl text-red-800 dark:text-red-300 font-medium">
                  <strong>Action Required:</strong> {item.evaluation.recallCheck.details.actionRequired}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SAFE DISPOSAL PROTOCOLS */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            FDA & WHO Safe Pharmaceutical Disposal Protocol
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-white font-bold mb-1">
              1. Drug Take-Back Locations (Best)
            </strong>
            Drop off unneeded or expired medications at authorized pharmacy collection kiosks or annual DEA Drug Take-Back day locations.
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-white font-bold mb-1">
              2. Household Trash (If No Take-Back)
            </strong>
            Mix uncrushed tablets with coffee grounds or dirt in a sealed zip bag. Discard bag in household trash. Scratch off prescription labels.
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-white font-bold mb-1">
              3. Never Flush Unless on Flush List
            </strong>
            Flushing medicines contaminates water supplies. Do NOT pour down sinks or flush down toilets unless explicitly on the FDA flush list.
          </div>
        </div>
      </section>

      {/* MEDICINE INVENTORY TABLE */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Medicine Cabinet & Clinical Stock
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredItems.length} registered pharmaceutical lots
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search drug, lot, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={selectedStorage}
              onChange={(e) => setSelectedStorage(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc === 'ALL' ? 'All Storage Locations' : loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Medicine & Brand</th>
                <th className="py-3 px-3">Batch / Lot #</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Storage Location</th>
                <th className="py-3 px-3">Data Provenance</th>
                <th className="py-3 px-3">Safety Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No medicine items recorded.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.medicine_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.brand || 'Generic'} • Qty: {item.quantity} units
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.batch_number}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 dark:text-white">{item.expiry_date}</div>
                      <div className="text-[10px]">
                        {item.evaluation.daysRemaining !== null ? (
                          item.evaluation.daysRemaining <= 0 ? (
                            <span className="font-bold text-rose-600">Expired</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">{item.evaluation.daysRemaining}d remaining</span>
                          )
                        ) : 'Undated'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {item.storage_location}
                    </td>
                    <td className="py-3 px-3">
                      {/* Transparent Data Provenance Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.verification_status === 'VERIFIED_SOURCE_DATA'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                          : item.verification_status === 'OCR_RESULT'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.verification_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.evaluation.status === 'RECALLED'
                          ? 'bg-red-600 text-white animate-pulse'
                          : item.evaluation.status === 'EXPIRED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : item.evaluation.status === 'EXPIRING_SOON'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {item.evaluation.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950"
                        title="Delete medicine record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD MEDICINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Log Medicine Batch
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddMedicine} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medicine / Generic Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin Trihydrate 500mg"
                  value={newMed.medicine_name}
                  onChange={(e) => setNewMed({ ...newMed, medicine_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Biocure Labs"
                    value={newMed.brand}
                    onChange={(e) => setNewMed({ ...newMed, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch / Lot Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AMX-404-X"
                    value={newMed.batch_number}
                    onChange={(e) => setNewMed({ ...newMed, batch_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newMed.expiry_date}
                    onChange={(e) => setNewMed({ ...newMed, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Storage Environment
                  </label>
                  <select
                    value={newMed.storage_location}
                    onChange={(e) => setNewMed({ ...newMed, storage_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Main Medicine Cabinet (Cool, Dry)">Main Cabinet (Cool, Dry)</option>
                    <option value="Refrigerated Storage (2°C - 8°C)">Refrigerated (2°C - 8°C)</option>
                    <option value="First Aid Shelf">First Aid Shelf</option>
                    <option value="Emergency Kit">Emergency Kit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data Provenance Source
                </label>
                <select
                  value={newMed.verification_status}
                  onChange={(e) => setNewMed({ ...newMed, verification_status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="VERIFIED_SOURCE_DATA">VERIFIED SOURCE DATA (OpenFDA / NDC)</option>
                  <option value="OCR_RESULT">OCR RESULT (Scanned Packaging)</option>
                  <option value="USER_INPUT">USER INPUT (Manual Entry)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
