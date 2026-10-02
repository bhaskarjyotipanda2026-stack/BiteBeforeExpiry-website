/**
 * BiteBeforeExpiry — Part 5 Automated Verification Suite
 * 
 * Tests:
 * 1. Household Expiry Management & "USE FIRST" Priority Engine
 * 2. Food Waste Reduction & Empirical Analytics
 * 3. Business Mode, FEFO Dispatch Sorting, RBAC, Bulk Import & Capital-at-Risk
 * 4. Medicine Batch Tracking, Safety Mandates, Recall Matching & Safe Disposal
 * 5. Donation Before Expiry Safety Validator & Retailer-to-Consumer Traceability
 * 6. Database Service Persistence & Offline Fallback for all modules
 */

import { determineUseFirstPriority, calculateDaysRemaining, sortInventoryByFefo, USE_FIRST_PRIORITIES } from './src/services/fefoService.js';
import { calculateHouseholdAnalytics } from './src/services/householdAnalyticsService.js';
import { 
  hasPermission, 
  parseBulkInventoryImport, 
  computeBusinessMetrics, 
  BUSINESS_ROLES 
} from './src/services/businessService.js';
import { 
  getSafeDisposalGuidance, 
  checkBatchRecall, 
  evaluateMedicineStatus, 
  RECALL_STATUS 
} from './src/services/medicineInventoryService.js';
import { 
  validateDonationEligibility, 
  lookupProductTraceability 
} from './src/services/donationAndTraceabilityService.js';
import { dbService } from './src/services/dbService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function getOffsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

console.log('\n===============================================================');
console.log('🧪 BITEBEFOREEXPIRY — PART 5 COMPREHENSIVE VERIFICATION SUITE');
console.log('===============================================================\n');

// ----------------------------------------------------------------------------
// 1. USE-FIRST SYSTEM & FEFO SORTING ENGINE
// ----------------------------------------------------------------------------
console.log('--- 1. USE-FIRST System & FEFO Engine Tests ---');

const highPriority = determineUseFirstPriority(getOffsetDate(1));
assert(highPriority.priority === USE_FIRST_PRIORITIES.HIGH, 'Expires in 1 day is HIGH priority');
assert(highPriority.isSafeToConsume === true, 'High priority item is still safe to consume before expiry');
assert(highPriority.isExpired === false, 'High priority item is not marked as expired');

const medPriority = determineUseFirstPriority(getOffsetDate(3));
assert(medPriority.priority === USE_FIRST_PRIORITIES.MEDIUM, 'Expires in 3 days is MEDIUM priority');
assert(medPriority.isSafeToConsume === true, 'Medium priority is safe to consume');

const lowPriority = determineUseFirstPriority(getOffsetDate(6));
assert(lowPriority.priority === USE_FIRST_PRIORITIES.LOW, 'Expires in 6 days is LOW priority');

const expiredPriority = determineUseFirstPriority(getOffsetDate(-2));
assert(expiredPriority.priority === USE_FIRST_PRIORITIES.EXPIRED, 'Expired item is marked EXPIRED');
assert(expiredPriority.isSafeToConsume === false, 'Expired item is strictly NOT safe to consume');
assert(expiredPriority.isExpired === true, 'Expired item isExpired flag is true');
assert(expiredPriority.actionPrompt.includes('DO NOT CONSUME'), 'Action prompt strictly warns not to consume expired food');

// Medicine specific expired directive
const medExpired = determineUseFirstPriority(getOffsetDate(-1), 'medicine');
assert(medExpired.actionPrompt.includes('DO NOT INGEST'), 'Medicine expired prompt warns DO NOT INGEST');

// FEFO Sort Engine
const unsortedStock = [
  { product_name: 'Safe Milk', expiry_date: getOffsetDate(20) },
  { product_name: 'Expired Yogurt', expiry_date: getOffsetDate(-3) },
  { product_name: 'Immediate Bread', expiry_date: getOffsetDate(1) },
  { product_name: 'Soon Salmon', expiry_date: getOffsetDate(3) }
];
const fefoSorted = sortInventoryByFefo(unsortedStock);
assert(fefoSorted[0].product_name === 'Immediate Bread', 'FEFO rank #1 is item with nearest valid expiry (1 day)');
assert(fefoSorted[1].product_name === 'Soon Salmon', 'FEFO rank #2 is item expiring in 3 days');
assert(fefoSorted[2].product_name === 'Safe Milk', 'FEFO rank #3 is item expiring in 20 days');
assert(fefoSorted[3].product_name === 'Expired Yogurt', 'Expired item is placed at bottom of dispatch queue (never dispatch expired stock!)');

// ----------------------------------------------------------------------------
// 2. EMPIRICAL HOUSEHOLD ANALYTICS (NO INVENTED STATS)
// ----------------------------------------------------------------------------
console.log('\n--- 2. Household Analytics Tests ---');

const mockHouseholdItems = [
  { id: '1', status: 'CONSUMED', consumed_at: getOffsetDate(-5), expiry_date: getOffsetDate(2), estimated_value: 60, storage_location: 'Fridge' },
  { id: '2', status: 'CONSUMED', consumed_at: getOffsetDate(-1), expiry_date: getOffsetDate(10), estimated_value: 120, storage_location: 'Pantry' },
  { id: '3', status: 'EXPIRED', expiry_date: getOffsetDate(-2), estimated_value: 40, storage_location: 'Fridge' },
  { id: '4', status: 'DISCARDED', estimated_value: 30, storage_location: 'Pantry' },
  { id: '5', status: 'ACTIVE', expiry_date: getOffsetDate(1), estimated_value: 50, storage_location: 'Fridge' },
  { id: '6', status: 'ACTIVE', expiry_date: getOffsetDate(4), estimated_value: 70, storage_location: 'Counter' }
];

const analytics = calculateHouseholdAnalytics(mockHouseholdItems);
assert(analytics.totalTracked === 6, 'Total tracked matches exact array length (6)');
assert(analytics.consumedBeforeExpiry === 2, 'Consumed before expiry correctly counted (2)');
assert(analytics.expiredCount === 1, 'Expired items correctly counted (1)');
assert(analytics.discardedCount === 1, 'Discarded items correctly counted (1)');
assert(analytics.estimatedWastePrevented === 180, 'Waste prevented is exactly sum of consumed items (60 + 120 = 180)');
assert(analytics.estimatedWasteLost === 70, 'Waste lost is exactly sum of expired + discarded (40 + 30 = 70)');
assert(analytics.useFirstBreakdown.high === 1, 'USE-FIRST high priority count is 1');
assert(analytics.useFirstBreakdown.low === 1, 'USE-FIRST low priority count is 1');

// ----------------------------------------------------------------------------
// 3. BUSINESS MODE, RBAC, BULK IMPORT & FEFO QUEUE
// ----------------------------------------------------------------------------
console.log('\n--- 3. Business Mode, RBAC & FEFO Inventory Tests ---');

// RBAC
assert(hasPermission('admin', 'manage_staff') === true, 'Admin has manage_staff permission');
assert(hasPermission('admin', 'delete_records') === true, 'Admin has delete_records permission');
assert(hasPermission('manager', 'manage_staff') === false, 'Manager does NOT have manage_staff permission');
assert(hasPermission('manager', 'bulk_import') === true, 'Manager has bulk_import permission');
assert(hasPermission('staff', 'bulk_import') === false, 'Staff does NOT have bulk_import permission');
assert(hasPermission('staff', 'dispatch_fefo') === true, 'Staff has dispatch_fefo permission');

// Bulk CSV Import
const sampleCsv = `
French Artisan Baguettes,793573189912,Bakery,BAG-2026-10A,24,Artisan Boulangerie Supplies,2026-09-29,2026-10-02,Bakery Front Display,35.00
Atlantic Salmon Fillets,890103082214,Seafood,SAL-OCT-09,15,Nordic Ocean Catch Co.,2026-09-28,2026-10-03,Cold Seafood Case,180.00
`;
const parsed = parseBulkInventoryImport(sampleCsv);
assert(parsed.length === 2, 'Bulk CSV parsed 2 items');
assert(parsed[0].product_name === 'French Artisan Baguettes', 'Parsed product name matches');
assert(parsed[0].quantity === 24, 'Parsed quantity matches (24)');
assert(parsed[0].unit_cost === 35.0, 'Parsed unit cost matches (35.0)');

// Commercial Metrics & Capital at Risk
const businessInventory = [
  { id: 'b1', product_name: 'Near Expiry Item', expiry_date: getOffsetDate(2), quantity: 10, unit_cost: 50, inventory_status: 'IN_STOCK', category: 'Dairy' },
  { id: 'b2', product_name: 'Safe Item', expiry_date: getOffsetDate(40), quantity: 20, unit_cost: 100, inventory_status: 'IN_STOCK', category: 'Pantry' },
  { id: 'b3', product_name: 'Expired Item', expiry_date: getOffsetDate(-1), quantity: 5, unit_cost: 60, inventory_status: 'IN_STOCK', category: 'Bakery' }
];

const bizMetrics = computeBusinessMetrics(businessInventory);
assert(bizMetrics.items.length === 3, 'Enhanced items count matches');
assert(bizMetrics.metrics.totalUnits === 35, 'Total inventory units is 35 (10 + 20 + 5)');
assert(bizMetrics.metrics.capitalAtRisk === 500, 'Capital at risk is 500 (10 units * 50 unit_cost expiring in 2d)');
assert(bizMetrics.metrics.expiredUnits === 5, 'Expired units is 5');
assert(bizMetrics.metrics.expiredValue === 300, 'Expired loss value is 300 (5 * 60)');
assert(bizMetrics.items[0].fefoRank === 1, 'Item with 2d expiry is FEFO rank 1');
assert(bizMetrics.items[2].isExpired === true, 'Expired item is flagged isExpired');
assert(bizMetrics.items[2].dispatchRecommendation.includes('DO NOT DISPATCH'), 'Expired commercial stock dispatch recommendation warns DO NOT DISPATCH');

// ----------------------------------------------------------------------------
// 4. MEDICINE BATCH SAFETY, RECALL CHECKING & SAFE DISPOSAL
// ----------------------------------------------------------------------------
console.log('\n--- 4. Medicine Safety & Recall Verification Tests ---');

// Safe Disposal Guidance
const disposal = getSafeDisposalGuidance('Amoxicillin');
assert(disposal.primaryMethod.includes('Take-Back'), 'Safe disposal recommends Drug Take-Back');
assert(disposal.flushDisclaimer.includes('DO NOT flush'), 'Safe disposal strictly disclaims flushing down drains');
assert(disposal.disclaimer.includes('does not provide medical diagnoses'), 'Clinical non-liability disclaimer present');

// Recall Matching
const recallResult = checkBatchRecall('Paracetamol', 'PARA-REC-2024-09');
assert(recallResult.status === RECALL_STATUS.CONFIRMED_RECALL, 'Recalled batch PARA-REC-2024-09 correctly identified as CONFIRMED_RECALL');
assert(recallResult.details.severity === 'Class II', 'Recall details show Class II severity');

const safeBatch = checkBatchRecall('Amoxicillin', 'SAFE-LOT-9988');
assert(safeBatch.status === RECALL_STATUS.CLEAR, 'Unlisted batch correctly returns CLEAR recall status');

// Medicine Evaluation
const recalledMed = evaluateMedicineStatus({
  medicine_name: 'Paracetamol Pediatric Oral Suspension',
  batch_number: 'PARA-REC-2024-09',
  expiry_date: getOffsetDate(100)
});
assert(recalledMed.canAdminister === false, 'Recalled medicine canAdminister is false');
assert(recalledMed.status === 'RECALLED', 'Recalled medicine status is RECALLED');

const expiredMed = evaluateMedicineStatus({
  medicine_name: 'Cough Syrup',
  batch_number: 'LOT-CS-1',
  expiry_date: getOffsetDate(-5)
});
assert(expiredMed.canAdminister === false, 'Expired medicine canAdminister is false');
assert(expiredMed.status === 'EXPIRED', 'Expired medicine status is EXPIRED');
assert(expiredMed.safetyDirective.includes('DO NOT INGEST'), 'Expired medicine safety directive says DO NOT INGEST');

const validMed = evaluateMedicineStatus({
  medicine_name: 'Amoxicillin Trihydrate 500mg',
  batch_number: 'LOT-AMX-200',
  expiry_date: getOffsetDate(60)
});
assert(validMed.canAdminister === true, 'Valid unexpired medicine canAdminister is true');
assert(validMed.status === 'ACTIVE', 'Valid medicine status is ACTIVE');

// ----------------------------------------------------------------------------
// 5. DONATION BEFORE EXPIRY & TRACEABILITY
// ----------------------------------------------------------------------------
console.log('\n--- 5. Donation Eligibility & Traceability Tests ---');

// Donation Eligibility Rules
const validDonation = validateDonationEligibility({
  product_name: 'Organic Apples',
  category: 'Produce',
  expiry_date: getOffsetDate(4)
});
assert(validDonation.isEligible === true, 'Food with 4 days remaining is eligible for donation');

const expiredDonation = validateDonationEligibility({
  product_name: 'Stale Bread',
  category: 'Bakery',
  expiry_date: getOffsetDate(-1)
});
assert(expiredDonation.isEligible === false, 'Expired food is strictly INELIGIBLE for donation');
assert(expiredDonation.reason.includes('SAFETY VIOLATION'), 'Expired donation rejection cites safety violation');

const immediateDonation = validateDonationEligibility({
  product_name: 'Milk',
  category: 'Dairy',
  expiry_date: getOffsetDate(0) // Expires today / < 1 day
});
assert(immediateDonation.isEligible === false, 'Item expiring today (< 24h) is ineligible for donation');

const medDonation = validateDonationEligibility({
  product_name: 'Antibiotics',
  category: 'Medicine',
  expiry_date: getOffsetDate(100)
});
assert(medDonation.isEligible === false, 'Medicines cannot be donated through food rescue channels');

// Consumer Traceability
const traceRecord = lookupProductTraceability('TRC-ORG-2024-8891');
assert(traceRecord !== null, 'Traceability lookup finds TRC-ORG-2024-8891');
assert(traceRecord.lifecycle_stages.length === 5, 'Traceability lifecycle contains all 5 stages');
assert(traceRecord.lifecycle_stages[0].stage === 'MANUFACTURER', 'Stage 1 is MANUFACTURER');
assert(traceRecord.lifecycle_stages[1].stage === 'DISTRIBUTOR', 'Stage 2 is DISTRIBUTOR');
assert(traceRecord.lifecycle_stages[2].stage === 'WHOLESALER', 'Stage 3 is WHOLESALER');
assert(traceRecord.lifecycle_stages[3].stage === 'RETAILER', 'Stage 4 is RETAILER');
assert(traceRecord.lifecycle_stages[4].stage === 'CONSUMER', 'Stage 5 is CONSUMER');
assert(traceRecord.lifecycle_stages[0].cold_chain_temp === '3.2°C', 'Manufacturer cold chain temperature logged');

// ----------------------------------------------------------------------------
// 6. DB SERVICE INTEGRATION & OFFLINE PERSISTENCE
// ----------------------------------------------------------------------------
console.log('\n--- 6. Database Service Module Operations Tests ---');

// Mock localStorage in Node.js environment
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v.toString(); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// Household DB
const initialHh = await dbService.getHouseholdInventory('usr_demo_primary_001');
assert(Array.isArray(initialHh) && initialHh.length > 0, 'dbService.getHouseholdInventory returns default seeded items');

const savedHh = await dbService.saveHouseholdItem({
  product_name: 'Test Almond Milk',
  category: 'Dairy',
  quantity: 2,
  expiry_date: getOffsetDate(10),
  storage_location: 'Refrigerator'
});
assert(savedHh.id && savedHh.product_name === 'Test Almond Milk', 'dbService.saveHouseholdItem persists new item');

const updatedHh = await dbService.updateHouseholdItem(savedHh.id, { status: 'CONSUMED' });
assert(updatedHh.status === 'CONSUMED', 'dbService.updateHouseholdItem updates status');

const deleteHh = await dbService.deleteHouseholdItem(savedHh.id);
assert(deleteHh === true, 'dbService.deleteHouseholdItem removes item');

// Business DB
const biz = await dbService.getBusinessProfile('usr_demo_primary_001');
assert(biz && biz.business_name.includes('FreshMart'), 'dbService.getBusinessProfile returns registered business');

const staff = await dbService.getBusinessStaff(biz.id);
assert(staff.length >= 3, 'dbService.getBusinessStaff returns staff members with roles');

const binv = await dbService.getBusinessInventory(biz.id);
assert(binv.length >= 5, 'dbService.getBusinessInventory returns commercial stock batches');

// Medicine DB
const meds = await dbService.getMedicineInventory('usr_demo_primary_001');
assert(meds.length >= 3, 'dbService.getMedicineInventory returns medicine stock');

// Donation DB
const donations = await dbService.getDonationListings();
assert(donations.length >= 2, 'dbService.getDonationListings returns active donation listings');

// Traceability DB
const trace = await dbService.getTraceabilityRecord('TRC-ORG-2024-8891');
assert(trace && trace.batch_number === 'LOT-DAIRY-8891', 'dbService.getTraceabilityRecord returns public traceability view');

console.log('\n===============================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
