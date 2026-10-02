import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, Truck, ShieldCheck, AlertTriangle, CheckCircle, 
  MapPin, Calendar, Clock, Search, ArrowRight, ShieldAlert, 
  Building, ExternalLink, Thermometer, QrCode, Plus
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { 
  validateDonationEligibility, 
  VERIFIED_DONATION_PARTNERS, 
  lookupProductTraceability 
} from '../../services/donationAndTraceabilityService';
import { useApp } from '../../context/AppContext';

export function DonationTraceabilityScreen() {
  const { showToast } = useApp();
  const [activeSection, setActiveSection] = useState('donations'); // 'donations' | 'traceability'
  const [donationListings, setDonationListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Traceability search state
  const [traceSearchCode, setTraceSearchCode] = useState('TRC-ORG-2024-8891');
  const [traceResult, setTraceResult] = useState(null);

  // New donation listing modal
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [newDonation, setNewDonation] = useState({
    product_name: '',
    category: 'Produce',
    quantity: 5,
    expiry_date: '',
    organization_name: 'National Food Rescue Network',
    pickup_location: 'Store Loading Bay 2'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const listings = await dbService.getDonationListings();
      setDonationListings(listings || []);

      // Auto-lookup default trace code
      const trace = lookupProductTraceability('TRC-ORG-2024-8891');
      setTraceResult(trace);
    } catch (err) {
      console.error('Error loading donation/traceability data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    if (!newDonation.product_name || !newDonation.expiry_date) {
      showToast?.('Please specify product name and expiry date', 'error');
      return;
    }

    // STRICT SAFETY VALIDATION
    const safetyCheck = validateDonationEligibility(newDonation);
    if (!safetyCheck.isEligible) {
      showToast?.(`DONATION REJECTED: ${safetyCheck.reason}`, 'error');
      return;
    }

    await dbService.createDonationListing({
      ...newDonation,
      safety_verified: true,
      status: 'listed'
    });
    showToast?.('Surplus food donation listed with verified safety credentials!', 'success');
    setShowDonationModal(false);
    setNewDonation({
      product_name: '',
      category: 'Produce',
      quantity: 5,
      expiry_date: '',
      organization_name: 'National Food Rescue Network',
      pickup_location: 'Store Loading Bay 2'
    });
    loadData();
  };

  const handleUpdateStatus = async (id, newStatus) => {
    await dbService.updateDonationStatus(id, newStatus);
    showToast?.(`Donation status updated to "${newStatus}"`, 'success');
    loadData();
  };

  const handleTraceLookup = (e) => {
    e.preventDefault();
    const result = lookupProductTraceability(traceSearchCode);
    if (!result) {
      showToast?.(`No traceability record found for "${traceSearchCode}". Try "TRC-ORG-2024-8891" or "TRC-MED-2024-5542"`, 'error');
      return;
    }
    setTraceResult(result);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Title Banner with Section Switcher */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-3 border border-emerald-400/30">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Surplus Rescue & Supply Chain Transparency</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Donation Before Expiry & Traceability
            </h1>
            <p className="mt-2 text-emerald-100 text-xs sm:text-sm">
              Connect surplus food with verified relief organizations under strict safety validation, 
              and inspect unbroken farm-to-table batch traceability logs.
            </p>
          </div>

          {/* Section Mode Toggle */}
          <div className="bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 flex space-x-1 shrink-0">
            <button
              onClick={() => setActiveSection('donations')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'donations'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Donations Before Expiry</span>
            </button>
            <button
              onClick={() => setActiveSection('traceability')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'traceability'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Lifecycle Traceability</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: DONATIONS BEFORE EXPIRY */}
      {activeSection === 'donations' && (
        <div className="space-y-6">
          
          {/* Strict Safety Protocol Callout */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="font-extrabold uppercase tracking-wider block mb-0.5">
                Surplus Food Donation Safety Protocol
              </strong>
              Only unexpired, wholesome surplus food meeting applicable food hygiene requirements may be listed. 
              Items with less than 24 hours of shelf life remaining, unsealed high-risk prepared foods, or expired 
              goods are strictly blocked by our automated compliance engine.
            </div>
          </div>

          {/* Active Listings Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Active Surplus Food Donation Listings
              </h2>
              <p className="text-xs text-slate-500">
                Coordinated with verified regional food banks and community hunger relief teams
              </p>
            </div>

            <button
              onClick={() => setShowDonationModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>List Surplus Food for Donation</span>
            </button>
          </div>

          {/* Donation Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {donationListings.map(listing => (
              <div 
                key={listing.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                      {listing.category}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                      {listing.product_name}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    listing.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : listing.status === 'accepted'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : listing.status === 'requested'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  }`}>
                    {listing.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Expiry Date: <strong className="text-slate-800 dark:text-slate-200">{listing.expiry_date}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recipient Partner: <strong className="text-slate-800 dark:text-slate-200">{listing.organization_name}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pickup Location: {listing.pickup_location}</span>
                  </div>
                </div>

                {/* Workflow Step Transitions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Safety Certified</span>
                  </span>

                  <div className="space-x-1.5">
                    {listing.status === 'listed' && (
                      <button
                        onClick={() => handleUpdateStatus(listing.id, 'requested')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px]"
                      >
                        Simulate Org Request
                      </button>
                    )}
                    {listing.status === 'requested' && (
                      <button
                        onClick={() => handleUpdateStatus(listing.id, 'accepted')}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                      >
                        Accept Request
                      </button>
                    )}
                    {listing.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(listing.id, 'completed')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                      >
                        Confirm Handover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Verified Partner Organizations */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Verified Relief Partners in Network
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {VERIFIED_DONATION_PARTNERS.map(org => (
                <div key={org.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {org.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{org.type} • {org.operatingHours}</p>
                  <div className="text-[10px] text-slate-400">
                    Accepts: {org.acceptedCategories.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: RETAILER -> CONSUMER TRACEABILITY */}
      {activeSection === 'traceability' && (
        <div className="space-y-6">
          
          {/* Lookup Input */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Product Lifecycle & Supply Chain Verification
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter a public verification code found on product packaging to inspect the verifiable cold chain 
                and distribution checkpoints from Manufacturer to End Consumer.
              </p>
            </div>

            <form onSubmit={handleTraceLookup} className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[260px]">
                <QrCode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. TRC-ORG-2024-8891"
                  value={traceSearchCode}
                  onChange={(e) => setTraceSearchCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                Inspect Lifecycle
              </button>

              <button
                type="button"
                onClick={() => {
                  setTraceSearchCode('TRC-MED-2024-5542');
                  const t = lookupProductTraceability('TRC-MED-2024-5542');
                  setTraceResult(t);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              >
                Try Pharma Code
              </button>
            </form>
          </div>

          {/* Traceability Result View */}
          {traceResult && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              
              {/* Product Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                <div>
                  <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {traceResult.traceability_code}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {traceResult.product_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Producer: <strong>{traceResult.manufacturer_name}</strong> • Lot: <strong className="font-mono">{traceResult.batch_number}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(traceResult.public_consumer_view.certifications || []).map(cert => (
                    <span key={cert} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ✓ {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* 5-Stage Lifecycle Journey Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Custody Chain (Manufacturer → Distributor → Wholesaler → Retailer → Consumer)
                </h4>

                <div className="relative border-l-2 border-emerald-500/40 ml-4 pl-6 space-y-6">
                  {traceResult.lifecycle_stages.map((stage, idx) => (
                    <div key={stage.stage} className="relative">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900 ring-2 ring-emerald-500/30 flex items-center justify-center" />
                      
                      <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            {stage.stage}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {stage.timestamp}
                          </span>
                        </div>

                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {stage.actor}
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {stage.status}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{stage.location}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Thermometer className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {stage.cold_chain_temp}
                            </span>
                          </span>
                          <span>• Quality: <strong>{stage.quality_check}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* CREATE DONATION MODAL */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                List Surplus Food for Donation
              </h3>
              <button onClick={() => setShowDonationModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateDonation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surplus Fresh Apples (Grade A)"
                  value={newDonation.product_name}
                  onChange={(e) => setNewDonation({ ...newDonation, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Food Category
                  </label>
                  <select
                    value={newDonation.category}
                    onChange={(e) => setNewDonation({ ...newDonation, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Produce">Produce (Fruits & Veggies)</option>
                    <option value="Bakery">Bakery / Bread</option>
                    <option value="Pantry">Pantry / Canned Goods</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity (Units / Kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newDonation.quantity}
                    onChange={(e) => setNewDonation({ ...newDonation, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expiry Date * (Must be in the future, ≥ 24h)
                </label>
                <input
                  type="date"
                  required
                  value={newDonation.expiry_date}
                  onChange={(e) => setNewDonation({ ...newDonation, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Verified Relief Partner
                </label>
                <select
                  value={newDonation.organization_name}
                  onChange={(e) => setNewDonation({ ...newDonation, organization_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {VERIFIED_DONATION_PARTNERS.map(org => (
                    <option key={org.id} value={org.name}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pickup Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Loading Bay 2 or Porch Pickup Point"
                  value={newDonation.pickup_location}
                  onChange={(e) => setNewDonation({ ...newDonation, pickup_location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Verify Safety & List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
