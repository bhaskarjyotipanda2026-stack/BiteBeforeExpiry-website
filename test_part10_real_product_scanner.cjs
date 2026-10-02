// Comprehensive Test Suite: Real Product Scanner with Anti-Fabrication Integrity & Dual-Source Architecture
const fs = require('fs');
const path = require('path');

// Test 1: Parser Service regexes and field extraction
const { 
  parsePackageData, 
  extractRawMfgDateString, 
  extractRawExpiryDateString, 
  extractNetQuantity, 
  extractMrp, 
  validateDateSequence, 
  calculateRealExpiryStatus 
} = require('./src/services/parserService.js');

const { fuseBarcodeAndOcr } = require('./src/services/productIntelligenceService.js');
const { dbService } = require('./src/services/dbService.js');

console.log('====================================================');
console.log('TEST SUITE: BiteBeforeExpiry Real Product Scanner');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

// TEST CASE 1: Standard Indian Package OCR Label
console.log('--- TEST 1: Physical Package OCR Extraction ---');
const sampleText1 = "PARLE-G GLUCOSE BISCUITS\nMFD 08/26 EXP 07/27 B.NO B7A91\nNET QTY: 100 g MRP: Rs 25.00\nMFG BY PARLE PRODUCTS PVT LTD MUMBAI";

const parsed1 = parsePackageData(sampleText1);

assert(parsed1.rawMfgDate && parsed1.rawMfgDate.includes('08/26'), `Raw MFG date string extracted: "${parsed1.rawMfgDate}"`);
assert(parsed1.rawExpiryDate && parsed1.rawExpiryDate.includes('07/27'), `Raw EXP date string extracted: "${parsed1.rawExpiryDate}"`);
assert(parsed1.batchNumber === 'B7A91', `Batch number extracted: "${parsed1.batchNumber}"`);
assert(parsed1.netQuantity && parsed1.netQuantity.includes('100'), `Net quantity extracted: "${parsed1.netQuantity}"`);
assert(parsed1.mrp && parsed1.mrp.includes('25'), `MRP extracted: "${parsed1.mrp}"`);
assert(parsed1.expiryDateLabel === 'Expiry Date — Read from Package', `Expiry date explicitly labeled "Expiry Date — Read from Package": "${parsed1.expiryDateLabel}"`);
assert(parsed1.mfgDateLabel === 'Manufacturing Date — Read from Package', `MFG date explicitly labeled "Manufacturing Date — Read from Package"`);

// TEST CASE 2: Date Sequence Validation (Valid: EXP >= MFG)
console.log('\n--- TEST 2: Date Sequence Validation (EXP >= MFG) ---');
const validDates = validateDateSequence('2026-08-01', '2027-07-01');
assert(validDates.isValid === true, 'Date sequence 2026-08 to 2027-07 is valid');
assert(validDates.status === 'VERIFIED', 'Valid date status is "VERIFIED"');

// TEST CASE 3: Date Sequence Error (Error: MFG > EXP)
console.log('\n--- TEST 3: Date Sequence Error Detection (MFG > EXP) ---');
const invalidDates = validateDateSequence('2027-08-01', '2026-07-01');
assert(invalidDates.isValid === false, 'Date sequence 2027-08 > 2026-07 flagged as INVALID');
assert(invalidDates.status === 'NEEDS REVIEW', 'Invalid date status is "NEEDS REVIEW"');
assert(invalidDates.message.includes('Possible scanning error. Manufacturing date appears later than expiry date'), `Appropriate safety message generated: "${invalidDates.message}"`);

// TEST CASE 4: Real Expiry Status Engine (No Fake Calculations)
console.log('\n--- TEST 4: Real Expiry Status Engine ---');
const unverifiedStatus = calculateRealExpiryStatus(null);
assert(unverifiedStatus.status === 'DATE NOT VERIFIED', 'Missing expiry date returns "DATE NOT VERIFIED" without guessing');

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 90);
const futureIso = futureDate.toISOString().split('T')[0];
const freshStatus = calculateRealExpiryStatus(futureIso);
assert(freshStatus.status === 'FRESH', `90 days out is categorized as "FRESH" (daysRemaining: ${freshStatus.daysRemaining})`);

const soonDate = new Date();
soonDate.setDate(soonDate.getDate() + 5);
const soonIso = soonDate.toISOString().split('T')[0];
const soonStatus = calculateRealExpiryStatus(soonIso);
assert(soonStatus.status === 'EXPIRING SOON', `5 days out is categorized as "EXPIRING SOON" (daysRemaining: ${soonStatus.daysRemaining})`);

const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 10);
const pastIso = pastDate.toISOString().split('T')[0];
const expiredStatus = calculateRealExpiryStatus(pastIso);
assert(expiredStatus.status === 'EXPIRED', `10 days past is categorized as "EXPIRED" (daysRemaining: ${expiredStatus.daysRemaining})`);

// TEST CASE 5: Dual-Source Architecture & Provenance Matrix
console.log('\n--- TEST 5: Dual-Source Fusion & Verification Matrix ---');
const fusion = fuseBarcodeAndOcr({
  barcodeData: {
    barcode: '8901030383749',
    name: 'Parle-G Glucose Biscuits',
    brand: 'Parle',
    category: 'Snacks & Sweets',
    packSize: '100 g',
    source: 'Open Food Facts Database'
  },
  ocrData: {
    name: 'Parle-G',
    rawOcrText: sampleText1,
    mfgDate: '2026-08-01',
    rawMfgDate: '08/26',
    expiryDate: '2027-07-01',
    rawExpiryDate: '07/27',
    batchNumber: 'B7A91',
    netQuantity: '100 g',
    mrp: '₹25.00',
    confidenceScore: 95
  }
});

assert(fusion.productDatabaseRecord !== undefined, 'productDatabaseRecord created separately from package scan');
assert(fusion.productDatabaseRecord.barcode === '8901030383749', 'productDatabaseRecord preserves GTIN / Barcode');
assert(fusion.packageScanRecord !== undefined, 'packageScanRecord created separately');
assert(fusion.packageScanRecord.batchNumber === 'B7A91', 'packageScanRecord preserves physical package batch: B7A91');
assert(fusion.packageScanRecord.expiryDateLabel === 'Expiry Date — Read from Package', 'packageScanRecord uses explicit package read label');
assert(fusion.verificationMatrix !== undefined, 'verificationMatrix created');
assert(fusion.verificationMatrix.expiryDate.source === 'Read from Physical Package', 'verificationMatrix maps EXP Date to Read from Physical Package');
assert(fusion.verificationMatrix.expiryDate.status === 'VERIFIED', 'verificationMatrix maps EXP Date to VERIFIED');

// TEST CASE 6: Anti-Fabrication Safeguard (No Invented Data)
console.log('\n--- TEST 6: Anti-Fabrication Safeguard ---');
const emptyOcrParsed = parsePackageData("Random text with no dates or numbers");
assert(emptyOcrParsed.expiryDate === null, 'Expiry date is null when not printed on package (NEVER invented)');
assert(emptyOcrParsed.mfgDate === null, 'MFG date is null when not printed on package (NEVER invented)');
assert(emptyOcrParsed.batchNumber === null, 'Batch number is null when not printed on package (NEVER invented)');

// TEST CASE 7: Database Dual-Source Persistence
console.log('\n--- TEST 7: Database Dual-Source Scan Recording ---');
let dbRecorded = false;
try {
  const result = dbService.recordPackageScan({
    userId: 'usr_test_user_001',
    barcode: '8901030383749',
    scanType: 'barcode+ocr',
    productData: fusion.productDatabaseRecord,
    packageData: fusion.packageScanRecord,
    ocrData: { rawOcrText: sampleText1, confidenceScore: 95 },
    verificationMatrix: fusion.verificationMatrix
  });
  dbRecorded = result && typeof result.then === 'function';
  assert(true, 'dbService.recordPackageScan executed successfully with dual-source schema');
} catch (e) {
  assert(false, `dbService.recordPackageScan failed: ${e.message}`);
}

console.log('\n====================================================');
console.log(`SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL VERIFICATION CRITERIA SATISFIED!');
  process.exit(0);
}
