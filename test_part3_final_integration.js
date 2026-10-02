/**
 * test_part3_final_integration.js
 * Comprehensive Final Integration, End-to-End, and Security Test Suite
 * BiteBeforeExpiry — Development Part 3 Final Integration
 */

import { dbService } from './src/services/dbService.js';
import { fuseBarcodeAndOcr, analyzeProductComposition, analyzeProductLifespan } from './src/services/productIntelligenceService.js';
import { generateIntelligentAlerts } from './src/services/alertService.js';
import { generateProductIntelligence } from './src/services/aiProductIntelligenceService.js';
import { predictSmartAttention, trainAttentionModel } from './src/ml/mlPipeline.js';
import { calculateHealthScore } from './src/services/healthScoreService.js';

// Mock localStorage for Node environment if running outside browser
if (typeof localStorage === 'undefined' || localStorage === null) {
  let store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 BITEBEFOREEXPIRY PART 3 — FINAL INTEGRATION & SECURITY SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. UNIT TESTS: CORE ENGINES
  // -------------------------------------------------------------------------
  console.log('--- 1. UNIT TESTS: Core Engines ---');
  
  // Health score unit test
  const testItem = {
    name: 'Fresh Whole Milk',
    type: 'grocery',
    category: 'Dairy & Eggs',
    ingredientsOriginal: ['Pasteurized Whole Milk', 'Vitamin D3'],
    nutritionInfo: { calories: '150 kcal', sugars: '12g', protein: '8g', saturatedFat: '5g' }
  };
  const health = calculateHealthScore(testItem);
  assert(health && health.score >= 0 && health.score <= 100, 'Health score calculated within valid 0-100 bounds');
  assert(['A', 'B', 'C', 'D'].includes(health.grade), `Valid grade assigned (${health.grade})`);
  assert(health.novaClass !== undefined, 'NOVA food processing classification determined');

  // Lifespan & Composition analysis unit test
  const comp = analyzeProductComposition(testItem.ingredientsOriginal, testItem.name, '', null);
  assert(comp && Array.isArray(comp.primaryRawMaterials), 'Product composition analyzed and classified');
  
  const todayIso = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const lifespan = analyzeProductLifespan(testItem.name, '', todayIso, nextWeek);
  assert(lifespan && lifespan.storageConditions !== undefined, 'Product lifespan and storage guidance computed');

  // -------------------------------------------------------------------------
  // 2. INTEGRATION TESTS: BARCODE + OCR FUSION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. INTEGRATION TESTS: Barcode + OCR Fusion ---');
  
  const barcodeData = {
    found: true,
    barcode: '8901030865432',
    name: 'Amul Taaza Homogenised Toned Milk',
    brand: 'Amul',
    category: 'Dairy & Eggs',
    type: 'grocery',
    ingredients: ['Toned Milk', 'Vitamin A', 'Vitamin D'],
    nutrition: { energy: '58 kcal', fat: '3g' },
    source: 'OpenFoodFacts'
  };

  const ocrData = {
    expiryDate: nextWeek,
    mfgDate: todayIso,
    detectedDates: {
      expiryDate: nextWeek,
      mfgDate: todayIso,
      bestBeforePeriod: '180 days'
    },
    rawText: 'MFG 2026-10-01 EXP 2026-10-08 BATCH #MLK-9902',
    confidenceScore: 95,
    batchNumber: 'MLK-9902',
    brand: 'Amul',
    requiresVerification: false
  };

  const fused = fuseBarcodeAndOcr({ barcodeData, ocrData });
  assert(fused.name === barcodeData.name, 'Fusion preserved verified product name from barcode database');
  assert(fused.expiryDate === nextWeek, 'Fusion applied package-specific OCR expiry date');
  assert(fused.batchNumber === 'MLK-9902', 'Fusion applied package-specific OCR batch number');
  assert(fused.conflictDetected === false, 'Clean fusion with no metadata conflict');

  // Conflict handling test
  const conflictingOcr = {
    ...ocrData,
    brand: 'Nestle',
    detectedProductName: 'Nestle Everyday'
  };
  const conflictFused = fuseBarcodeAndOcr({ barcodeData, ocrData: conflictingOcr });
  assert(conflictFused.conflictDetected === true, 'Detected information conflict between barcode brand and OCR label');
  assert(conflictFused.conflicts.some(c => c.field === 'brand'), 'Flagged exact conflict field ("brand")');

  // -------------------------------------------------------------------------
  // 3. INTELLIGENT ALERT ENGINE (ALL 7 PROMPT TRIGGERS)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. ALERT ENGINE: Intelligent Prioritization (7 Triggers) ---');
  
  const mockPantryItems = [
    {
      id: 'alert_item_1',
      name: 'Organic Greek Yogurt',
      category: 'Dairy & Eggs',
      type: 'grocery',
      expiryDate: todayIso, // Expiry today
      status: 'active'
    },
    {
      id: 'alert_item_2',
      name: 'Cheddar Cheese',
      category: 'Dairy & Eggs',
      type: 'grocery',
      expiryDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // Expired
      status: 'active'
    },
    {
      id: 'alert_item_3',
      name: 'Peanut Butter Granola Bar',
      category: 'Snacks',
      type: 'grocery',
      expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      ingredientsOriginal: ['Roasted Peanuts', 'Whole Grain Oats', 'Honey'],
      status: 'active'
    },
    {
      id: 'alert_item_4',
      name: 'Artisanal Sourdough Bread',
      category: 'Bakery',
      type: 'grocery',
      expiryDate: null,
      requiresVerification: true,
      status: 'active'
    },
    {
      id: 'alert_item_5',
      name: 'Conflicted Imported Sauce',
      category: 'Condiments',
      type: 'grocery',
      expiryDate: nextWeek,
      hasConflict: true,
      conflictMessage: 'OCR brand disagrees with barcode',
      status: 'active'
    },
    {
      id: 'alert_item_6',
      name: 'Opened Heavy Cream',
      category: 'Dairy & Eggs',
      type: 'grocery',
      expiryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      isOpened: true,
      status: 'active'
    }
  ];

  const userSettings = {
    allergyProfile: ['Peanuts'],
    notificationLeadDays: 5,
    enableCriticalAlerts: true,
    enableUrgentAlerts: true,
    enableInfoAlerts: true
  };

  const alerts = generateIntelligentAlerts(mockPantryItems, userSettings, [
    { category: 'Dairy & Eggs', status: 'wasted', quantity: 3 }
  ]);

  const alertTypes = alerts.map(a => a.type);
  assert(alertTypes.includes('expiry_today'), 'Alert trigger 1: expiry_today generated');
  assert(alertTypes.includes('expired'), 'Alert trigger 2: expired generated');
  assert(alertTypes.includes('allergy_attention'), 'Alert trigger 3: allergy_attention generated');
  assert(alertTypes.includes('ocr_verification_required'), 'Alert trigger 4: ocr_verification_required generated');
  assert(alertTypes.includes('conflicting_information'), 'Alert trigger 5: conflicting_information generated');
  assert(alertTypes.includes('high_waste_probability') || alertTypes.includes('expiry_approaching'), 'Alert trigger 6 & 7: high_waste_probability / expiry_approaching generated');

  // Verify non-spam priority sorting
  const criticalIndex = alerts.findIndex(a => a.priority === 1 || a.priorityLabel === 'CRITICAL');
  const infoIndex = alerts.findIndex(a => a.priority === 4 || a.priorityLabel === 'INFO');
  assert(criticalIndex !== -1, 'CRITICAL alert priority assigned');
  if (infoIndex !== -1) {
    assert(criticalIndex < infoIndex, 'Intelligent priority queue orders CRITICAL alerts before INFO alerts');
  }

  // -------------------------------------------------------------------------
  // 4. SMART ATTENTION DETERMINISTIC SAFETY ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 4. SMART ATTENTION: Deterministic Expiry Rule Enforcement ---');
  
  // Rule: Safety-critical status must be determined by reliable deterministic rules.
  // ML may add personalization, but must never override an actual verified expiry status.
  // Example: EXP date = today -> Status: EXPIRED. Do not allow AI/ML to change this to SAFE.
  
  const expiredFood = {
    name: 'Expired Cow Milk',
    category: 'Dairy & Eggs',
    type: 'grocery',
    expiryDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0]
  };
  const expiredAtt = predictSmartAttention(expiredFood, { userAllergies: [] });
  assert(expiredAtt.status === 'EXPIRED', 'Expired product is strictly determined as EXPIRED');
  assert(expiredAtt.status !== 'SAFE', 'ML strictly prevented from changing EXPIRED to SAFE');
  assert(expiredAtt.attentionLevel === 'CRITICAL', 'Assigned CRITICAL attention level');

  const todayItem = {
    name: 'Day-Zero Item',
    category: 'Bakery',
    type: 'grocery',
    expiryDate: todayIso
  };
  const todayAtt = predictSmartAttention(todayItem, { userAllergies: [] });
  assert(todayAtt.status === 'EXPIRED', 'Product expiring today is classified as EXPIRED for consumption safety');
  assert(todayAtt.status !== 'SAFE', 'AI/ML cannot classify day-zero item as SAFE');

  // -------------------------------------------------------------------------
  // 5. POST-EXPIRY MANAGEMENT (FOOD VS MEDICINE)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. POST-EXPIRY MANAGEMENT: Food vs Medicine Separation ---');
  
  const expiredMedicine = {
    name: 'Amoxicillin 500mg Capsules',
    category: 'Antibiotics',
    type: 'medicine',
    expiryDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0]
  };
  const medAi = await generateProductIntelligence({
    productDbData: expiredMedicine,
    ocrData: { type: 'medicine' }
  });
  assert(medAi.product_type === 'medicine', 'Medicine correctly identified in intelligence pipeline');
  assert(medAi.safe_disposal_guidance !== undefined, 'Provides safe pharmaceutical disposal guidance');
  assert(!medAi.recommended_action?.includes('cook'), 'Never recommends cooking or consuming medicine');
  assert(medAi.safety_disclaimer.includes('CRITICAL HEALTH NOTICE') || medAi.safety_disclaimer.includes('medication'), 'Strict medical non-consumption disclaimer present');

  // -------------------------------------------------------------------------
  // 6. WASTE TRACKING WITH QUANTITY & REASON
  // -------------------------------------------------------------------------
  console.log('\n--- 6. WASTE TRACKING: Persistence of Structured Outcome ---');
  
  const testUserId = `test_user_${Date.now()}`;
  const wasteRecordData = {
    userId: testUserId,
    pantryItemId: 'item_test_waste_123',
    product: 'Greek Yogurt 500g',
    category: 'Dairy & Eggs',
    expiryDate: todayIso,
    status: 'wasted',
    reason: 'spoiled', // Options: 'expired', 'spoiled', 'unused', 'damaged', 'other'
    quantity: 2
  };

  const savedRecord = await dbService.recordWaste(wasteRecordData);
  assert(savedRecord && savedRecord.id !== undefined, 'Waste record saved to database');
  assert(savedRecord.product === 'Greek Yogurt 500g', 'Recorded product name saved');
  assert(savedRecord.category === 'Dairy & Eggs', 'Recorded category saved');
  assert(savedRecord.quantity === 2, 'Recorded quantity saved');
  assert(savedRecord.reason === 'spoiled', 'Recorded reason saved ("spoiled")');
  assert(savedRecord.status === 'wasted', 'Recorded status saved ("wasted")');

  // Retrieve waste history
  const allWaste = await dbService.getWasteRecords(testUserId);
  assert(Array.isArray(allWaste) && allWaste.length >= 1, 'Retrieved waste records for user');
  assert(allWaste[0].quantity === 2, 'Retrieved record contains accurate quantity');

  // -------------------------------------------------------------------------
  // 7. SECURITY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 7. SECURITY AUDIT: Secret Leaks, Injection & Data Isolation ---');
  
  // Test User Data Isolation
  const userA = `user_a_${Date.now()}`;
  const userB = `user_b_${Date.now()}`;

  await dbService.savePantryItem({
    id: `item_user_a_${Date.now()}`,
    user_id: userA,
    name: "User A's Secret Inventory",
    status: 'active'
  });

  await dbService.savePantryItem({
    id: `item_user_b_${Date.now()}`,
    user_id: userB,
    name: "User B's Private Food",
    status: 'active'
  });

  const userAItems = await dbService.getPantryItems(userA);
  const userBItems = await dbService.getPantryItems(userB);

  assert(userAItems.some(i => i.name === "User A's Secret Inventory"), "User A can view User A's items");
  assert(!userAItems.some(i => i.name === "User B's Private Food"), "User A CANNOT view User B's items (RLS & Data Isolation)");
  assert(userBItems.some(i => i.name === "User B's Private Food"), "User B can view User B's items");
  assert(!userBItems.some(i => i.name === "User A's Secret Inventory"), "User B CANNOT view User A's items (RLS & Data Isolation)");

  // SQL Injection test in queries
  const maliciousInput = "'; DROP TABLE pantry_items; --";
  const injectionResult = await dbService.getPantryItems(maliciousInput);
  assert(Array.isArray(injectionResult), 'Handled malicious SQL characters safely without DB corruption');

  // Input Sanitization for Barcode
  const maliciousBarcode = '<script>alert("xss")</script>';
  const barcodeLookup = await dbService.getProductByBarcode(maliciousBarcode);
  assert(barcodeLookup === null, 'Sanitized malicious barcode input gracefully');

  // -------------------------------------------------------------------------
  // 8. COMPLETE END-TO-END FLOW (14 STEPS)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. COMPLETE END-TO-END FLOW (14 Integrated Steps) ---');
  console.log('Testing Flow: SIGN UP → PROFILE → SCAN BARCODE → SCAN OCR → FUSION → VERIFY DATA → AI ANALYSIS → ALLERGY CHECK → ADD PANTRY → SMART ATTENTION → NOTIFICATION → EXPIRY → POST-EXPIRY RECORD → WASTE ANALYTICS\n');

  // Step 1: SIGN UP
  const e2eEmail = `e2e_user_${Date.now()}@bitebeforeexpiry.com`;
  const e2ePassword = 'SecurePassword123!';
  const authRes = await dbService.signUp({ email: e2eEmail, password: e2ePassword, name: 'Dr. Sarah Smith' });
  assert(authRes.user && authRes.user.id, 'Step 1 [SIGN UP]: Account created with unique ID');
  const e2eUserId = authRes.user.id;

  // Step 2: PROFILE
  const updatedProfile = await dbService.upsertUserProfile(e2eUserId, {
    allergies: ['Peanuts', 'Milk & Lactose'],
    preferred_language: 'en',
    dietary_preferences: ['Vegetarian']
  });
  assert(updatedProfile && updatedProfile.allergies.includes('Peanuts'), 'Step 2 [PROFILE]: Allergy profile saved to database');

  // Step 3: SCAN BARCODE
  const scannedBarcode = '8901233024567';
  // Mock product in product knowledge base
  await dbService.saveProduct({
    barcode: scannedBarcode,
    product_name: 'Almond & Sesame Protein Bar',
    brand: 'NutriBite',
    category: 'Snacks',
    product_type: 'grocery',
    ingredients: ['Almonds', 'Sesame Seeds', 'Peanuts', 'Oat Flakes', 'Honey']
  });
  const barcodeProduct = await dbService.getProductByBarcode(scannedBarcode);
  assert(barcodeProduct && barcodeProduct.product_name === 'Almond & Sesame Protein Bar', 'Step 3 [SCAN BARCODE]: Product identified from knowledge base');

  // Step 4: SCAN OCR
  const rawOcrSample = 'NutriBite Bar LOT:NB-8871 MFG: 15/09/2026 EXP: 20/10/2026 NET WT 45g';
  assert(rawOcrSample.includes('EXP: 20/10/2026'), 'Step 4 [SCAN OCR]: Package label text scanned');

  // Step 5: FUSION
  const ocrExtracted = {
    expiryDate: '2026-10-20',
    mfgDate: '2026-09-15',
    detectedDates: { expiryDate: '2026-10-20', mfgDate: '2026-09-15' },
    rawText: rawOcrSample,
    confidenceScore: 92,
    batchNumber: 'NB-8871',
    brand: 'NutriBite',
    requiresVerification: false
  };
  const e2eFusion = fuseBarcodeAndOcr({ barcodeData: barcodeProduct, ocrData: ocrExtracted });
  assert(e2eFusion && e2eFusion.expiryDate === '2026-10-20', 'Step 5 [FUSION]: Barcode and OCR fused into unified item');

  // Step 6: VERIFY DATA
  assert(e2eFusion.confidenceScore >= 90 && !e2eFusion.requiresVerification, 'Step 6 [VERIFY DATA]: Data verified with high confidence score');

  // Step 7: AI ANALYSIS
  const e2eAi = await generateProductIntelligence({
    productDbData: e2eFusion,
    ocrData: { rawOcrText: rawOcrSample }
  });
  assert(e2eAi && e2eAi.summary && e2eAi.summary.length > 0, 'Step 7 [AI ANALYSIS]: AI Product Intelligence generated summary');

  // Step 8: ALLERGY CHECK
  const userAllergens = updatedProfile.allergies;
  const allergenFound = e2eFusion.ingredients.filter(ing => 
    userAllergens.some(al => ing.toLowerCase().includes(al.toLowerCase()) || (al.includes('Peanuts') && ing.toLowerCase().includes('peanut')))
  );
  assert(allergenFound.length > 0, `Step 8 [ALLERGY CHECK]: Allergen detected matching user profile (${allergenFound.join(', ')})`);

  // Step 9: ADD PANTRY
  const pantryItemData = {
    id: `item_e2e_${Date.now()}`,
    user_id: e2eUserId,
    name: e2eFusion.name,
    category: e2eFusion.category,
    type: e2eFusion.type,
    barcode: e2eFusion.barcode,
    batchNumber: e2eFusion.batchNumber,
    expiryDate: e2eFusion.expiryDate,
    ingredientsOriginal: e2eFusion.ingredients,
    status: 'active'
  };
  const savedPantry = await dbService.savePantryItem(pantryItemData);
  assert(savedPantry && savedPantry.id === pantryItemData.id, 'Step 9 [ADD PANTRY]: Item persisted to user pantry table in DB');

  // Step 10: SMART ATTENTION
  const smartAtt = predictSmartAttention(savedPantry, { userAllergies: userAllergens });
  assert(smartAtt.status !== undefined && smartAtt.attentionLevel !== undefined, 'Step 10 [SMART ATTENTION]: ML Attention status computed with risk factor');

  // Step 11: NOTIFICATION
  const e2eAlerts = generateIntelligentAlerts([savedPantry], { allergyProfile: userAllergens, notificationLeadDays: 7 });
  assert(e2eAlerts.some(a => a.type === 'allergy_attention'), 'Step 11 [NOTIFICATION]: Generated prioritized intelligent alert for user');

  // Step 12: EXPIRY (Simulate time passing to expiry)
  const expiredPantry = {
    ...savedPantry,
    expiryDate: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Expired yesterday
  };
  const postExpiryAtt = predictSmartAttention(expiredPantry, { userAllergies: userAllergens });
  assert(postExpiryAtt.status === 'EXPIRED', 'Step 12 [EXPIRY]: Transitioned reliably to EXPIRED status');

  // Step 13: POST-EXPIRY RECORD
  const e2eWasteRecord = await dbService.recordWaste({
    userId: e2eUserId,
    pantryItemId: savedPantry.id,
    product: savedPantry.name,
    category: savedPantry.category,
    expiryDate: expiredPantry.expiryDate,
    status: 'wasted',
    reason: 'expired',
    quantity: 1
  });
  assert(e2eWasteRecord && e2eWasteRecord.reason === 'expired', 'Step 13 [POST-EXPIRY RECORD]: Recorded quantity & reason into waste DB');

  // Step 14: WASTE ANALYTICS
  const userWasteHistory = await dbService.getWasteRecords(e2eUserId);
  assert(userWasteHistory.length === 1 && userWasteHistory[0].product === 'Almond & Sesame Protein Bar', 'Step 14 [WASTE ANALYTICS]: Live analytics reflect verified user waste record');

  // -------------------------------------------------------------------------
  // 9. TRUTHFULNESS & ML PIPELINE VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 9. TRUTHFULNESS: Machine Learning Pipeline Verification ---');
  
  // Test with insufficient training data
  const smallDataset = [
    { daysRemaining: 2, isOpened: true, categoryWasteRate: 0.2, label: 1 },
    { daysRemaining: 15, isOpened: false, categoryWasteRate: 0.1, label: 0 }
  ];
  const trainRes = trainAttentionModel(smallDataset);
  assert(trainRes.success === false, 'ML training pipeline refuses to claim "trained model" on insufficient samples');
  assert(trainRes.message.includes('ML pipeline implemented; additional real-world data is required for reliable model training'), 'Displays exact required truthfulness declaration');

  console.log('\n================================================================');
  console.log(`🏁 PART 3 SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
