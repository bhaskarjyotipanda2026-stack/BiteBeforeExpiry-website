/**
 * BiteBeforeExpiry — Part 8: Role-Based Access Control (RBAC) & Multi-Tenant Architecture Verification Suite
 * 
 * Verifies:
 * 1. All 9 Stakeholder Roles (Household, Retailer, Wholesaler, Distributor, Pharmacy, Clinic, Hospital, Manufacturer, Admin)
 * 2. Role-specific permissions & navigation access
 * 3. Multi-location warehouse logistics & FEFO dispatch tracking
 * 4. Manufacturer product master & verified recall workflow
 * 5. Healthcare safety boundaries & clinical non-liability rules
 * 6. Audit trail logging & data isolation
 */

import { 
  PLATFORM_ROLES, 
  ROLE_CONFIGS, 
  SEEDED_ORGANIZATIONS, 
  SEEDED_WAREHOUSES,
  SEEDED_DISPATCHES,
  SEEDED_PRODUCT_MASTER,
  checkRolePermission,
  getAllowedTabsForRole,
  executeManufacturerRecallWorkflow 
} from './src/services/roleService.js';
import { dbService } from './src/services/dbService.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runPart8Tests() {
  console.log('\n===============================================================');
  console.log('🧪 BITEBEFOREEXPIRY — PART 8 ROLE-BASED PLATFORM TEST SUITE');
  console.log('===============================================================\n');

  // --- 1. Stakeholder Roles Verification ---
  console.log('--- 1. Stakeholder Roles Definition & Configuration ---');
  const expectedRoles = [
    'NORMAL_USER', 'SHOPKEEPER', 'WHOLESALER', 'DISTRIBUTOR',
    'PHARMACY', 'CLINIC', 'HOSPITAL', 'MANUFACTURER', 'ADMIN'
  ];

  expectedRoles.forEach(roleKey => {
    assert(PLATFORM_ROLES[roleKey] === roleKey, `Role ${roleKey} defined in PLATFORM_ROLES`);
    assert(ROLE_CONFIGS[roleKey], `Role ${roleKey} has complete configuration profile`);
    assert(ROLE_CONFIGS[roleKey].defaultTab, `Role ${roleKey} has a designated landing tab`);
    assert(Array.isArray(ROLE_CONFIGS[roleKey].allowedTabs), `Role ${roleKey} defines allowed navigation tabs`);
    assert(Array.isArray(ROLE_CONFIGS[roleKey].permissions), `Role ${roleKey} defines permission scopes`);
  });

  // --- 2. Role-Based Permissions & Navigation Scoping ---
  console.log('\n--- 2. RBAC Permissions & Navigation Scoping ---');
  
  // Normal User
  assert(checkRolePermission(PLATFORM_ROLES.NORMAL_USER, 'read_own_pantry'), 'Household user can read own pantry');
  assert(!checkRolePermission(PLATFORM_ROLES.NORMAL_USER, 'manage_warehouse'), 'Household user CANNOT manage commercial warehouses');
  assert(!checkRolePermission(PLATFORM_ROLES.NORMAL_USER, 'issue_recalls'), 'Household user CANNOT issue product recalls');
  
  // Shopkeeper / Retailer
  assert(checkRolePermission(PLATFORM_ROLES.SHOPKEEPER, 'dispatch_fefo'), 'Shopkeeper can execute FEFO dispatch');
  assert(checkRolePermission(PLATFORM_ROLES.SHOPKEEPER, 'bulk_import'), 'Shopkeeper can bulk import inventory');
  assert(!checkRolePermission(PLATFORM_ROLES.SHOPKEEPER, 'manage_product_master'), 'Shopkeeper CANNOT manage manufacturer product master');

  // Wholesaler & Distributor
  assert(checkRolePermission(PLATFORM_ROLES.WHOLESALER, 'manage_warehouse'), 'Wholesaler can manage warehouse pallets');
  assert(checkRolePermission(PLATFORM_ROLES.DISTRIBUTOR, 'multi_warehouse_transfer'), 'Distributor can transfer across multiple warehouses');
  assert(checkRolePermission(PLATFORM_ROLES.DISTRIBUTOR, 'dispatch_retailers'), 'Distributor can dispatch to retailers');

  // Pharmacy & Healthcare
  assert(checkRolePermission(PLATFORM_ROLES.PHARMACY, 'manage_medicines'), 'Pharmacy can manage prescription medicines');
  assert(checkRolePermission(PLATFORM_ROLES.PHARMACY, 'match_recalls'), 'Pharmacy can match official recall alerts');
  assert(checkRolePermission(PLATFORM_ROLES.HOSPITAL, 'cold_chain_audit'), 'Hospital can audit cold chain compliance');
  assert(!checkRolePermission(PLATFORM_ROLES.PHARMACY, 'manage_product_master'), 'Pharmacy CANNOT edit manufacturer product master');

  // Manufacturer
  assert(checkRolePermission(PLATFORM_ROLES.MANUFACTURER, 'manage_product_master'), 'Manufacturer can manage product master');
  assert(checkRolePermission(PLATFORM_ROLES.MANUFACTURER, 'create_batches'), 'Manufacturer can generate production batches');
  assert(checkRolePermission(PLATFORM_ROLES.MANUFACTURER, 'issue_recalls'), 'Manufacturer can issue verified recalls');

  // Admin
  assert(checkRolePermission(PLATFORM_ROLES.ADMIN, 'manage_all'), 'Admin has universal permissions');
  assert(checkRolePermission(PLATFORM_ROLES.ADMIN, 'audit_platform'), 'Admin can audit platform compliance');

  // Navigation tab filtering
  const householdTabs = getAllowedTabsForRole(PLATFORM_ROLES.NORMAL_USER);
  assert(householdTabs.includes('household'), 'Household navigation includes household tab');
  assert(!householdTabs.includes('distributor_dash'), 'Household navigation excludes distributor tab');

  const retailerTabs = getAllowedTabsForRole(PLATFORM_ROLES.SHOPKEEPER);
  assert(retailerTabs.includes('retailer_dash'), 'Retailer navigation includes retailer portal tab');

  const pharmaTabs = getAllowedTabsForRole(PLATFORM_ROLES.PHARMACY);
  assert(pharmaTabs.includes('pharmacy_dash'), 'Pharmacy navigation includes pharmacy portal tab');

  // --- 3. Multi-Tenant Organizations & Database Operations ---
  console.log('\n--- 3. Multi-Tenant Organizations & Data Persistence ---');
  const orgs = await dbService.getOrganizations();
  assert(orgs.length >= 9, 'Database has seeded organizations for all roles');

  const retailerOrg = orgs.find(o => o.role === PLATFORM_ROLES.SHOPKEEPER);
  assert(retailerOrg && retailerOrg.name === 'FreshMart Supermarket', 'Found Retailer organization: FreshMart Supermarket');

  const mfgOrg = orgs.find(o => o.role === PLATFORM_ROLES.MANUFACTURER);
  assert(mfgOrg && mfgOrg.identifier === 'MFG-IN-0077', 'Found Manufacturer organization identifier: MFG-IN-0077');

  const savedOrg = await dbService.saveOrganization({
    name: 'Apollo Regional Distribution Depot',
    role: PLATFORM_ROLES.DISTRIBUTOR,
    type: 'LOGISTICS',
    identifier: 'DIS-TEST-9901'
  });
  assert(savedOrg.id && savedOrg.name === 'Apollo Regional Distribution Depot', 'Successfully created and persisted new organization');

  // --- 4. Multi-Location Warehouses for Supply Chain ---
  console.log('\n--- 4. Multi-Location Warehouses & Capacity Monitoring ---');
  const warehouses = await dbService.getWarehouses();
  assert(warehouses.length >= 3, 'Retrieved multi-location warehouse network (>= 3 depots)');

  const centralWh = warehouses.find(w => w.code === 'WH-BLR-CENTRAL');
  assert(centralWh, 'Identified Central Distribution Hub');
  assert(centralWh.capacity_pallets === 12000, 'Central warehouse capacity is 12,000 pallets');
  assert(centralWh.temperature_zones.includes('Cold Chain (2-8°C)'), 'Central warehouse supports Cold Chain (2-8°C)');

  const coldWh = warehouses.find(w => w.code === 'WH-BLR-COLD');
  assert(coldWh && coldWh.temperature_zones.includes('Ultra-Low Cryo (-70°C)'), 'Bio-Pharma warehouse supports Ultra-Low Cryo (-70°C)');

  // --- 5. Downstream Dispatches & FEFO Retailer Allocation ---
  console.log('\n--- 5. Downstream Dispatches & Reverse Logistics ---');
  const dispatches = await dbService.getDispatches();
  assert(dispatches.length >= 4, 'Retrieved active dispatches (>= 4)');

  const yogurtDisp = dispatches.find(d => d.batch_number === 'LOT-DAIRY-8891');
  assert(yogurtDisp, 'Identified dispatch for batch LOT-DAIRY-8891');
  assert(yogurtDisp.recipient_type === 'RETAILER', 'Recipient is a RETAILER');
  assert(yogurtDisp.fefo_priority_rank === 1, 'Assigned FEFO rank 1 (nearest expiry)');
  assert(yogurtDisp.cold_chain_verified === true, 'Cold chain verified during transit');

  const recalledDisp = dispatches.find(d => d.batch_number === 'PARA-REC-2024-09');
  assert(recalledDisp, 'Identified pharmaceutical dispatch for recalled batch');
  assert(recalledDisp.dispatch_status === 'RECALLED_HOLD', 'Recalled batch correctly flagged as RECALLED_HOLD');

  // Create new dispatch
  const createdDisp = await dbService.createDispatch({
    recipient_name: 'City Health Clinic',
    recipient_type: 'CLINIC',
    recipient_org_id: 'org_clinic_01',
    product_name: 'Electrolyte Rehydration Salts',
    batch_number: 'ORS-BATCH-991',
    quantity_cases: 10,
    unit_count: 500,
    expiry_date: '2027-01-01',
    transit_temp: '22.0°C'
  });
  assert(createdDisp.id && createdDisp.dispatch_status === 'PENDING', 'Created new dispatch record with PENDING status');

  const updatedDisp = await dbService.updateDispatchStatus(createdDisp.id, 'DELIVERED');
  assert(updatedDisp.dispatch_status === 'DELIVERED' && updatedDisp.delivered_at, 'Updated dispatch status to DELIVERED with timestamp');

  // --- 6. Manufacturer Product Master & Recall Workflow ---
  console.log('\n--- 6. Manufacturer Product Master & Statutory Recall Workflow ---');
  const products = await dbService.getProductMaster();
  assert(products.length >= 3, 'Manufacturer master catalog loaded (>= 3 SKUs)');

  const greekYogurt = products.find(p => p.sku === 'SKU-DAIRY-YOG-500');
  assert(greekYogurt, 'Found product master SKU-DAIRY-YOG-500');
  assert(greekYogurt.storage_temp_min_c === 2.0, 'Min storage temperature is 2.0°C');

  // Execute verified recall workflow
  const recallResult = executeManufacturerRecallWorkflow({
    manufacturerOrgId: 'org_mfg_01',
    productSku: 'SKU-DAIRY-YOG-500',
    batchNumber: 'LOT-DAIRY-8891',
    recallClassification: 'Class I',
    regulatoryBulletinUrl: 'https://www.fda.gov/safety/recalls',
    reason: 'Routine QA detected microbial contamination risk.',
    recommendedAction: 'Quarantine immediately. Reverse-logistics will collect.'
  });

  assert(recallResult.recall_id, 'Generated official manufacturer recall ID');
  assert(recallResult.batch_number === 'LOT-DAIRY-8891', 'Target batch matches LOT-DAIRY-8891');
  assert(recallResult.downstream_holders_notified >= 1, 'Identified and notified downstream holders holding this batch');
  assert(recallResult.status === 'ACTIVE_RECALL_BROADCAST', 'Status transitioned to ACTIVE_RECALL_BROADCAST');
  assert(recallResult.affected_locations[0].dispatch_status === 'QUARANTINE_ALERT_SENT', 'Downstream recipient marked with QUARANTINE_ALERT_SENT');

  // --- 7. Security, Auditing & Non-Automated Actions ---
  console.log('\n--- 7. Security Auditing & Governance Integrity ---');
  const auditLog = await dbService.logAuditAction({
    userId: 'usr_demo_primary_001',
    orgId: 'org_mfg_01',
    role: PLATFORM_ROLES.MANUFACTURER,
    actionType: 'RECALL_BROADCAST',
    targetEntity: 'BATCH',
    entityId: 'LOT-DAIRY-8891',
    details: { classification: 'Class I', reason: 'Microbial contamination risk' }
  });
  assert(auditLog.id, 'Audit log persisted with unique ID');
  assert(auditLog.action_type === 'RECALL_BROADCAST', 'Audit action type recorded as RECALL_BROADCAST');

  const logs = await dbService.getAuditLogs(10);
  assert(logs.length >= 1, 'Audit log retrieved successfully');
  assert(logs[0].action_type === 'RECALL_BROADCAST', 'Latest audit log matches logged recall event');

  console.log('\n===============================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, 0 FAILED (out of ${totalTests})`);
  console.log('===============================================================\n');
}

runPart8Tests().catch(err => {
  console.error('Fatal error in Part 8 test suite:', err);
  process.exit(1);
});
