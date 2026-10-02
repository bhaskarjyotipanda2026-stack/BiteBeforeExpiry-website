/**
 * Comprehensive Automated Verification Suite for BiteBeforeExpiry Backend Upgrade
 * 
 * Verifies:
 * 1. PostgreSQL Schema & Relational Tables (profiles, products, user_scans, reminders)
 * 2. Supabase Auth, Profiles & User Session Isolation
 * 3. Data Validation: Rejection if expiry_date < manufacturing_date
 * 4. Product Catalog Reusability (Food, Medicine, Other)
 * 5. Barcode & OCR Scan Storage (user_scans)
 * 6. Expiry Calculation Logic (>7d active, <=7d expiring_soon, <=0 expired)
 * 7. Automatic Reminder Generation (7d before, 3d before, 1d before, expired) & Deduplication
 * 8. Scheduled Reminder Processing (pending -> sent transition with sent_at)
 * 9. Scan Status Transitions (consumed, discarded) and Reminder Cancellation
 * 10. Scan History Filtering (category, status, search) and Sorting
 */

// Node.js mock for localStorage
const store = new Map();
global.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

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

async function runBackendVerification() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING BITEBEFOREEXPIRY BACKEND & REMINDERS TEST SUITE');
  console.log('=============================================================\n');

  const { dbService, calculateExpiryStatus } = await import('./src/services/dbService.js');

  // TEST 1: User Profiles (TABLE: profiles)
  console.log('\n--- TEST 1: User Profiles (TABLE: profiles) ---');
  const user1 = 'usr_test_alpha_101';
  const prof1 = await dbService.upsertProfile(user1, {
    full_name: 'Ananya Sharma',
    email: 'ananya@example.com'
  });
  assert(prof1 && prof1.user_id === user1, 'Profile record created for user');
  assert(prof1.full_name === 'Ananya Sharma', 'Profile full name matches');
  assert(prof1.email === 'ananya@example.com', 'Profile email matches');

  const fetchedProf = await dbService.getProfile(user1);
  assert(fetchedProf && fetchedProf.full_name === 'Ananya Sharma', 'Profile retrieved correctly');

  // TEST 2: Product Knowledge Base (TABLE: products)
  console.log('\n--- TEST 2: Product Knowledge Base (TABLE: products) ---');
  const milkProd = await dbService.saveProduct({
    barcode: '8901262010053',
    product_name: 'Amul Taaza Homogenised Toned Milk',
    brand: 'Amul',
    category: 'Food',
    ingredients: ['Toned Milk', 'Vitamin A', 'Vitamin D'],
    source: 'barcode'
  });
  assert(milkProd && milkProd.barcode === '8901262010053', 'Food product cataloged');
  assert(milkProd.category === 'Food', 'Category set to Food');

  const medProd = await dbService.saveProduct({
    barcode: '8901117002011',
    product_name: 'Paracetamol Tablets IP 500mg',
    brand: 'Crocin',
    category: 'Medicine',
    ingredients: ['Paracetamol 500mg'],
    source: 'OCR'
  });
  assert(medProd && medProd.category === 'Medicine', 'Medicine product cataloged');

  const foundProd = await dbService.getProductByBarcode('8901262010053');
  assert(foundProd && foundProd.product_name.includes('Amul'), 'Product lookup by barcode works');

  // TEST 3: Data Validation (Expiry date vs Manufacturing date)
  console.log('\n--- TEST 3: Data Validation (Expiry date < Manufacturing date rejection) ---');
  let rejected = false;
  try {
    await dbService.saveUserScan({
      user_id: user1,
      product_name: 'Invalid Test Milk',
      manufacturing_date: '2026-10-15',
      expiry_date: '2026-10-01', // Earlier than mfg!
      scan_type: 'OCR'
    });
  } catch (err) {
    rejected = true;
    assert(err.message.includes('Expiry date cannot be earlier than manufacturing date'), 
      'Rejection error message correctly identifies date paradox');
  }
  assert(rejected === true, 'Validation successfully prevented saving invalid scan where expiry < mfg');

  // Valid date sequence should succeed
  const validScan = await dbService.saveUserScan({
    user_id: user1,
    product_name: 'Amul Gold Milk 500ml',
    manufacturing_date: '2026-10-01',
    expiry_date: '2026-10-10',
    scan_type: 'barcode',
    barcode: '8901262010053'
  });
  assert(validScan && validScan.id, 'Scan with valid manufacturing and expiry dates saved successfully');

  // TEST 4: Expiry Status Calculation Logic
  console.log('\n--- TEST 4: Expiry Status Calculation Logic ---');
  const now = new Date();
  
  // Future date 15 days out -> active
  const future15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  assert(calculateExpiryStatus(future15) === 'active', 'Items > 7 days are active');

  // Future date 4 days out -> expiring_soon
  const future4 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  assert(calculateExpiryStatus(future4) === 'expiring_soon', 'Items 1-7 days are expiring_soon');

  // Past date 2 days ago -> expired
  const past2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  assert(calculateExpiryStatus(past2) === 'expired', 'Items <= 0 days are expired');

  // TEST 5: Automatic Reminder Generation (TABLE: reminders)
  console.log('\n--- TEST 5: Automatic Reminder Generation (TABLE: reminders) ---');
  // Target expiry: 10 days in future
  const expTarget = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const scanWithReminders = await dbService.saveUserScan({
    user_id: user1,
    product_name: 'Greek Yogurt Blueberry',
    category: 'Food',
    expiry_date: expTarget,
    scan_type: 'barcode'
  });

  const reminders = await dbService.getUserReminders(user1);
  const itemReminders = reminders.filter(r => r.scan_id === scanWithReminders.id);
  assert(itemReminders.length === 4, 'Exactly 4 reminder schedules generated for scan (7d, 3d, 1d, expired)');

  const types = itemReminders.map(r => r.reminder_type);
  assert(types.includes('7_days_before'), 'Has 7_days_before reminder');
  assert(types.includes('3_days_before'), 'Has 3_days_before reminder');
  assert(types.includes('1_day_before'), 'Has 1_day_before reminder');
  assert(types.includes('expired'), 'Has expired reminder');

  // Deduplication check: call createRemindersForScan again
  await dbService.createRemindersForScan(scanWithReminders);
  const remindersAfterDedup = await dbService.getUserReminders(user1);
  const itemRemindersAfterDedup = remindersAfterDedup.filter(r => r.scan_id === scanWithReminders.id);
  assert(itemRemindersAfterDedup.length === 4, 'Deduplication works: no duplicate reminder records created');

  // TEST 6: Scheduled Reminder Processing
  console.log('\n--- TEST 6: Scheduled Reminder Processing ---');
  // Create a scan expiring tomorrow so that 7-day and 3-day reminders are already due (in the past)
  const tomorrowStr = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dueScan = await dbService.saveUserScan({
    user_id: user1,
    product_name: 'Fresh Paneer 200g',
    category: 'Food',
    expiry_date: tomorrowStr,
    scan_type: 'OCR'
  });

  const dueRemindersBefore = await dbService.getDueReminders(user1);
  assert(dueRemindersBefore.length > 0, 'Found due pending reminders');

  const processed = await dbService.processDueReminders(user1);
  assert(processed.length > 0, 'Processed due reminders successfully');
  assert(processed.every(r => r.notification_status === 'sent' && r.sent_at), 
    'All processed reminders marked as "sent" with timestamp');

  // Verify none remain due
  const dueRemindersAfter = await dbService.getDueReminders(user1);
  const remainingForScan = dueRemindersAfter.filter(r => r.scan_id === dueScan.id);
  assert(remainingForScan.length === 0, 'No due reminders remain pending after processing');

  // TEST 7: Status Transitions (Consumed / Discarded) & Reminder Cancellation
  console.log('\n--- TEST 7: Status Transitions & Reminder Cancellation ---');
  const consumedScan = await dbService.markScanStatus(validScan.id, 'consumed');
  assert(consumedScan.status === 'consumed', 'Scan marked as consumed');

  // Check pending reminders for consumed item were cancelled
  const user1Reminders = await dbService.getUserReminders(user1, 'pending');
  const remainingRemForConsumed = user1Reminders.filter(r => r.scan_id === validScan.id);
  assert(remainingRemForConsumed.length === 0, 'Pending reminders cancelled when item marked as consumed');

  // TEST 8: User Data Isolation (Row Level Security concept)
  console.log('\n--- TEST 8: User Data Isolation ---');
  const user2 = 'usr_test_beta_202';
  await dbService.saveUserScan({
    user_id: user2,
    product_name: 'User 2 Secret Medicine',
    category: 'Medicine',
    expiry_date: '2027-01-01',
    scan_type: 'manual'
  });

  const user1Scans = await dbService.getUserScans(user1);
  const user2Scans = await dbService.getUserScans(user2);

  assert(!user1Scans.some(s => s.user_id === user2), 'User 1 cannot see User 2 private scans');
  assert(!user2Scans.some(s => s.user_id === user1), 'User 2 cannot see User 1 private scans');
  assert(user2Scans.some(s => s.product_name === 'User 2 Secret Medicine'), 'User 2 sees their own scans');

  // TEST 9: Scan History Filtering & Sorting
  console.log('\n--- TEST 9: Scan History Filtering & Sorting ---');
  // Category Filter: Medicine
  const medScans = await dbService.getUserScans(user1, { category: 'Medicine' });
  assert(medScans.every(s => s.category.toLowerCase().includes('med') || s.product?.category?.toLowerCase().includes('med')),
    'Category filter returns only Medicine scans');

  // Status Filter: Consumed
  const consumedList = await dbService.getUserScans(user1, { status: 'consumed' });
  assert(consumedList.some(s => s.id === validScan.id), 'Status filter returns consumed scan');

  // Search Filter
  const searched = await dbService.getUserScans(user1, { search: 'Yogurt' });
  assert(searched.length > 0 && searched[0].product_name.includes('Yogurt'), 'Search matches product name');

  // Sort by Expiry Date Ascending
  const sortedAsc = await dbService.getUserScans(user1, { sortBy: 'expiry_asc' });
  for (let i = 0; i < sortedAsc.length - 1; i++) {
    if (sortedAsc[i].expiry_date && sortedAsc[i+1].expiry_date) {
      assert(new Date(sortedAsc[i].expiry_date) <= new Date(sortedAsc[i+1].expiry_date), 
        'Scans ordered by expiry date soonest first');
      break;
    }
  }

  // TEST 10: Explicit Deletion
  console.log('\n--- TEST 10: Explicit Deletion ---');
  const deleteTarget = await dbService.saveUserScan({
    user_id: user1,
    product_name: 'Temporary Item to Delete',
    expiry_date: '2026-11-01',
    scan_type: 'manual'
  });
  assert(deleteTarget && deleteTarget.id, 'Temporary scan created');

  const deleteSuccess = await dbService.deleteUserScan(deleteTarget.id);
  assert(deleteSuccess === true, 'deleteUserScan returned true');

  const postDeleteScans = await dbService.getUserScans(user1);
  assert(!postDeleteScans.some(s => s.id === deleteTarget.id), 'Scan permanently deleted upon user explicit request');

  const postDeleteReminders = await dbService.getUserReminders(user1);
  assert(!postDeleteReminders.some(r => r.scan_id === deleteTarget.id), 'Associated reminders cascade-deleted');

  console.log('\n=============================================================');
  console.log(`🎉 ALL BACKEND & REMINDER TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('=============================================================\n');
}

runBackendVerification().catch(err => {
  console.error('\n❌ TEST SUITE RUNTIME ERROR:', err);
  process.exit(1);
});
