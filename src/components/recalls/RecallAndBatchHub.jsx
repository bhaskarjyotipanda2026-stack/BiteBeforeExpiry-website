import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, GitCommit, BrainCircuit, Search, AlertTriangle, 
  ExternalLink, CheckCircle, ArrowRight, Truck, Plus, 
  Calendar, MapPin, Building, Activity, Info, BarChart2,
  Package, Filter, RefreshCw, Sparkles, Thermometer
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { 
  checkProductRecall, 
  scanInventoryForRecalls, 
  OFFICIAL_RECALL_REGISTRY,
  RECALL_MATCH_TYPES 
} from '../../services/productRecallService';
import { 
  BATCH_ROLES, 
  MOVEMENT_TYPES, 
  ROLE_CAPABILITIES, 
  createBatchMovementRecord 
} from '../../services/batchTrackingService';
import { predictWasteRisk, RISK_LEVELS } from '../../services/wastePredictionService';
import { useApp } from '../../context/AppContext';

export function RecallAndBatchHub({ onNavigateToScan }) {
  const { showToast } = useApp();
  
  // Sub-tabs: 'recalls' | 'batches' | 'waste_ai'
  const [activeSubTab, setActiveSubTab] = useState('recalls');

  // 1. Recalls state
  const [recalls, setRecalls] = useState([]);
  const [recallSearchQuery, setRecallSearchQuery] = useState('');
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // 2. Batch tracking state
  const [selectedRole, setSelectedRole] = useState(BATCH_ROLES.HOUSEHOLD);
  const [movements, setMovements] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('LOT-DAIRY-8891');
  const [showLogMovementModal, setShowLogMovementModal] = useState(false);
  const [newMovement, setNewMovement] = useState({
    batch_number: 'LOT-DAIRY-8891',
    product_name: 'Organic Whole Milk 1L',
    from_location: 'Refrigerator Top Shelf',
    to_location: 'Freezer Bay',
    quantity_moved: 1,
    movement_type: MOVEMENT_TYPES.RELOCATED,
    temperature: '3.4°C',
    notes: 'Moved surplus bottle to freezer before expiry'
  });

  // 3. AI Waste Prediction state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [wastePredictions, setWastePredictions] = useState([]);
  const [selectedPredictionItem, setSelectedPredictionItem] = useState(null);

  const loadData = async () => {
    try {
      const recs = await dbService.getOfficialRecalls();
      setRecalls(recs || OFFICIAL_RECALL_REGISTRY);

      const moves = await dbService.getBatchMovements();
      setMovements(moves || []);

      const hhItems = await dbService.getHouseholdInventory('usr_demo_primary_001');
      const bizItems = await dbService.getBusinessInventory('biz_demo_001');
      const combined = [...(hhItems || []), ...(bizItems || [])];
      setInventoryItems(combined);

      // Audit inventory for recalls
      const matches = scanInventoryForRecalls(combined);
      setInventoryAlerts(matches);

      // Run AI Waste Risk Predictions
      const preds = combined
        .filter(item => item.status === 'ACTIVE' || item.status === 'EXPIRING_SOON' || item.inventory_status === 'IN_STOCK')
        .map(item => ({
          item,
          prediction: predictWasteRisk({
            productName: item.product_name,
            category: item.category,
            currentQuantity: item.quantity,
            expiryDate: item.expiry_date,
            storageLocation: item.storage_location,
            historicalRecords: combined
          })
        }));
      setWastePredictions(preds);
      if (preds.length > 0) setSelectedPredictionItem(preds[0]);
    } catch (err) {
      console.error('Error loading Recall & Batch Hub data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAuditNow = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const matches = scanInventoryForRecalls(inventoryItems);
      setInventoryAlerts(matches);
      setIsAuditing(false);
      if (matches.length > 0) {
        showToast?.(`AUDIT WARNING: ${matches.length} item(s) match official regulatory recall notices!`, 'error');
      } else {
        showToast?.('Audit Complete: Zero active recall matches found in your inventory.', 'success');
      }
    }, 600);
  };

  const handleLogMovement = async (e) => {
    e.preventDefault();
    try {
      const record = createBatchMovementRecord({
        batchNumber: newMovement.batch_number,
        productName: newMovement.product_name,
        fromLocation: newMovement.from_location,
        toLocation: newMovement.to_location,
        quantity: newMovement.quantity_moved,
        actorRole: selectedRole,
        actorName: `${selectedRole.toUpperCase()} Operator`,
        movementType: newMovement.movement_type,
        temperature: newMovement.temperature,
        notes: newMovement.notes
      });

      await dbService.logBatchMovement(record);
      showToast?.(`Logged batch movement (${record.movement_type})`, 'success');
      setShowLogMovementModal(false);
      loadData();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const filteredRecalls = recalls.filter(r => 
    r.product_name.toLowerCase().includes(recallSearchQuery.toLowerCase()) ||
    (r.brand || '').toLowerCase().includes(recallSearchQuery.toLowerCase()) ||
    (r.barcode || '').includes(recallSearchQuery) ||
    (r.batch_numbers || []).some(b => b.toLowerCase().includes(recallSearchQuery.toLowerCase()))
  );

  const selectedBatchMovements = movements.filter(m => 
    (m.batch_number || '').toUpperCase() === selectedBatch.toUpperCase()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* HUB BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Safety, Traceability & Intelligence Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Recall Alerts, Batch Tracking & Waste Prediction
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm">
              Verify official regulatory safety bulletins, track custodial batch handovers across the supply chain, 
              and review AI-driven consumption velocity predictions.
            </p>
          </div>

          {/* Sub-Tab Navigation Bar */}
          <div className="bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 flex flex-wrap gap-1 shrink-0">
            <button
              onClick={() => setActiveSubTab('recalls')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'recalls'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Product Recalls ({inventoryAlerts.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('batches')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'batches'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Batch Tracking</span>
            </button>

            <button
              onClick={() => setActiveSubTab('waste_ai')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'waste_ai'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>AI Waste Prediction</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PRODUCT RECALL ALERTS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'recalls' && (
        <div className="space-y-6">
          
          {/* Regulatory Authenticity Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 p-4 rounded-2xl flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <strong className="font-extrabold uppercase tracking-wider block mb-0.5">
                Official Regulatory Data Only — Zero Fabricated Recalls
              </strong>
              BiteBeforeExpiry connects directly to verified enforcement reports from the U.S. FDA, USDA FSIS, 
              and WHO. A product is never flagged as recalled without documented official regulatory evidence.
            </div>
          </div>

          {/* ACTIVE INVENTORY MATCH ALERT (If User Has Recalled Product) */}
          {inventoryAlerts.length > 0 ? (
            <div className="bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-500 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-bounce" />
                  <h3 className="text-base sm:text-lg font-black text-rose-950 dark:text-rose-100">
                    URGENT: {inventoryAlerts.length} Item(s) in Your Inventory Match Active Official Recalls!
                  </h3>
                </div>
                <button
                  onClick={handleAuditNow}
                  className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 text-rose-700 text-xs font-bold border border-rose-300"
                >
                  Re-scan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {inventoryAlerts.map(alert => (
                  <div key={alert.item_id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-300 dark:border-rose-900 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                          {alert.recallDetails.classification}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {alert.product_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Lot: <strong className="font-mono text-rose-600">{alert.batch_number}</strong> • In: {alert.storage_location}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {alert.recallDetails.recall_date}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Hazard:</strong> {alert.recallDetails.reason}
                    </p>

                    <div className="text-[11px] bg-rose-50 dark:bg-rose-950/50 p-2.5 rounded-xl text-rose-900 dark:text-rose-200">
                      <strong>Mandatory Official Action:</strong> {alert.recallDetails.recommended_action}
                    </div>

                    <a 
                      href={alert.recallDetails.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs font-bold text-rose-600 hover:underline pt-1"
                    >
                      <span>Official Regulatory Bulletin ({alert.recallDetails.source})</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Inventory Recall Audit: All Clear
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    None of your {inventoryItems.length} active inventory products match official FDA, USDA, or WHO recall bulletins.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAuditNow}
                disabled={isAuditing}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
                <span>Re-Audit Inventory</span>
              </button>
            </div>
          )}

          {/* OFFICIAL RECALL DIRECTORY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Verified Regulatory Safety Bulletins
                </h3>
                <p className="text-xs text-slate-500">
                  Search active Class I and Class II food and medicine recalls
                </p>
              </div>

              <div className="relative min-w-[260px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recall by brand, lot, or barcode..."
                  value={recallSearchQuery}
                  onChange={(e) => setRecallSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecalls.map(recall => (
                <div key={recall.recall_id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        recall.classification === 'Class I' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {recall.classification}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                        {recall.product_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Brand: <strong>{recall.brand}</strong> • Date: {recall.recall_date}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      {recall.recall_id}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p><strong>Recalled Batches:</strong> <span className="font-mono font-bold text-rose-600">{recall.batch_numbers.join(', ')}</span></p>
                    <p><strong>Hazard / Reason:</strong> {recall.reason}</p>
                    <p className="text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300">
                      <strong>Official Directive:</strong> {recall.recommended_action}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">{recall.source}</span>
                    <a 
                      href={recall.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center space-x-1"
                    >
                      <span>View Official Notice</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BATCH-LEVEL TRACKING TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'batches' && (
        <div className="space-y-6">
          
          {/* Role-Based Stakeholder Switcher */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Stakeholder Role & Custody Context
                </h3>
                <p className="text-xs text-slate-500">
                  Switch roles to simulate batch custodial handovers and RBAC access permissions
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { role: BATCH_ROLES.HOUSEHOLD, label: 'Household' },
                  { role: BATCH_ROLES.RETAILER, label: 'Retailer' },
                  { role: BATCH_ROLES.WHOLESALER, label: 'Wholesaler' },
                  { role: BATCH_ROLES.PHARMACY, label: 'Pharmacy' },
                  { role: BATCH_ROLES.MANUFACTURER, label: 'Manufacturer' }
                ].map(({ role, label }) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedRole === role
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong>Active Role Capabilities ({selectedRole.toUpperCase()}):</strong>
                <span className="ml-1 text-slate-600 dark:text-slate-300">
                  Allowed movements: {ROLE_CAPABILITIES[selectedRole].allowedMovements.join(', ')}
                </span>
              </div>

              <button
                onClick={() => setShowLogMovementModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Custodial Movement</span>
              </button>
            </div>
          </div>

          {/* Batch Selector & Full Movement Timeline */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Batch Custody Movement Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  Select a registered batch to inspect unbroken custodial movements & temperature readings
                </p>
              </div>

              <div className="flex space-x-2">
                {['LOT-DAIRY-8891', 'AMX-404-X'].map(batch => (
                  <button
                    key={batch}
                    onClick={() => setSelectedBatch(batch)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                      selectedBatch === batch
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {batch}
                  </button>
                ))}
              </div>
            </div>

            {/* Movement Timeline */}
            <div className="relative border-l-2 border-indigo-500/40 ml-4 pl-6 space-y-6">
              {selectedBatchMovements.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No recorded movements for batch {selectedBatch}. Log a movement above!
                </p>
              ) : (
                selectedBatchMovements.map(mov => (
                  <div key={mov.id} className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 ring-2 ring-indigo-500/30" />
                    
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-600 text-white">
                            {mov.movement_type}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {mov.from_location} → {mov.to_location}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {mov.timestamp}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-4">
                        <span>Quantity: <strong>{mov.quantity_moved} units</strong></span>
                        <span>Operator: <strong>{mov.actor_name} ({mov.actor_role})</strong></span>
                        {mov.temperature_reading && (
                          <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <Thermometer className="w-3.5 h-3.5" />
                            <span>{mov.temperature_reading}</span>
                          </span>
                        )}
                      </div>

                      {mov.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          "{mov.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AI WASTE RISK PREDICTION TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'waste_ai' && (
        <div className="space-y-6">
          
          {/* Methodology Callout */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start space-x-3">
            <BrainCircuit className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="font-extrabold uppercase tracking-wider block mb-0.5">
                AI Waste & Expiry Risk Prediction Engine (Predictions, Not Facts)
              </strong>
              Estimates which products risk remaining unused before expiration by modeling current quantity, 
              remaining shelf life, storage environment, and historical consumption velocity. All ratings are explicitly 
              labelled as statistical predictions to help proactively plan meals or redistribute surplus.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Predictions List */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Active Product Risk Evaluations ({wastePredictions.length})
              </h3>

              <div className="space-y-3">
                {wastePredictions.map(({ item, prediction }) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPredictionItem({ item, prediction })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedPredictionItem?.item.id === item.id
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {item.category} • Qty: {item.quantity}
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {item.product_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Expires: {item.expiry_date} ({prediction.daysRemaining !== null ? `${prediction.daysRemaining}d left` : 'Undated'}) • In: {item.storage_location}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        prediction.riskLevel === RISK_LEVELS.HIGH
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse'
                          : prediction.riskLevel === RISK_LEVELS.MEDIUM
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      }`}>
                        {prediction.riskLevel}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      💡 {prediction.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Explainable Reasons Panel (Selected Product) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 h-fit">
              {selectedPredictionItem ? (
                <>
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      Prediction Model Explanations
                    </span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedPredictionItem.item.product_name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Risk Level: <strong className="uppercase">{selectedPredictionItem.prediction.riskLevel}</strong>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Why was this rating predicted?
                    </span>
                    
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {selectedPredictionItem.prediction.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <p>Turnover Velocity: <strong>{selectedPredictionItem.prediction.consumptionVelocity}</strong></p>
                      <p>Estimated Unused Units: <strong>{selectedPredictionItem.prediction.estimatedUnusedQuantity} units</strong></p>
                      <p>Methodology: <em>{selectedPredictionItem.prediction.methodology}</em></p>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                      ⚠️ <strong>Reminder:</strong> Predictions are decision aids to prevent waste, not factual guarantees. Always inspect food condition before eating.
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">
                  Select a product to inspect explainable AI prediction factors.
                </p>
              )}
            </div>

          </div>

        </div>
      )}

      {/* LOG BATCH MOVEMENT MODAL */}
      {showLogMovementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Log Batch Custodial Movement
              </h3>
              <button onClick={() => setShowLogMovementModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleLogMovement} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMovement.batch_number}
                    onChange={(e) => setNewMovement({ ...newMovement, batch_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Movement Type
                  </label>
                  <select
                    value={newMovement.movement_type}
                    onChange={(e) => setNewMovement({ ...newMovement, movement_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {ROLE_CAPABILITIES[selectedRole].allowedMovements.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product Description *
                </label>
                <input
                  type="text"
                  required
                  value={newMovement.product_name}
                  onChange={(e) => setNewMovement({ ...newMovement, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    From Location
                  </label>
                  <input
                    type="text"
                    required
                    value={newMovement.from_location}
                    onChange={(e) => setNewMovement({ ...newMovement, from_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    To Destination Location
                  </label>
                  <input
                    type="text"
                    required
                    value={newMovement.to_location}
                    onChange={(e) => setNewMovement({ ...newMovement, to_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity Moved
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMovement.quantity_moved}
                    onChange={(e) => setNewMovement({ ...newMovement, quantity_moved: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Temperature (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3.4°C"
                    value={newMovement.temperature}
                    onChange={(e) => setNewMovement({ ...newMovement, temperature: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Movement Reason / Log Notes
                </label>
                <textarea
                  rows={2}
                  value={newMovement.notes}
                  onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogMovementModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Authorize & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
