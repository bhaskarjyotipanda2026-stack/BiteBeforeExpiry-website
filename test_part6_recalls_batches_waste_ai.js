/**
 * BiteBeforeExpiry — Part 6 Automated Verification Suite
 * 
 * Tests:
 * 1. Product Recall Alerts (Official Sources, Barcode/Batch Matching, Regulatory Actions)
 * 2. Batch-Level Tracking & Movement Auditing across 5 Stakeholder Roles
 * 3. AI Waste & Expiry Risk Prediction Engine (Inputs, Explainable Reasons, No Invented Numbers)
 * 4. Database Persistence & Offline Fallback for Recalls, Movements, and Predictions
 */

import { 
  checkProductRecall, 
  scanInventoryForRecalls, 
  OFFICIAL_RECALL_REGISTRY, 
  RECALL_MATCH_TYPES,
  RECALL_CLASSIFICATIONS 
} from './src/services/productRecallService.js';

import { 
  BATCH_ROLES, 
  MOVEMENT_TYPES, 
  ROLE_CAPABILITIES, 
  canExecuteMovement, 
  createBatchMovementRecord, 
  SAMPLE_BATCH_TRAILS 
} from './src/services/batchTrackingService.js';

import { 
  predictWasteRisk, 
  extractHistoricalPatterns, 
  RISK_LEVELS, 
  CATEGORY_CONSUMPTION_BASELINES 
} from './src/services/wastePredictionService.js';

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

function getRelativeDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

console.log('\n===============================================================');
console.log('🧪 BITEBEFOREEXPIRY — PART 6 RECALLS, BATCHES & AI RISK SUITE');
console.log('===============================================================\n');

// ----------------------------------------------------------------------------
// 1. PRODUCT RECALL ALERTS (OFFICIAL SOURCES & ACCURATE MATCHING)
// ----------------------------------------------------------------------------
console.log('--- 1. Official Product Recall Alerts Tests ---');

// Official registry integrity
assert(OFFICIAL_RECALL_REGISTRY.length >= 5, 'Official recall registry has real documented recalls');
assert(OFFICIAL_RECALL_REGISTRY.every(r => r.source_url.startsWith('https://')), 'All recalls have verifiable official regulatory source URLs');
assert(OFFICIAL_RECALL_REGISTRY.every(r => r.recommended_action && r.recommended_action.length > 10), 'All recalls contain detailed official action recommendations');

// Confirmed Match: Barcode + Recalled Batch Lot (Boar\'s Head Deli Meat)
const confirmedMatch = checkProductRecall({
  barcode: '042421001234',
  batchNumber: 'EST-12612-JUL24',
  productName: 'Boar\'s Head Liverwurst'
});
assert(confirmedMatch.hasRecall === true, 'Matches verified recall for Boar\'s Head lot');
assert(confirmedMatch.matchType === RECALL_MATCH_TYPES.CONFIRMED_MATCH, 'Classification is CONFIRMED_MATCH');
assert(confirmedMatch.recallDetails.classification === RECALL_CLASSIFICATIONS.CLASS_I, 'Class I severity correctly assigned');
assert(confirmedMatch.recallDetails.reason.includes('Listeria'), 'Correct official hazard cited (Listeria)');
assert(confirmedMatch.recallDetails.recommended_action.includes('DO NOT CONSUME'), 'Official recommended action directs DO NOT CONSUME');

// Confirmed Match: Eye drops recall (OptiClear)
const confirmedMedRecall = checkProductRecall({
  barcode: '890103082214',
  batchNumber: 'OPT-7712-B',
  productName: 'OptiClear Lubricant Eye Drops 10ml'
});
assert(confirmedMedRecall.hasRecall === true, 'Matches verified drug recall for OptiClear');
assert(confirmedMedRecall.matchType === RECALL_MATCH_TYPES.CONFIRMED_MATCH, 'Classified as CONFIRMED_MATCH');
assert(confirmedMedRecall.recallDetails.category === 'medicine', 'Category is medicine');

// Potential Match: Barcode matches recalled line, but batch is unverified
const potentialMatch = checkProductRecall({
  barcode: '051500255162', // Jif Peanut butter
  batchNumber: '', // Unspecified
  productName: 'Jif Creamy Peanut Butter'
});
assert(potentialMatch.hasRecall === true, 'Flags potential recall when barcode matches');
assert(potentialMatch.matchType === RECALL_MATCH_TYPES.POTENTIAL_MATCH, 'Classified as POTENTIAL_MATCH (requires physical package batch check)');
assert(potentialMatch.confidenceStatement.includes('Please inspect physical package batch'), 'Directs user to inspect physical package lot');

// Clear: Unrecalled Product
const cleanProduct = checkProductRecall({
  barcode: '123456789012',
  batchNumber: 'SAFE-LOT-001',
  productName: 'Organic Brown Rice'
});
assert(cleanProduct.hasRecall === false, 'Safe unlisted product returns hasRecall: false');
assert(cleanProduct.matchType === RECALL_MATCH_TYPES.CLEAR, 'Match type is CLEAR');
assert(cleanProduct.confidenceStatement.includes('No active safety recalls identified'), 'States no active recalls in verified databases');

// Scan Entire Inventory
const inventoryToAudit = [
  { id: 'item_1', product_name: 'Organic Whole Milk', barcode: '111111111111', batch_number: 'LOT-MILK-99', storage_location: 'Fridge' },
  { id: 'item_2', product_name: 'Boar\'s Head Ready-To-Eat Liverwurst', barcode: '042421001234', batch_number: 'EST-12612-JUL24', storage_location: 'Deli Drawer' },
  { id: 'item_3', product_name: 'OptiClear Lubricant Eye Drops 10ml', barcode: '890103082214', batch_number: 'OPT-7712-B', storage_location: 'Bathroom Safe' }
];

const auditResults = scanInventoryForRecalls(inventoryToAudit);
assert(auditResults.length === 2, 'scanInventoryForRecalls accurately identified exactly 2 recalled inventory items');
assert(auditResults.some(a => a.item_id === 'item_2'), 'Boar\'s Head item flagged in inventory audit');
assert(auditResults.some(a => a.item_id === 'item_3'), 'OptiClear item flagged in inventory audit');

// ----------------------------------------------------------------------------
// 2. BATCH-LEVEL TRACKING & MOVEMENT ACROSS 5 ROLES
// ----------------------------------------------------------------------------
console.log('\n--- 2. Batch-Level Tracking & Movement Tests ---');

// RBAC Role Verification
assert(canExecuteMovement('manufacturer', MOVEMENT_TYPES.MANUFACTURED) === true, 'Manufacturer can execute MANUFACTURED');
assert(canExecuteMovement('household', MOVEMENT_TYPES.MANUFACTURED) === false, 'Household CANNOT execute MANUFACTURED');
assert(canExecuteMovement('retailer', MOVEMENT_TYPES.DISPATCHED_FEFO) === true, 'Retailer can execute DISPATCHED_FEFO');
assert(canExecuteMovement('wholesaler', MOVEMENT_TYPES.TRANSFERRED_IN) === true, 'Wholesaler can execute TRANSFERRED_IN');
assert(canExecuteMovement('pharmacy', MOVEMENT_TYPES.DISPOSED_SAFELY) === true, 'Pharmacy can execute DISPOSED_SAFELY');
assert(canExecuteMovement('household', MOVEMENT_TYPES.CONSUMED) === true, 'Household can execute CONSUMED');

// Create standardized movement record
const validMovement = createBatchMovementRecord({
  batchNumber: 'LOT-DAIRY-8891',
  productName: 'Organic Whole Milk 1L',
  fromLocation: 'Walk-in Chiller',
  toLocation: 'Display Aisle Shelf',
  quantity: 12,
  actorRole: BATCH_ROLES.RETAILER,
  actorName: 'Retail Associate',
  movementType: MOVEMENT_TYPES.RELOCATED,
  temperature: '3.6°C',
  notes: 'Rotated onto front display per FEFO'
});
assert(validMovement.id && validMovement.batch_number === 'LOT-DAIRY-8891', 'Movement record created with valid ID');
assert(validMovement.movement_type === MOVEMENT_TYPES.RELOCATED, 'Movement type recorded as RELOCATED');
assert(validMovement.quantity_moved === 12, 'Quantity moved recorded (12)');
assert(validMovement.temperature_reading === '3.6°C', 'Cold chain temperature logged');

// Unauthorized movement rejection
let errorThrown = false;
try {
  createBatchMovementRecord({
    batchNumber: 'BATCH-001',
    productName: 'Bread',
    fromLocation: 'Oven',
    toLocation: 'Counter',
    quantity: 1,
    actorRole: BATCH_ROLES.HOUSEHOLD,
    movementType: MOVEMENT_TYPES.MANUFACTURED // Unauthorized for household
  });
} catch (err) {
  errorThrown = true;
}
assert(errorThrown === true, 'createBatchMovementRecord strictly rejects unauthorized movement for role');

// Sample audit trails
assert(SAMPLE_BATCH_TRAILS['LOT-DAIRY-8891'].length >= 4, 'Batch LOT-DAIRY-8891 has complete 4-step custody trail');
assert(SAMPLE_BATCH_TRAILS['AMX-404-X'].length >= 3, 'Pharmaceutical batch AMX-404-X has 3-step custody trail');

// ----------------------------------------------------------------------------
// 3. AI WASTE/EXPIRY RISK PREDICTION (TRANSPARENT, NO INVENTED NUMBERS)
// ----------------------------------------------------------------------------
console.log('\n--- 3. AI Waste & Expiry Risk Prediction Tests ---');

// Historical pattern extraction
const mockHistory = [
  { product_name: 'Milk', category: 'Dairy', status: 'CONSUMED' },
  { product_name: 'Yogurt', category: 'Dairy', status: 'CONSUMED' },
  { product_name: 'Cream', category: 'Dairy', status: 'EXPIRED' },
  { product_name: 'Apples', category: 'Produce', status: 'CONSUMED' }
];
const patterns = extractHistoricalPatterns(mockHistory, 'Dairy');
assert(patterns.hasSufficientData === true, 'Identifies sufficient historical data points (>= 3 records)');
assert(patterns.previousExpiredCount === 1, 'Correctly computed 1 previous expired item in Dairy');
assert(patterns.previousConsumedCount === 2, 'Correctly computed 2 previously consumed items in Dairy');
assert(patterns.velocityUnitsPerDay > 0, 'Velocity is positive float based on real consumption');

// Test Case A: Multiple units expiring tomorrow -> HIGH RISK
const highRiskCase = predictWasteRisk({
  productName: 'Organic Whole Milk',
  category: 'Dairy',
  currentQuantity: 3,
  expiryDate: getRelativeDateStr(1), // Expires in 1 day
  storageLocation: 'Refrigerator Top Shelf',
  historicalRecords: mockHistory
});
assert(highRiskCase.riskLevel === RISK_LEVELS.HIGH, 'Predicts HIGH RISK for 3 units expiring tomorrow');
assert(highRiskCase.isPrediction === true, 'Explicitly marked as isPrediction: true');
assert(highRiskCase.predictionLabel.includes('PREDICTION'), 'Prediction label prominently declares PREDICTION');
assert(highRiskCase.reasons.length >= 1, 'Provides explainable reasons');
assert(highRiskCase.reasons[0].includes('exceeds estimated consumption capacity'), 'Reason cites quantity exceeding consumption capacity');
assert(highRiskCase.recommendedAction.includes('Freeze immediately or prepare'), 'Recommends freezing or immediate preparation');

// Test Case B: 1 unit expiring in 14 days -> LOW RISK
const lowRiskCase = predictWasteRisk({
  productName: 'Extra Virgin Olive Oil',
  category: 'Pantry',
  currentQuantity: 1,
  expiryDate: getRelativeDateStr(14),
  storageLocation: 'Pantry Shelf',
  historicalRecords: mockHistory
});
assert(lowRiskCase.riskLevel === RISK_LEVELS.LOW, 'Predicts LOW RISK for 1 unit with 14 days remaining');
assert(lowRiskCase.estimatedUnusedQuantity === 0, 'Estimated unused quantity is 0');
assert(lowRiskCase.recommendedAction.includes('Optimal freshness') || lowRiskCase.recommendedAction.includes('Maintain current'), 'Recommends maintaining pace');

// Test Case C: Missing Expiry Date -> INSUFFICIENT DATA
const noDateCase = predictWasteRisk({
  productName: 'Mysterious Snack',
  category: 'Pantry',
  currentQuantity: 2,
  expiryDate: null,
  storageLocation: 'Pantry Shelf',
  historicalRecords: mockHistory
});
assert(noDateCase.riskLevel === RISK_LEVELS.INSUFFICIENT_DATA, 'Returns INSUFFICIENT DATA when expiry date is missing');
assert(noDateCase.reasons.some(r => r.includes('No verified expiry date')), 'Explains why prediction is unavailable');

// Test Case D: Expired Item -> HIGH RISK / EXPIRED
const expiredCase = predictWasteRisk({
  productName: 'Spoiled Dip',
  category: 'Dairy',
  currentQuantity: 1,
  expiryDate: getRelativeDateStr(-2),
  storageLocation: 'Refrigerator',
  historicalRecords: mockHistory
});
assert(expiredCase.riskLevel === RISK_LEVELS.HIGH, 'Expired item assigned HIGH risk');
assert(expiredCase.predictionLabel.includes('ITEM EXPIRED'), 'Identifies product has passed expiration date');
assert(expiredCase.recommendedAction.includes('Do not consume'), 'Instructs do not consume');

// ----------------------------------------------------------------------------
// 4. DATABASE SERVICE RECALLS & BATCH MOVEMENTS PERSISTENCE
// ----------------------------------------------------------------------------
console.log('\n--- 4. Database Persistence & Operations Tests ---');

// Mock localStorage in Node.js
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v.toString(); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// 4.1 Official recalls DB query
const dbRecalls = await dbService.getOfficialRecalls();
assert(Array.isArray(dbRecalls) && dbRecalls.length >= 5, 'dbService.getOfficialRecalls returns seeded regulatory records');

// 4.2 Batch movements DB query & log
const initialMovements = await dbService.getBatchMovements('LOT-DAIRY-8891');
assert(Array.isArray(initialMovements) && initialMovements.length >= 4, 'dbService.getBatchMovements returns sample movement history');

const loggedMov = await dbService.logBatchMovement({
  batch_number: 'LOT-DAIRY-8891',
  product_name: 'Organic Whole Milk 1L',
  from_location: 'Display Aisle Shelf',
  to_location: 'Consumer Refrigerator',
  quantity_moved: 1,
  actor_role: 'household',
  actor_name: 'Consumer A',
  movement_type: 'TRANSFERRED_IN',
  temperature_reading: '3.8°C',
  notes: 'Purchased and placed in home fridge'
});
assert(loggedMov.id && loggedMov.actor_role === 'household', 'dbService.logBatchMovement persisted new movement');

const updatedMovements = await dbService.getBatchMovements('LOT-DAIRY-8891');
assert(updatedMovements.length === initialMovements.length + 1, 'getBatchMovements accurately reflects new logged movement count');

// 4.3 Save Waste Risk Prediction
const savedPred = await dbService.saveWasteRiskPrediction({
  product_name: 'Organic Whole Milk',
  category: 'Dairy',
  current_quantity: 3,
  expiry_date: getRelativeDateStr(1),
  risk_level: 'HIGH RISK',
  reasons: ['Expires tomorrow with surplus quantity'],
  recommended_action: 'Freeze excess portions immediately'
});
assert(savedPred.id && savedPred.risk_level === 'HIGH RISK', 'dbService.saveWasteRiskPrediction persisted risk prediction');

console.log('\n===============================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
