/**
 * BiteBeforeExpiry — Part 7 Comprehensive Verification Suite
 * 
 * Tests:
 * 1. Government / Public Safety Data Integration (Official sources, metadata fields, FSSAI/FDA/USDA/WHO)
 * 2. Offline / Low-Internet Mode & Resilient Sync Queue (Queueing, Idempotence, Network Toggle)
 * 3. Regional Language + Voice Assistant (English, Hindi, Odia, Bengali, Intent Detection, Data Privacy)
 */

import { 
  getGovernmentBulletins, 
  OFFICIAL_GOVERNMENT_DATABASE, 
  GOV_DATA_TYPES, 
  GOV_VERIFICATION_STATUS 
} from './src/services/governmentDataService.js';

import { 
  isDeviceOnline, 
  setSimulatedNetworkStatus, 
  getOfflineQueue, 
  enqueueOfflineMutation, 
  processOfflineQueue, 
  SYNC_OPERATIONS 
} from './src/services/offlineSyncService.js';

import { 
  SUPPORTED_LANGUAGES, 
  QUERY_INTENTS, 
  detectQueryIntent, 
  processRegionalAssistantQuery 
} from './src/services/regionalVoiceService.js';

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

console.log('\n===============================================================');
console.log('🧪 BITEBEFOREEXPIRY — PART 7 GOV DATA, OFFLINE & VOICE SUITE');
console.log('===============================================================\n');

// ----------------------------------------------------------------------------
// 1. GOVERNMENT / PUBLIC SAFETY DATA INTEGRATION
// ----------------------------------------------------------------------------
console.log('--- 1. Government & Public Safety Data Tests ---');

assert(OFFICIAL_GOVERNMENT_DATABASE.length >= 5, 'Contains verified government records');

// Verify mandatory metadata fields on every record:
// Source name, Source URL, Retrieved date, Data type, Verification status
const allHaveRequiredFields = OFFICIAL_GOVERNMENT_DATABASE.every(item => 
  item.source_name &&
  item.source_url && item.source_url.startsWith('https://') &&
  item.retrieved_date &&
  item.data_type &&
  item.verification_status &&
  item.official_citation
);
assert(allHaveRequiredFields === true, 'All government records strictly store source_name, source_url, retrieved_date, data_type, verification_status, and official_citation');

// Check representation of authentic statutory bodies
const sources = OFFICIAL_GOVERNMENT_DATABASE.map(i => i.source_name);
assert(sources.some(s => s.includes('FSSAI')), 'Includes FSSAI (Food Safety and Standards Authority of India)');
assert(sources.some(s => s.includes('FDA')), 'Includes U.S. Food and Drug Administration (FDA)');
assert(sources.some(s => s.includes('USDA')), 'Includes USDA Food Safety and Inspection Service');
assert(sources.some(s => s.includes('WHO')), 'Includes World Health Organization (WHO)');

// Query and Filter Functionality
const fssaiBulletins = getGovernmentBulletins('ALL', 'FSSAI');
assert(fssaiBulletins.length >= 2, 'Filtered FSSAI bulletins successfully');
assert(fssaiBulletins[0].jurisdiction.includes('India'), 'FSSAI jurisdiction verified as India');

const regulationsOnly = getGovernmentBulletins(GOV_DATA_TYPES.REGULATION);
assert(regulationsOnly.length >= 2, 'Filtered statutory regulations successfully');
assert(regulationsOnly.every(r => r.data_type === GOV_DATA_TYPES.REGULATION), 'All returned items are of regulation type');

// ----------------------------------------------------------------------------
// 2. OFFLINE / LOW-INTERNET MODE & RESILIENT SYNC QUEUE
// ----------------------------------------------------------------------------
console.log('\n--- 2. Offline Mode & Resilient Sync Queue Tests ---');

// Network State Simulation
setSimulatedNetworkStatus(false);
assert(isDeviceOnline() === false, 'Successfully simulated offline / low-internet status');

// Enqueue Mutations in Offline Mode
const mutation1 = enqueueOfflineMutation({
  table: 'household_inventory',
  operation: SYNC_OPERATIONS.INSERT,
  recordId: 'offline_scan_001',
  payload: { id: 'offline_scan_001', product_name: 'Offline Bread', expiry_date: '2026-10-10' }
});
assert(mutation1.queue_id && mutation1.recordId === 'offline_scan_001', 'Offline mutation enqueued with unique queue_id');

const mutation2 = enqueueOfflineMutation({
  table: 'household_inventory',
  operation: SYNC_OPERATIONS.INSERT,
  recordId: 'offline_scan_002',
  payload: { id: 'offline_scan_002', product_name: 'Offline Eggs', expiry_date: '2026-10-08' }
});

const currentQueue = getOfflineQueue();
assert(currentQueue.length >= 2, 'Offline queue persists pending mutations in local storage');

// Offline Sync Attempt (Must not fail catastrophically; retains queue safely)
const offlineSyncAttempt = await processOfflineQueue(null);
assert(offlineSyncAttempt.success === false, 'Sync safely rejected while device is offline');
assert(offlineSyncAttempt.remainingQueue >= 2, 'Pending queue preserved safely without data loss');

// Network Reconnect & Successful Sync
setSimulatedNetworkStatus(true);
assert(isDeviceOnline() === true, 'Device status restored to online');

// Simulated backend client with upsert tracker
const mockUpsertCalls = [];
const mockSupabaseClient = {
  from: (table) => ({
    upsert: async (rows) => {
      mockUpsertCalls.push({ table, rows });
      return { error: null };
    }
  })
};

const onlineSyncReport = await processOfflineQueue(mockSupabaseClient);
assert(onlineSyncReport.success === true, 'Synchronization succeeded upon network restoration');
assert(onlineSyncReport.syncedCount >= 2, 'Synced all pending mutations');
assert(onlineSyncReport.remainingQueue === 0, 'Queue cleanly emptied after successful sync');
assert(mockUpsertCalls.length >= 2, 'All queued records pushed via idempotent upsert');

// ----------------------------------------------------------------------------
// 3. REGIONAL LANGUAGE + MULTILINGUAL VOICE ASSISTANT
// ----------------------------------------------------------------------------
console.log('\n--- 3. Regional Language & Voice Assistant Tests ---');

// Supported Languages Extensibility Check
assert(SUPPORTED_LANGUAGES.en.code === 'en', 'English supported');
assert(SUPPORTED_LANGUAGES.hi.code === 'hi', 'Hindi supported (हिन्दी)');
assert(SUPPORTED_LANGUAGES.or.code === 'or', 'Odia supported (ଓଡ଼ିଆ)');
assert(SUPPORTED_LANGUAGES.bn.code === 'bn', 'Bengali supported (বাংলা)');

// Intent Detection across 4 Languages:
// A. "What is expiring soon?"
assert(detectQueryIntent('What is expiring soon?') === QUERY_INTENTS.EXPIRING_SOON, 'Detects English intent: What is expiring soon?');
assert(detectQueryIntent('Mere ghar mein kya expire hone wala hai?') === QUERY_INTENTS.EXPIRING_SOON, 'Detects Hindi intent: Mere ghar mein kya expire hone wala hai?');
assert(detectQueryIntent('ମୋର କେଉଁ ଖାଦ୍ୟ ଶୀଘ୍ର ସମାପ୍ତ ହେବ?') === QUERY_INTENTS.EXPIRING_SOON, 'Detects Odia intent: ମୋର କେଉଁ ଖାଦ୍ୟ ଶୀଘ୍ର ସମାପ୍ତ ହେବ?');
assert(detectQueryIntent('আমার কোন খাবারটি দ্রুত শেষ হবে?') === QUERY_INTENTS.EXPIRING_SOON, 'Detects Bengali intent: আমার কোন খাবারটি দ্রুত শেষ হবে?');

// B. "Which products should I use first?"
assert(detectQueryIntent('Which products should I use first?') === QUERY_INTENTS.USE_FIRST, 'Detects English intent: Which products should I use first?');
assert(detectQueryIntent('Pehle kya use karein?') === QUERY_INTENTS.USE_FIRST, 'Detects Hindi intent: Pehle kya use karein?');
assert(detectQueryIntent('ମୁଁ ପ୍ରଥମେ କେଉଁଟି ବ୍ୟବହାର କରିବି?') === QUERY_INTENTS.USE_FIRST, 'Detects Odia intent: ମୁଁ ପ୍ରଥମେ କେଉଁଟି ବ୍ୟବହାର କରିବି?');
assert(detectQueryIntent('আমি প্রথমে কোনটি ব্যবহার করব?') === QUERY_INTENTS.USE_FIRST, 'Detects Bengali intent: আমি প্রথমে কোনটি ব্যবহার করব?');

// C. Recall Check & Waste
assert(detectQueryIntent('Check recalls for my food') === QUERY_INTENTS.RECALL_CHECK, 'Detects recall inquiry intent');
assert(detectQueryIntent('How much waste prevented?') === QUERY_INTENTS.WASTE_STATS, 'Detects waste statistics inquiry intent');

// Query Execution on Active User Inventory (Strict Isolation & Verification)
const mockUserInventory = [
  { id: 'item_milk', product_name: 'Organic Whole Milk', expiry_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], storage_location: 'Fridge', status: 'ACTIVE' },
  { id: 'item_bread', product_name: 'Artisan Bread', expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], storage_location: 'Counter', status: 'ACTIVE' },
  { id: 'item_rice', product_name: 'Basmati Rice', expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0], storage_location: 'Pantry', status: 'ACTIVE' }
];

// Query 1: Hindi query
const hiResult = processRegionalAssistantQuery({
  queryText: 'Mere ghar mein kya expire hone wala hai?',
  userInventory: mockUserInventory,
  language: 'hi'
});
assert(hiResult.intent === QUERY_INTENTS.EXPIRING_SOON, 'Processed Hindi query intent');
assert(hiResult.responseText.includes('Organic Whole Milk'), 'Answer accurately identifies real expiring item from user inventory');
assert(hiResult.highlights.length >= 1, 'Highlights expiring products');

// Query 2: Odia query
const orResult = processRegionalAssistantQuery({
  queryText: 'ମୋର କେଉଁ ଖାଦ୍ୟ ଶୀଘ୍ର ସମାପ୍ତ ହେବ?',
  userInventory: mockUserInventory,
  language: 'or'
});
assert(orResult.intent === QUERY_INTENTS.EXPIRING_SOON, 'Processed Odia query intent');
assert(orResult.responseText.includes('Organic Whole Milk'), 'Odia response identifies real expiring product');

// Query 3: USE FIRST query in English
const enResult = processRegionalAssistantQuery({
  queryText: 'Which products should I use first?',
  userInventory: mockUserInventory,
  language: 'en'
});
assert(enResult.intent === QUERY_INTENTS.USE_FIRST, 'Processed English USE FIRST query');
assert(enResult.responseText.includes('Organic Whole Milk'), 'Recommends high priority item expiring first');

// Query 4: Bengali query
const bnResult = processRegionalAssistantQuery({
  queryText: 'আমার কোন খাবারটি দ্রুত শেষ হবে?',
  userInventory: mockUserInventory,
  language: 'bn'
});
assert(bnResult.intent === QUERY_INTENTS.EXPIRING_SOON, 'Processed Bengali query intent');
assert(bnResult.responseText.includes('Organic Whole Milk'), 'Bengali response contains actual user product');

console.log('\n===============================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
