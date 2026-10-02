/**
 * BiteBeforeExpiry — Role-Based Access Control (RBAC) & Multi-Tenant Service
 * 
 * Supports 9 Dedicated User Roles:
 * 1. NORMAL_USER   - Household consumer with private pantry & medicine cabinet
 * 2. SHOPKEEPER    - Retailer / grocery store with FEFO dispatch & capital-at-risk analysis
 * 3. WHOLESALER    - Bulk distributor with warehouse pallets & retailer fulfillment
 * 4. DISTRIBUTOR   - Multi-location warehouse logistics & downstream tracking
 * 5. PHARMACY      - Licensed drug dispensary with batch tracking & official recall matching
 * 6. CLINIC        - Outpatient clinic with emergency drug kits & shelf-life monitoring
 * 7. HOSPITAL      - Multi-ward pharmaceutical stock & cold chain verification
 * 8. MANUFACTURER  - Product master, batch generation, and downstream recall management
 * 9. ADMIN         - Platform governance, audit logs & cross-organization oversight
 */

export const PLATFORM_ROLES = {
  NORMAL_USER: 'NORMAL_USER',
  SHOPKEEPER: 'SHOPKEEPER',
  WHOLESALER: 'WHOLESALER',
  DISTRIBUTOR: 'DISTRIBUTOR',
  PHARMACY: 'PHARMACY',
  CLINIC: 'CLINIC',
  HOSPITAL: 'HOSPITAL',
  MANUFACTURER: 'MANUFACTURER',
  ADMIN: 'ADMIN'
};

export const ROLE_CONFIGS = {
  [PLATFORM_ROLES.NORMAL_USER]: {
    id: PLATFORM_ROLES.NORMAL_USER,
    label: 'Household User',
    category: 'Consumer',
    icon: '👤',
    color: 'emerald',
    description: 'Personal food and medicine inventory, USE-FIRST priority, and private expiry alarms.',
    defaultTab: 'household',
    allowedTabs: ['scan', 'household', 'medicine', 'dashboard', 'recipes', 'history', 'streaks', 'stats', 'gov_data', 'settings'],
    permissions: ['read_own_pantry', 'write_own_pantry', 'log_consumption', 'view_recipes', 'view_stats']
  },
  [PLATFORM_ROLES.SHOPKEEPER]: {
    id: PLATFORM_ROLES.SHOPKEEPER,
    label: 'Retailer / Shopkeeper',
    category: 'Retail',
    icon: '🏪',
    color: 'blue',
    description: 'Commercial stock management, bulk barcode scanning, FEFO dispatch, and near-expiry alerts.',
    defaultTab: 'retailer_dash',
    allowedTabs: ['scan', 'retailer_dash', 'business', 'donations', 'recalls_batches', 'gov_data', 'settings'],
    permissions: ['manage_inventory', 'dispatch_fefo', 'bulk_import', 'view_reports', 'manage_staff', 'list_donations']
  },
  [PLATFORM_ROLES.WHOLESALER]: {
    id: PLATFORM_ROLES.WHOLESALER,
    label: 'Wholesaler',
    category: 'Supply Chain',
    icon: '📦',
    color: 'indigo',
    description: 'Bulk warehouse inventory, pallet tracking, and retailer dispatch management.',
    defaultTab: 'distributor_dash',
    allowedTabs: ['scan', 'distributor_dash', 'business', 'recalls_batches', 'donations', 'gov_data', 'settings'],
    permissions: ['manage_warehouse', 'dispatch_retailers', 'track_batches', 'view_reports', 'fefo_allocation']
  },
  [PLATFORM_ROLES.DISTRIBUTOR]: {
    id: PLATFORM_ROLES.DISTRIBUTOR,
    label: 'Distributor Logistics',
    category: 'Supply Chain',
    icon: '🚚',
    color: 'purple',
    description: 'Multi-location warehouse logistics, manufacturer intake, and retailer dispatch tracking.',
    defaultTab: 'distributor_dash',
    allowedTabs: ['scan', 'distributor_dash', 'business', 'recalls_batches', 'gov_data', 'settings'],
    permissions: ['manage_warehouse', 'multi_warehouse_transfer', 'dispatch_retailers', 'track_batches', 'view_reports']
  },
  [PLATFORM_ROLES.PHARMACY]: {
    id: PLATFORM_ROLES.PHARMACY,
    label: 'Retail Pharmacy',
    category: 'Healthcare',
    icon: '💊',
    color: 'teal',
    description: 'Prescription & OTC medicines, batch tracking, official recall matching, and safe disposal.',
    defaultTab: 'pharmacy_dash',
    allowedTabs: ['scan', 'pharmacy_dash', 'medicine', 'recalls_batches', 'gov_data', 'settings'],
    permissions: ['manage_medicines', 'match_recalls', 'dispense_medicines', 'drug_takeback_disposal', 'verify_batches']
  },
  [PLATFORM_ROLES.CLINIC]: {
    id: PLATFORM_ROLES.CLINIC,
    label: 'Healthcare Clinic',
    category: 'Healthcare',
    icon: '🩺',
    color: 'cyan',
    description: 'Clinical drug supply, emergency medication kit inspection, and batch tracking.',
    defaultTab: 'pharmacy_dash',
    allowedTabs: ['scan', 'pharmacy_dash', 'medicine', 'recalls_batches', 'gov_data', 'settings'],
    permissions: ['manage_medicines', 'match_recalls', 'clinical_stock_audit', 'verify_batches']
  },
  [PLATFORM_ROLES.HOSPITAL]: {
    id: PLATFORM_ROLES.HOSPITAL,
    label: 'Hospital Inventory',
    category: 'Healthcare',
    icon: '🏥',
    color: 'rose',
    description: 'Multi-ward pharmaceutical inventory, cold-chain verification, and critical drug batch tracking.',
    defaultTab: 'pharmacy_dash',
    allowedTabs: ['scan', 'pharmacy_dash', 'medicine', 'recalls_batches', 'gov_data', 'settings'],
    permissions: ['manage_medicines', 'multi_ward_transfer', 'match_recalls', 'quarantine_batches', 'cold_chain_audit']
  },
  [PLATFORM_ROLES.MANUFACTURER]: {
    id: PLATFORM_ROLES.MANUFACTURER,
    label: 'Manufacturer',
    category: 'Enterprise',
    icon: '🏭',
    color: 'amber',
    description: 'Product master management, batch generation, and downstream recall communication.',
    defaultTab: 'manufacturer_dash',
    allowedTabs: ['scan', 'manufacturer_dash', 'recalls_batches', 'business', 'gov_data', 'settings'],
    permissions: ['manage_product_master', 'create_batches', 'dispatch_distributors', 'issue_recalls', 'view_lifecycle']
  },
  [PLATFORM_ROLES.ADMIN]: {
    id: PLATFORM_ROLES.ADMIN,
    label: 'Platform Admin',
    category: 'Governance',
    icon: '🛡️',
    color: 'slate',
    description: 'Platform audits, cross-organization oversight, user role assignments, and regulatory compliance.',
    defaultTab: 'admin_dash',
    allowedTabs: ['admin_dash', 'scan', 'dashboard', 'household', 'business', 'distributor_dash', 'pharmacy_dash', 'manufacturer_dash', 'recalls_batches', 'gov_data', 'settings'],
    permissions: ['manage_all', 'audit_platform', 'manage_organizations', 'manage_user_roles', 'manage_regulations']
  }
};

/**
 * Seeded Organizations across all 9 roles
 */
export const SEEDED_ORGANIZATIONS = [
  {
    id: 'org_household_01',
    name: 'Panda Family Household',
    role: PLATFORM_ROLES.NORMAL_USER,
    type: 'HOUSEHOLD',
    identifier: 'HH-BLR-0042',
    address: 'Koramangala 4th Block, Bengaluru, Karnataka',
    contact_email: 'household.demo@bitebeforeexpiry.com',
    status: 'ACTIVE'
  },
  {
    id: 'org_retail_01',
    name: 'FreshMart Supermarket',
    role: PLATFORM_ROLES.SHOPKEEPER,
    type: 'RETAIL_STORE',
    identifier: 'RET-KA-9921',
    address: 'Indiranagar 100ft Road, Bengaluru',
    contact_email: 'freshmart@bitebeforeexpiry.com',
    status: 'ACTIVE'
  },
  {
    id: 'org_wholesale_01',
    name: 'Apex Wholesale Grocers',
    role: PLATFORM_ROLES.WHOLESALER,
    type: 'WHOLESALE_DEPOT',
    identifier: 'WHS-KA-4410',
    address: 'Yeshwanthpur Industrial Suburb, Bengaluru',
    contact_email: 'apexwholesale@bitebeforeexpiry.com',
    status: 'ACTIVE'
  },
  {
    id: 'org_distrib_01',
    name: 'Metro Food & Pharma Logistics',
    role: PLATFORM_ROLES.DISTRIBUTOR,
    type: 'DISTRIBUTION_CENTER',
    identifier: 'DIS-IN-5501',
    address: 'Hosur Road Logistics Hub, Electronic City, Bengaluru',
    contact_email: 'logistics@bitebeforeexpiry.com',
    status: 'ACTIVE'
  },
  {
    id: 'org_pharma_01',
    name: 'CarePlus 24x7 Pharmacy',
    role: PLATFORM_ROLES.PHARMACY,
    type: 'PHARMACY_RETAIL',
    identifier: 'PH-KA-2024-88',
    address: 'MG Road Metro Station Arcade, Bengaluru',
    contact_email: 'rx@carepluspharma.in',
    status: 'ACTIVE'
  },
  {
    id: 'org_clinic_01',
    name: 'Sunrise Family Healthcare Clinic',
    role: PLATFORM_ROLES.CLINIC,
    type: 'OUTPATIENT_CLINIC',
    identifier: 'CLN-KA-3319',
    address: 'Jayanagar 4th Block, Bengaluru',
    contact_email: 'contact@sunriseclinic.org',
    status: 'ACTIVE'
  },
  {
    id: 'org_hosp_01',
    name: 'Apollo Care Multispecialty Hospital',
    role: PLATFORM_ROLES.HOSPITAL,
    type: 'TERTIARY_HOSPITAL',
    identifier: 'HSP-BLR-0019',
    address: 'Bannerghatta Main Road, Bengaluru',
    contact_email: 'pharmacy.director@apollocare.org',
    status: 'ACTIVE'
  },
  {
    id: 'org_mfg_01',
    name: 'Apex Bio-Nutrition & Pharmaceuticals Ltd',
    role: PLATFORM_ROLES.MANUFACTURER,
    type: 'MANUFACTURING_PLANT',
    identifier: 'MFG-IN-0077',
    address: 'Peenya Industrial Area Phase 1, Bengaluru',
    contact_email: 'qa.manufacturing@apexbio.com',
    status: 'ACTIVE'
  },
  {
    id: 'org_admin_01',
    name: 'BiteBeforeExpiry Governance Council',
    role: PLATFORM_ROLES.ADMIN,
    type: 'PLATFORM_GOVERNANCE',
    identifier: 'ADM-SYS-0001',
    address: 'Global Technology Operations, Bengaluru',
    contact_email: 'admin@bitebeforeexpiry.com',
    status: 'ACTIVE'
  }
];

/**
 * Multi-Location Warehouses for Distributors and Wholesalers
 */
export const SEEDED_WAREHOUSES = [
  {
    id: 'wh_central_01',
    organization_id: 'org_distrib_01',
    warehouse_name: 'Central Distribution Hub (Ambient & Chilled)',
    code: 'WH-BLR-CENTRAL',
    location: 'Electronic City, Bengaluru',
    capacity_pallets: 12000,
    current_occupancy_pallets: 8450,
    temperature_zones: ['Ambient (18-24°C)', 'Cold Chain (2-8°C)', 'Deep Freeze (-18°C)'],
    total_active_batches: 184,
    batches_expiring_soon: 12
  },
  {
    id: 'wh_north_02',
    organization_id: 'org_distrib_01',
    warehouse_name: 'North Regional Depo (Dry Foods & Grains)',
    code: 'WH-BLR-NORTH',
    location: 'Doddaballapur Industrial Area, Bengaluru Rural',
    capacity_pallets: 8500,
    current_occupancy_pallets: 5120,
    temperature_zones: ['Ambient Dry (20-25°C)'],
    total_active_batches: 96,
    batches_expiring_soon: 5
  },
  {
    id: 'wh_cold_03',
    organization_id: 'org_distrib_01',
    warehouse_name: 'Metro Bio-Pharma Cold Storage Facility',
    code: 'WH-BLR-COLD',
    location: 'Peenya Industrial Area, Bengaluru',
    capacity_pallets: 4000,
    current_occupancy_pallets: 2890,
    temperature_zones: ['Cold Chain (2-8°C)', 'Ultra-Low Cryo (-70°C)'],
    total_active_batches: 64,
    batches_expiring_soon: 3
  }
];

/**
 * Downstream Retailer Dispatches for Distributors & Wholesalers
 */
export const SEEDED_DISPATCHES = [
  {
    id: 'disp_2026_0911',
    dispatch_number: 'DSP-2026-0911',
    origin_warehouse_id: 'wh_central_01',
    origin_warehouse_name: 'Central Distribution Hub',
    recipient_type: 'RETAILER',
    recipient_name: 'FreshMart Supermarket (Indiranagar)',
    recipient_org_id: 'org_retail_01',
    product_name: 'Organic Greek Yogurt 500g',
    batch_number: 'LOT-DAIRY-8891',
    quantity_cases: 40,
    unit_count: 480,
    manufacturing_date: '2026-09-01',
    expiry_date: '2026-10-15',
    fefo_priority_rank: 1,
    cold_chain_verified: true,
    transit_temp: '4.2°C',
    dispatch_status: 'DELIVERED',
    dispatched_at: '2026-09-18T08:30:00Z',
    delivered_at: '2026-09-18T13:45:00Z'
  },
  {
    id: 'disp_2026_0912',
    dispatch_number: 'DSP-2026-0912',
    origin_warehouse_id: 'wh_central_01',
    origin_warehouse_name: 'Central Distribution Hub',
    recipient_type: 'RETAILER',
    recipient_name: 'QuickBite Mart (Koramangala)',
    recipient_org_id: 'org_retail_02',
    product_name: 'Fresh Whole Milk 1L (Pasteurized)',
    batch_number: 'LOT-MILK-9902',
    quantity_cases: 60,
    unit_count: 720,
    manufacturing_date: '2026-09-28',
    expiry_date: '2026-10-05',
    fefo_priority_rank: 1,
    cold_chain_verified: true,
    transit_temp: '3.8°C',
    dispatch_status: 'IN_TRANSIT',
    dispatched_at: '2026-10-01T06:00:00Z',
    delivered_at: null
  },
  {
    id: 'disp_2026_0913',
    dispatch_number: 'DSP-2026-0913',
    origin_warehouse_id: 'wh_cold_03',
    origin_warehouse_name: 'Metro Bio-Pharma Cold Storage Facility',
    recipient_type: 'HOSPITAL',
    recipient_name: 'Apollo Care Multispecialty Hospital',
    recipient_org_id: 'org_hosp_01',
    product_name: 'Amoxicillin 500mg Capsules (100s)',
    batch_number: 'AMX-404-X',
    quantity_cases: 25,
    unit_count: 2500,
    manufacturing_date: '2026-08-10',
    expiry_date: '2027-08-10',
    fefo_priority_rank: 2,
    cold_chain_verified: true,
    transit_temp: '21.0°C',
    dispatch_status: 'DELIVERED',
    dispatched_at: '2026-09-25T11:00:00Z',
    delivered_at: '2026-09-25T15:20:00Z'
  },
  {
    id: 'disp_2026_0914',
    dispatch_number: 'DSP-2026-0914',
    origin_warehouse_id: 'wh_cold_03',
    origin_warehouse_name: 'Metro Bio-Pharma Cold Storage Facility',
    recipient_type: 'PHARMACY',
    recipient_name: 'CarePlus 24x7 Pharmacy',
    recipient_org_id: 'org_pharma_01',
    product_name: 'Paracetamol 500mg IP (Blister Pack of 10)',
    batch_number: 'PARA-REC-2024-09',
    quantity_cases: 50,
    unit_count: 5000,
    manufacturing_date: '2024-09-01',
    expiry_date: '2026-09-01',
    fefo_priority_rank: 99, // Expired / Recalled!
    cold_chain_verified: false,
    transit_temp: '22.4°C',
    dispatch_status: 'RECALLED_HOLD',
    dispatched_at: '2024-09-15T09:00:00Z',
    delivered_at: '2024-09-15T14:30:00Z'
  }
];

/**
 * Manufacturer Product Master Catalog
 */
export const SEEDED_PRODUCT_MASTER = [
  {
    id: 'prod_mfg_01',
    sku: 'SKU-DAIRY-YOG-500',
    product_name: 'Organic Greek Yogurt 500g',
    brand: 'Apex Farm Organics',
    category: 'Food',
    subcategory: 'Dairy & Fermented',
    standard_shelf_life_days: 45,
    storage_temp_min_c: 2.0,
    storage_temp_max_c: 6.0,
    primary_barcode: '8901030889123',
    total_manufactured_batches: 42,
    active_in_circulation: 8
  },
  {
    id: 'prod_mfg_02',
    sku: 'SKU-GRAIN-OATS-1000',
    product_name: 'Whole Grain Rolled Oats 1kg',
    brand: 'Apex Pure Harvest',
    category: 'Food',
    subcategory: 'Cereals & Breakfast',
    standard_shelf_life_days: 365,
    storage_temp_min_c: 15.0,
    storage_temp_max_c: 25.0,
    primary_barcode: '8901030771234',
    total_manufactured_batches: 28,
    active_in_circulation: 14
  },
  {
    id: 'prod_mfg_03',
    sku: 'SKU-RX-AMX-500',
    product_name: 'Amoxicillin 500mg Capsules',
    brand: 'Apex Bio-Pharma',
    category: 'Medicine',
    subcategory: 'Antibiotics & Prescriptions',
    standard_shelf_life_days: 730,
    storage_temp_min_c: 15.0,
    storage_temp_max_c: 25.0,
    primary_barcode: '8901030664411',
    total_manufactured_batches: 19,
    active_in_circulation: 6
  }
];

/**
 * Check if a role has permission for a specific action
 */
export function checkRolePermission(role, action) {
  const config = ROLE_CONFIGS[role];
  if (!config) return false;
  if (role === PLATFORM_ROLES.ADMIN) return true;
  return config.permissions.includes(action);
}

/**
 * Returns allowed navigation tabs for a role
 */
export function getAllowedTabsForRole(role) {
  const config = ROLE_CONFIGS[role];
  return config ? config.allowedTabs : ['scan', 'dashboard', 'settings'];
}

/**
 * Manufacturer Recall Workflow:
 * 1. Manufacturer creates a verified recall
 * 2. Identifies all downstream locations holding the batch
 * 3. Notifies authorized distributors and retailers
 * 4. Updates batch status to QUARANTINED / RECALLED
 */
export function executeManufacturerRecallWorkflow({
  manufacturerOrgId,
  productSku,
  batchNumber,
  recallClassification = 'Class I',
  regulatoryBulletinUrl,
  reason,
  recommendedAction
}) {
  if (!batchNumber) {
    throw new Error('Batch number is required for manufacturer recall initiation');
  }

  // Find all downstream dispatches containing this batch
  const affectedDispatches = SEEDED_DISPATCHES.filter(
    d => d.batch_number.toUpperCase() === batchNumber.toUpperCase()
  );

  const downstreamHolders = affectedDispatches.map(d => ({
    recipient_type: d.recipient_type,
    recipient_name: d.recipient_name,
    recipient_org_id: d.recipient_org_id,
    dispatched_quantity: d.unit_count,
    dispatch_number: d.dispatch_number,
    dispatch_status: 'QUARANTINE_ALERT_SENT'
  }));

  const recallRecord = {
    recall_id: `MFR-REC-${Date.now().toString().slice(-6)}`,
    manufacturer_org_id: manufacturerOrgId || 'org_mfg_01',
    batch_number: batchNumber.toUpperCase(),
    product_sku: productSku || 'SKU-UNKNOWN',
    classification: recallClassification,
    reason: reason || 'Precautionary quality assurance recall',
    recommended_action: recommendedAction || 'Quarantine immediately. Do not dispense or sell. Await reverse-logistics pickup.',
    regulatory_bulletin_url: regulatoryBulletinUrl || 'https://www.fda.gov/safety/recalls',
    downstream_holders_notified: downstreamHolders.length,
    affected_locations: downstreamHolders,
    status: 'ACTIVE_RECALL_BROADCAST',
    created_at: new Date().toISOString()
  };

  return recallRecord;
}
