/**
 * Comprehensive Automated Test Suite for DEVELOPMENT PART 1: DATA FOUNDATION
 * 
 * Verifies all 14 required points:
 * 1. Account creation
 * 2. Login
 * 3. Profile
 * 4. Allergy saving
 * 5. Barcode scanning / Knowledge Base
 * 6. OCR scanning / Text cleaning
 * 7. Barcode + OCR Fusion Engine
 * 8. Different date formats (ISO, DD/MM/YYYY, Text Month, MM/YYYY)
 * 9. Low OCR confidence handling
 * 10. Manual correction recording
 * 11. Pantry persistence
 * 12. Duplicate handling (Same barcode + different expiry = separate package)
 * 13. Database security & user isolation
 * 14. Logout/login data persistence
 */

import { dbService } from './src/services/dbService.js';
import { parsePackageData, cleanOcrText, normalizeDate, extractAllDates } from './src/services/parserService.js';
import { fuseBarcodeAndOcr } from './src/services/productIntelligenceService.js';
import { COMMON_ALLERGENS } from './src/constants/index.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }
}

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

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('  STARTING TEST SUITE: DEVELOPMENT PART 1 (DATA FOUNDATION)  ');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Account Creation
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Account Creation ---');
  const testUserEmail = `sarah.test.${Date.now()}@example.com`;
  const signUpRes = await dbService.signUp({
    email: testUserEmail,
    password: 'SecurePassword123!',
    name: 'Sarah Connor'
  });
  assert(signUpRes.user && signUpRes.user.id, 'User account created with valid ID');
  assert(signUpRes.user.email === testUserEmail, 'User email matches input');
  assert(signUpRes.user.name === 'Sarah Connor', 'User display name stored');

  const userAId = signUpRes.user.id;

  // --------------------------------------------------------------------------
  // TEST 2: Login
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Login ---');
  const loginRes = await dbService.login({
    email: testUserEmail,
    password: 'SecurePassword123!'
  });
  assert(loginRes.user && loginRes.user.id === userAId, 'Login successfully retrieves active user session');

  // --------------------------------------------------------------------------
  // TEST 3: User Profile
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: User Profile ---');
  let profile = await dbService.getUserProfile(userAId);
  assert(profile && profile.user_id === userAId, 'Retrieved user profile linked to user_id');
  
  const updatedProfile = await dbService.upsertUserProfile(userAId, {
    dietary_preferences: ['Vegan', 'Gluten-Free'],
    preferred_language: 'es',
    allergies: ['Peanuts', 'Tree Nuts']
  });
  assert(updatedProfile.preferred_language === 'es', 'Preferred language updated in profile');
  assert(updatedProfile.dietary_preferences.includes('Vegan'), 'Dietary preferences updated');

  // --------------------------------------------------------------------------
  // TEST 4: Allergy Saving (9 Categories)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Allergy Preferences Saving (9 Categories) ---');
  assert(COMMON_ALLERGENS.length === 9, 'All 9 official allergy categories exist in constants');
  
  const allAllergiesSaved = await dbService.upsertUserProfile(userAId, {
    allergies: COMMON_ALLERGENS
  });
  assert(allAllergiesSaved.allergies.length === 9, 'Successfully saved all 9 allergy categories to profile');
  assert(allAllergiesSaved.allergies.includes('Milk & Lactose'), 'Milk & Lactose allergy stored');
  assert(allAllergiesSaved.allergies.includes('Mustard'), 'Mustard allergy stored');
  assert(allAllergiesSaved.allergies.includes('Sesame Seeds'), 'Sesame Seeds allergy stored');

  // --------------------------------------------------------------------------
  // TEST 5: Barcode Scanning / Product Knowledge Layer
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Product Knowledge Base (Generic vs Package) ---');
  const sampleProduct = {
    barcode: '8901262010019',
    product_name: 'Amul Taaza Milk 1L',
    brand: 'Amul',
    category: 'Dairy & Milk Products',
    product_type: 'grocery',
    ingredients: ['Standardised Milk', 'Vitamin A'],
    nutrition: { energy: '58 kcal', protein: '3.1g' },
    source: 'barcode'
  };
  const savedProd = await dbService.saveProduct(sampleProduct);
  assert(savedProd.barcode === '8901262010019', 'Product knowledge stored in products table');
  
  const fetchedProd = await dbService.getProductByBarcode('8901262010019');
  assert(fetchedProd && fetchedProd.product_name === 'Amul Taaza Milk 1L', 'Product retrieved by barcode');

  // --------------------------------------------------------------------------
  // TEST 6: Advanced OCR & Text Cleaning
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Advanced OCR Pipeline & Text Cleaning ---');
  const rawNoisyOcr = 'MFG:  10/o9/2026 \n EXPIRY   DATE: 20/09/2026 \n BATCH:   AM-9021 \n INGREDIENTS: MILK, VITAMIN D \n KEEP IN COOL DRY PLACE';
  const cleanedText = cleanOcrText(rawNoisyOcr);
  assert(cleanedText.includes('10-09-2026'), 'Cleaned OCR typo "10/o9/2026" to "10-09-2026"');
  
  const parsedOcr = parsePackageData(cleanedText, '');
  assert(parsedOcr.expiryDate === '2026-09-20', 'Extracted normalized ISO expiry date: 2026-09-20');
  assert(parsedOcr.mfgDate === '2026-09-10', 'Extracted manufacturing date: 2026-09-10');
  assert(parsedOcr.batchNumber === 'AM-9021', 'Extracted batch number: AM-9021');
  assert(parsedOcr.fieldConfidences.expiry >= 90, `Expiry confidence score high: ${parsedOcr.fieldConfidences.expiry}%`);
  assert(parsedOcr.storageInfo && parsedOcr.storageInfo.toLowerCase().includes('cool'), 'Extracted storage information');

  // --------------------------------------------------------------------------
  // TEST 7: Barcode + OCR Fusion Engine
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Barcode + OCR Fusion Engine ---');
  const fusionResult = fuseBarcodeAndOcr({
    barcodeData: fetchedProd,
    ocrData: parsedOcr
  });
  assert(fusionResult.name === 'Amul Taaza Milk 1L', 'Fusion engine kept verified product name');
  assert(fusionResult.brand === 'Amul', 'Fusion engine resolved brand');
  assert(fusionResult.expiryDate === '2026-09-20', 'Fusion engine applied package-specific printed expiry date');
  assert(fusionResult.batchNumber === 'AM-9021', 'Fusion engine applied package-specific batch');
  assert(fusionResult.provenance.expiryDate === 'ocr', 'Tracked provenance: expiryDate is from OCR');
  assert(fusionResult.provenance.name === 'barcode' || fusionResult.provenance.name === 'barcode+ocr', 'Tracked provenance: name is resolved from barcode');
  assert(!fusionResult.conflictDetected, 'No conflict on agreeing package');


  // Conflict Detection Test
  const conflictOcr = {
    ...parsedOcr,
    brand: 'Mother Dairy', // Conflict with Barcode brand 'Amul'
    expiryDate: '2026-11-15'
  };
  const conflictFusion = fuseBarcodeAndOcr({
    barcodeData: { ...fetchedProd, expiryDate: '2026-09-20' },
    ocrData: conflictOcr
  });
  assert(conflictFusion.conflictDetected === true, 'Conflict successfully detected when barcode & OCR disagree');
  assert(conflictFusion.conflictMessage === 'Information conflict detected. Please verify.', 'Flagged exact message: "Information conflict detected. Please verify."');

  // --------------------------------------------------------------------------
  // TEST 8: Different Date Formats
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Different Date Formats ---');
  assert(normalizeDate('2026-12-31') === '2026-12-31', 'ISO YYYY-MM-DD normalized');
  assert(normalizeDate('31/12/2026') === '2026-12-31', 'DD/MM/YYYY normalized');
  assert(normalizeDate('15-OCT-2026') === '2026-10-15', 'DD-MMM-YYYY normalized');
  assert(normalizeDate('OCT 2026') === '2026-10-28', 'MMM YYYY text month normalized');
  assert(normalizeDate('11/2026') === '2026-11-30', 'MM/YYYY normalized to end of month');
  assert(normalizeDate('invalid date string') === null, 'Invalid dates safely rejected');

  // --------------------------------------------------------------------------
  // TEST 9: Low OCR Confidence Handling
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Low OCR Confidence Handling ---');
  const blurryPackageText = 'PRODUCT UNKNOWN \n SOME BLURRY TEXT \n NO DATES FOUND';
  const blurryParsed = parsePackageData(blurryPackageText);
  assert(blurryParsed.hasExpiryFound === false, 'Detected missing expiry date');
  assert(blurryParsed.requiresVerification === true, 'Flagged requiresVerification = true');
  assert(blurryParsed.fieldConfidenceAlerts.expiry && blurryParsed.fieldConfidenceAlerts.expiry.includes('Please verify'), 'Provides "Detected by OCR — Please verify" prompt');

  // --------------------------------------------------------------------------
  // TEST 10: Manual Correction Recording
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Manual Correction Logging ---');
  const correction = await dbService.recordCorrection({
    userId: userAId,
    fieldName: 'expiry_date',
    originalValue: '2026-09-15',
    correctedValue: '2026-09-20'
  });
  assert(correction && correction.id, 'User correction logged to user_corrections table');
  
  const userCorrections = await dbService.getCorrections(userAId);
  assert(userCorrections.length >= 1, 'Corrections retrievable for user');
  assert(userCorrections[0].field_name === 'expiry_date', 'Field name logged correctly');
  assert(userCorrections[0].corrected_value === '2026-09-20', 'Corrected value logged correctly');

  // --------------------------------------------------------------------------
  // TEST 11: Persistent Pantry
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: Persistent Pantry Storage ---');
  const pantryItem1 = await dbService.savePantryItem({
    user_id: userAId,
    name: 'Amul Taaza Milk 1L',
    barcode: '8901262010019',
    expiry_date: '2026-09-20',
    batchNumber: 'AM-9021',
    quantity: 1,
    storage_location: 'Fridge',
    attention_status: 'SAFE'
  });
  assert(pantryItem1 && pantryItem1.id, 'Saved item into pantry_items table');

  const userItems = await dbService.getPantryItems(userAId);
  assert(userItems.some(i => i.id === pantryItem1.id), 'Pantry item retrieved from DB');

  // Update item in pantry
  const updatedPantryItem = await dbService.updatePantryItem(pantryItem1.id, {
    quantity: 2,
    storage_location: 'Main Fridge Door'
  });
  assert(updatedPantryItem.quantity === 2, 'Updated pantry item quantity');
  assert(updatedPantryItem.storage_location === 'Main Fridge Door', 'Updated pantry storage location');

  // --------------------------------------------------------------------------
  // TEST 12: Duplicate Handling (Different Expiry = Separate Package)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: Duplicate Handling (Different Expiry / Batch Rule) ---');
  // Package 2: Same barcode ('8901262010019'), BUT different expiry date ('2026-10-15') and different batch ('AM-9944')
  const pantryItem2 = await dbService.savePantryItem({
    user_id: userAId,
    name: 'Amul Taaza Milk 1L',
    barcode: '8901262010019',
    expiry_date: '2026-10-15', // Different expiry!
    batchNumber: 'AM-9944',     // Different batch!
    quantity: 1
  });
  
  const allUserPantryItems = await dbService.getPantryItems(userAId);
  const amulPackages = allUserPantryItems.filter(i => i.barcode === '8901262010019');
  assert(amulPackages.length === 2, 'Physical packages with same barcode but different expiry dates stored as independent records (NOT merged)');
  assert(amulPackages[0].expiry_date !== amulPackages[1].expiry_date, 'Distinct package expiry dates preserved');

  // --------------------------------------------------------------------------
  // TEST 13: Database Security & User Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: Database Security & Isolation ---');
  // Create User B
  const userBEmail = `bob.test.${Date.now()}@example.com`;
  const userBRes = await dbService.signUp({ email: userBEmail, password: 'BobPassword456!', name: 'Bob Smith' });
  const userBId = userBRes.user.id;

  // Add item to User B's pantry
  await dbService.savePantryItem({
    user_id: userBId,
    name: "Bob's Organic Quinoa",
    expiry_date: '2027-01-01',
    quantity: 1
  });

  // Verify User A cannot access User B's items
  const userAItemsCheck = await dbService.getPantryItems(userAId);
  const userBItemsCheck = await dbService.getPantryItems(userBId);
  
  assert(!userAItemsCheck.some(i => i.name === "Bob's Organic Quinoa"), "User A cannot view User B's pantry items");
  assert(userBItemsCheck.some(i => i.name === "Bob's Organic Quinoa"), "User B can view their own pantry items");

  // --------------------------------------------------------------------------
  // TEST 14: Logout / Login Persistence
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14: Logout / Login Session & Data Persistence ---');
  await dbService.logout();
  const sessionAfterLogout = await dbService.getCurrentSession();
  
  // Login back as User A
  const reLoginRes = await dbService.login({
    email: testUserEmail,
    password: 'SecurePassword123!'
  });
  assert(reLoginRes.user.id === userAId, 'Logged back into User A account');

  const reloadedItems = await dbService.getPantryItems(userAId);
  assert(reloadedItems.length === 2, 'All of User A pantry items survived logout and login');
  assert(reloadedItems.some(i => i.batchNumber === 'AM-9021'), 'Package A1 survived');
  assert(reloadedItems.some(i => i.batchNumber === 'AM-9944'), 'Package A2 survived');

  // Waste records test
  const wasteRec = await dbService.recordWaste({
    userId: userAId,
    pantryItemId: pantryItem1.id,
    status: 'used',
    reason: 'Consumed before expiry',
    quantity: 1
  });
  assert(wasteRec && wasteRec.id, 'Waste record created in waste_records table');
  const wastes = await dbService.getWasteRecords(userAId);
  assert(wastes.length >= 1, 'Waste records persisted and retrieved');

  console.log('\n=============================================================');
  console.log(`  ALL ${passedTests} / ${totalTests} TESTS PASSED CLEANLY!  `);
  console.log('=============================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
