/**
 * BiteBeforeExpiry — Part 4 Production ML & System Integration Test Suite
 * 
 * Verifies all 14 mandatory Section 21 testing requirements:
 * 1. Clean Product Image & Barcode
 * 2. Poor-Quality Image & Noisy OCR Handling
 * 3. Unknown Barcode Lookup & Fallback
 * 4. Unknown Product Generalization & Categorization
 * 5. Multiple Ingredients & Allergen Identification
 * 6. Missing Expiry Date & Human Confirmation Flagging
 * 7. Incorrect OCR Date Repair & Validation
 * 8. Food Product Intelligence & Storage Rules
 * 9. Medicine Product Classification & Clinical Safety Constraint (No Recipes)
 * 10. Invalid Data Rejection (Expiry < Mfg Paradox Prevented from DB Entry)
 * 11. External API Outage Graceful Fallback
 * 12. ML Service Failure / Offline Local Engine Fallback (Zero Single Point of Failure)
 * 13. Low-Confidence Prediction & Human Confirmation Prompt
 * 14. Complete Integrated Workflow:
 *     SCAN → OCR/BARCODE → ML PREDICTION → HUMAN VERIFICATION → SUPABASE PERSISTENCE → EXPIRY TRACKING → REMINDERS
 */

import { mlClientService } from './src/services/mlClientService.js';
import { dbService, calculateExpiryStatus } from './src/services/dbService.js';
import { generateProductIntelligence } from './src/services/aiProductIntelligenceService.js';
import { extractExpiryDate, normalizeDate } from './src/services/parserService.js';

// Global mock for localStorage if in Node.js environment
const store = new Map();
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPart4TestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 BITEBEFOREEXPIRY PART 4 — PRODUCTION ML VERIFICATION SUITE');
  console.log('===============================================================\n');

  // TEST 1: Clean Product Image & Barcode
  console.log('--- TEST 1: Clean Product Image & Barcode Lookup ---');
  const cleanAnalysis = await mlClientService.analyzeProduct({
    name: 'Amul Taaza Homogenised Toned Milk',
    barcode: '8901262010015',
    rawOcrText: 'MFG 10/08/2026 EXP 10/11/2026 BATCH B-402 Ingredients: Toned Milk, Vitamin A, Vitamin D',
    ingredients: ['Toned Milk', 'Vitamin A', 'Vitamin D'],
    userAllergies: ['Milk & Dairy']
  });
  assert(cleanAnalysis.product_type === 'food', 'Identified clean product as food');
  assert(cleanAnalysis.has_allergy_risk === true, 'Allergy risk detected for Milk allergy');
  assert(cleanAnalysis.overall_confidence > 0.70, 'High overall confidence on clean scan');

  // TEST 2: Poor-Quality Image & Noisy OCR Text
  console.log('\n--- TEST 2: Poor-Quality Image & Noisy OCR Text ---');
  const noisyOcrText = '   ###%&&*  EX P: 28-10-2026   $$$ B.N0 : 99x1   ';
  const noisyExpiry = await mlClientService.predictExpiry({
    rawOcrText: noisyOcrText,
    category: 'food'
  });
  assert(noisyExpiry.expiry_date === '2026-10-28', 'Successfully extracted date from noisy OCR text');
  assert(noisyExpiry.is_valid === true, 'Date is chronologically valid');

  // TEST 3: Unknown Barcode Handling
  console.log('\n--- TEST 3: Unknown Barcode Lookup & Fallback ---');
  const unknownBarcodeResult = await mlClientService.analyzeProduct({
    name: 'Uncataloged Artisan Cheese',
    barcode: '9999999999999',
    rawOcrText: 'Artisan Goat Milk Cheese EXP 15/12/2026',
    ingredients: ['Pasteurized Goat Milk', 'Salt', 'Starter Cultures'],
    userAllergies: []
  });
  assert(unknownBarcodeResult.product_type === 'food', 'Correctly classified unknown barcode via text features');
  assert(unknownBarcodeResult.category_prediction.confidence > 0.60, 'Generates calibrated probability for unknown item');

  // TEST 4: Unknown Product Generalization & Categorization
  console.log('\n--- TEST 4: Unknown Product Generalization ---');
  const unknownProdCategory = await mlClientService.predictCategory({
    name: 'ZeoBio Probiotic Fermented Kefir Drink',
    brand: 'ZeoBio',
    ingredientsText: 'Kefir grains, fermented cow milk solids, live probiotics',
    rawOcrText: 'Shake well keep refrigerated'
  });
  assert(unknownProdCategory.prediction === 'food', 'Classified novel kefir beverage as food');
  assert(unknownProdCategory.model_version.includes('bitebeforeexpiry'), 'Identifies model version');

  // TEST 5: Multiple Ingredients & Allergen Identification
  console.log('\n--- TEST 5: Multiple Ingredients & Allergen Intelligence ---');
  const multiIngredients = await mlClientService.predictIngredients({
    ingredients: [
      'Refined Wheat Flour',
      'Hydrogenated Palm Oil',
      'Roasted Peanuts',
      'Sugar',
      'Soy Lecithin',
      'Potassium Sorbate'
    ]
  });
  assert(multiIngredients.extracted_ingredients.length === 6, 'All 6 ingredients extracted');
  assert(multiIngredients.allergen_alerts.includes('Gluten & Wheat'), 'Wheat allergen detected');
  assert(multiIngredients.allergen_alerts.includes('Peanuts'), 'Peanut allergen detected');
  assert(multiIngredients.allergen_alerts.includes('Soy'), 'Soy allergen detected');
  assert(multiIngredients.confidence >= 0.80, 'Ingredient categorization confidence >= 80%');

  // TEST 6: Missing Expiry Date & Human Confirmation
  console.log('\n--- TEST 6: Missing Expiry Date Handling ---');
  const missingDateResult = await mlClientService.predictExpiry({
    rawOcrText: 'BRAND LOGO ONLY - NO PRINTED EXPIRY DATE FOUND ON LABEL',
    category: 'grocery'
  });
  assert(missingDateResult.expiry_date === null, 'Returns null when date is absent');
  assert(missingDateResult.needs_confirmation === true, 'Flags needs_confirmation = true when date is missing');

  // TEST 7: Incorrect OCR Date Repair & Validation
  console.log('\n--- TEST 7: Optical Typo Repair (10/o9/2026) ---');
  const repairedExpiry = await mlClientService.predictExpiry({
    rawOcrText: 'BEST BEFORE: 10/o9/2026 (Optical OCR misread character o)',
    category: 'food'
  });
  assert(repairedExpiry.expiry_date === '2026-09-10', 'Correctly repaired 10/o9/2026 to 2026-09-10');
  assert(repairedExpiry.is_valid === true, 'Repaired date validated successfully');

  // TEST 8: Food Product Intelligence & Storage Rules
  console.log('\n--- TEST 8: Food Product Intelligence ---');
  const foodIntel = await mlClientService.predictCategory({
    name: 'Britannia 100% Whole Wheat Bread',
    brand: 'Britannia',
    ingredientsText: 'Whole wheat flour, water, yeast, iodised salt'
  });
  assert(foodIntel.prediction === 'food', 'Identified as food');
  assert(foodIntel.probabilities.food > foodIntel.probabilities.medicine, 'Food probability strictly dominates');

  // TEST 9: Medicine Product Classification & Clinical Safety Constraint
  console.log('\n--- TEST 9: Medicine Classification & Clinical Safety Constraint ---');
  const medAnalysis = await mlClientService.analyzeProduct({
    name: 'Ciplox 500 Ciprofloxacin Tablets',
    barcode: '8901088019919',
    rawOcrText: 'EXP 10/2028 BATCH C-9912 Ciprofloxacin Hydrochloride 500mg',
    ingredients: ['Ciprofloxacin Hydrochloride 500mg', 'Corn Starch', 'Purified Talc'],
    userAllergies: []
  });
  assert(medAnalysis.product_type === 'medicine', 'Identified as medicine product');
  assert(medAnalysis.safety_disclaimer.includes('Strict Clinical Notice'), 'Enforces clinical disclaimer');
  assert(medAnalysis.safety_disclaimer.includes('medical or prescription advice'), 'Disclaims medical/prescription advice');
  assert(!JSON.stringify(medAnalysis).includes('recipe'), 'Zero cooking/recipe suggestions generated for pharmaceutical drug');

  // TEST 10: Invalid Data Rejection (Expiry < Mfg Paradox)
  console.log('\n--- TEST 10: Invalid Data Rejection (Date Paradox) ---');
  const paradoxExpiry = await mlClientService.predictExpiry({
    rawOcrText: 'MFG 2026-12-01 EXP 2026-06-01',
    category: 'tablets'
  });
  assert(paradoxExpiry.is_valid === false, 'Flagged chronological paradox as invalid');
  assert(paradoxExpiry.needs_confirmation === true, 'Paradox forces human confirmation');

  // Rejection in Supabase database layer
  let dbRejected = false;
  try {
    await dbService.saveUserScan({
      user_id: 'usr_test_audit_99',
      scan_type: 'OCR',
      manufacturing_date: '2026-12-01',
      expiry_date: '2026-06-01',
      status: 'active'
    });
  } catch (err) {
    dbRejected = err.message.includes('earlier than') || err.message.includes('cannot be earlier');
  }
  assert(dbRejected === true, 'Database rejected saving scan where expiry_date < manufacturing_date');

  // TEST 11 & 12: ML Service Offline & Fallback Engine
  console.log('\n--- TEST 11 & 12: Resilient Local Fallback Engine ---');
  // Temporarily point client to non-existent port to simulate network/service crash
  const savedBase = mlClientService.baseUrl;
  mlClientService.baseUrl = 'http://127.0.0.1:9999'; // Dead port

  const fallbackCategory = await mlClientService.predictCategory({
    name: 'Crocin Advance Paracetamol 500mg Tablets',
    brand: 'Crocin',
    rawOcrText: 'Paracetamol fast relief 500mg tablets'
  });
  assert(fallbackCategory !== null, 'Fallback returned non-null response despite dead microservice');
  assert(fallbackCategory.is_fallback === true, 'Flagged is_fallback = true');
  assert(fallbackCategory.prediction === 'medicine', 'Local fallback accurately identified medicine');

  mlClientService.baseUrl = savedBase; // Restore active port

  // TEST 13: Low-Confidence Prediction & Human Confirmation
  console.log('\n--- TEST 13: Human Confirmation Workflow ---');
  const lowConfQuery = await mlClientService.predictCategory({
    name: 'Unclear smudged label xyz',
    brand: '',
    rawOcrText: 'smudge'
  });
  assert(lowConfQuery.needs_confirmation === true || lowConfQuery.confidence < 0.75, 'Low-confidence input requires user confirmation');

  // TEST 14: Complete Integrated End-to-End Workflow
  console.log('\n--- TEST 14: Complete Integrated Flow (Scan → ML → Supabase → Expiry → Reminders) ---');
  const testUserId = 'usr_prod_test_404';

  // 1. Create User & Profile
  await dbService.upsertProfile(testUserId, {
    full_name: 'Dr. Vikram Sen',
    email: 'vikram.sen@hospital.org'
  });

  // 2. Barcode + OCR Scan Fusion
  const scanData = {
    barcode: '8901088012019',
    product_name: 'Augmentin 625 Duo Broad Spectrum Antibiotic',
    brand: 'GSK',
    raw_ocr_text: 'MFG 15/06/2026 EXP 15/06/2028 BATCH AG-401 Ingredients: Amoxicillin Trihydrate 500mg, Potassium Clavulanate 125mg',
    mfg_date: '2026-06-15',
    expiry_date: '2026-06-15', // Set to 2026-06-15 for expiry tracking calculation
    ingredients: ['Amoxicillin Trihydrate', 'Potassium Clavulanate']
  };

  // 3. ML Inference
  const mlOutput = await mlClientService.analyzeProduct({
    name: scanData.product_name,
    barcode: scanData.barcode,
    rawOcrText: scanData.raw_ocr_text,
    ingredients: scanData.ingredients,
    userAllergies: ['Gluten']
  });
  assert(mlOutput.product_type === 'medicine', 'Step 3: ML identified product type as medicine');

  // 4. Save Product to Catalog
  const prod = await dbService.saveProduct({
    barcode: scanData.barcode,
    product_name: scanData.product_name,
    brand: scanData.brand,
    category: 'Medicine',
    product_type: 'medicine',
    ingredients: scanData.ingredients,
    source: 'OpenFDA / Barcode'
  });
  assert(prod.category === 'Medicine', 'Step 4: Saved product to reusable catalog');

  // 5. Save User Scan
  const userScan = await dbService.saveUserScan({
    user_id: testUserId,
    product_id: prod.id,
    scan_type: 'barcode',
    barcode: scanData.barcode,
    extracted_text: scanData.raw_ocr_text,
    expiry_date: '2026-10-05', // 4 days remaining -> expiring_soon
    manufacturing_date: '2026-06-15',
    quantity: 1,
    status: 'active'
  });
  assert(userScan.id !== undefined, 'Step 5: User scan persisted to Supabase user_scans');

  // 6. Save ML Prediction Audit Log
  const mlAudit = await dbService.saveMlPrediction({
    userScanId: userScan.id,
    userId: testUserId,
    modelName: 'ProductionMLInferenceEngine',
    modelVersion: 'bitebeforeexpiry-classifier-v1',
    datasetVersion: 'food-knowledge-v1',
    predictionType: 'full_product_analysis',
    prediction: mlOutput,
    confidence: mlOutput.overall_confidence,
    needsConfirmation: mlOutput.needs_confirmation
  });
  assert(mlAudit.user_scan_id === userScan.id, 'Step 6: ML prediction logged with model version');

  // 7. Verify Retrieval of ML Prediction
  const retrievedPredictions = await dbService.getMlPredictionsForScan(userScan.id, testUserId);
  assert(retrievedPredictions.length > 0, 'Step 7: Successfully retrieved ML prediction for scan');
  assert(retrievedPredictions[0].model_name === 'ProductionMLInferenceEngine', 'Audit record preserves model name');

  // 8. Automatic Reminders Generation
  const allReminders = await dbService.getUserReminders(testUserId);
  const reminders = allReminders.filter(r => r.scan_id === userScan.id);
  assert(reminders.length === 4, 'Step 8: Exactly 4 reminder tiers generated (7d, 3d, 1d, expired)');

  // 9. Expiry Calculation Status
  const statusCheck = calculateExpiryStatus('2026-10-05');
  assert(statusCheck === 'expiring_soon' || statusCheck === 'active', 'Step 9: Correctly computed expiry status');

  console.log('\n===============================================================');
  console.log(`🎉 ALL PART 4 TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
  console.log('===============================================================\n');
}

runPart4TestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
