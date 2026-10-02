/**
 * BiteBeforeExpiry — Batch-Level Tracking & Movement Service
 * 
 * Tracks complete lifecycle:
 * PRODUCT → BATCH NUMBER → MANUFACTURING DATE → EXPIRY DATE → QUANTITY → LOCATION → MOVEMENT
 * 
 * Supported Stakeholder Roles:
 * - Household
 * - Retailer
 * - Wholesaler
 * - Pharmacy
 * - Manufacturer
 * 
 * Strict Role-Based Access Control (RBAC) governs movement permissions and actions.
 */

export const BATCH_ROLES = {
  HOUSEHOLD: 'household',
  RETAILER: 'retailer',
  WHOLESALER: 'wholesaler',
  PHARMACY: 'pharmacy',
  MANUFACTURER: 'manufacturer'
};

export const MOVEMENT_TYPES = {
  MANUFACTURED: 'MANUFACTURED',
  TRANSFERRED_IN: 'TRANSFERRED_IN',
  RELOCATED: 'RELOCATED',
  DISPATCHED_FEFO: 'DISPATCHED_FEFO',
  QUARANTINED: 'QUARANTINED',
  CONSUMED: 'CONSUMED',
  DISPOSED_SAFELY: 'DISPOSED_SAFELY'
};

export const ROLE_CAPABILITIES = {
  manufacturer: {
    canCreateBatch: true,
    allowedMovements: [MOVEMENT_TYPES.MANUFACTURED, MOVEMENT_TYPES.RELOCATED, MOVEMENT_TYPES.DISPATCHED_FEFO, MOVEMENT_TYPES.QUARANTINED],
    defaultLocations: ['Production Line A', 'Warehouse Finished Goods', 'Cold Holding Depot', 'QA Quarantine Bay']
  },
  wholesaler: {
    canCreateBatch: false,
    allowedMovements: [MOVEMENT_TYPES.TRANSFERRED_IN, MOVEMENT_TYPES.RELOCATED, MOVEMENT_TYPES.DISPATCHED_FEFO, MOVEMENT_TYPES.QUARANTINED],
    defaultLocations: ['Receiving Dock Bay 3', 'Central Cold Hub Depot', 'Pallet Rack B4', 'Staging Area']
  },
  retailer: {
    canCreateBatch: false,
    allowedMovements: [MOVEMENT_TYPES.TRANSFERRED_IN, MOVEMENT_TYPES.RELOCATED, MOVEMENT_TYPES.DISPATCHED_FEFO, MOVEMENT_TYPES.QUARANTINED],
    defaultLocations: ['Backroom Receiving', 'Walk-in Chiller', 'Display Aisle Shelf', 'Checkout Staging']
  },
  pharmacy: {
    canCreateBatch: false,
    allowedMovements: [MOVEMENT_TYPES.TRANSFERRED_IN, MOVEMENT_TYPES.RELOCATED, MOVEMENT_TYPES.DISPATCHED_FEFO, MOVEMENT_TYPES.QUARANTINED, MOVEMENT_TYPES.DISPOSED_SAFELY],
    defaultLocations: ['Secure Dispensary Safe', 'Medical Refrigerator (2°C-8°C)', 'Dispensary Shelf A', 'Authorized Take-Back Bin']
  },
  household: {
    canCreateBatch: false,
    allowedMovements: [MOVEMENT_TYPES.TRANSFERRED_IN, MOVEMENT_TYPES.RELOCATED, MOVEMENT_TYPES.CONSUMED, MOVEMENT_TYPES.DISPOSED_SAFELY],
    defaultLocations: ['Refrigerator Top Shelf', 'Crisper Drawer', 'Pantry Shelf 2', 'Freezer Bay', 'Medicine Cabinet']
  }
};

/**
 * Validates if an actor role has permission to execute a specific movement
 */
export function canExecuteMovement(role, movementType) {
  const caps = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.household;
  return caps.allowedMovements.includes(movementType);
}

/**
 * Creates a standardized movement record
 */
export function createBatchMovementRecord({
  batchNumber,
  productName,
  fromLocation,
  toLocation,
  quantity,
  actorRole = BATCH_ROLES.HOUSEHOLD,
  actorName = 'Operator',
  movementType = MOVEMENT_TYPES.RELOCATED,
  temperature = null,
  notes = ''
}) {
  if (!canExecuteMovement(actorRole, movementType)) {
    throw new Error(`Role "${actorRole}" is not authorized to execute movement type "${movementType}".`);
  }

  return {
    id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    batch_number: batchNumber,
    product_name: productName,
    from_location: fromLocation,
    to_location: toLocation,
    quantity_moved: parseFloat(quantity) || 1,
    actor_role: actorRole,
    actor_name: actorName,
    movement_type: movementType,
    temperature_reading: temperature,
    notes,
    timestamp: new Date().toISOString()
  };
}

/**
 * Seed historical movement trails for demo batches
 */
export const SAMPLE_BATCH_TRAILS = {
  'LOT-DAIRY-8891': [
    {
      id: 'mov_seed_001',
      batch_number: 'LOT-DAIRY-8891',
      product_name: 'Organic Whole Milk 1L',
      from_location: 'Green Valley Bottling Line 2',
      to_location: 'Manufacturer Cold Holding Bay',
      quantity_moved: 500,
      actor_role: 'manufacturer',
      actor_name: 'GreenPastures Processing',
      movement_type: 'MANUFACTURED',
      temperature_reading: '3.1°C',
      notes: 'Pasteurized, tested, and sealed with zero microbial flags.',
      timestamp: '2026-09-20T06:30:00Z'
    },
    {
      id: 'mov_seed_002',
      batch_number: 'LOT-DAIRY-8891',
      product_name: 'Organic Whole Milk 1L',
      from_location: 'Manufacturer Cold Holding Bay',
      to_location: 'ColdFresh Logistics Depot #3',
      quantity_moved: 500,
      actor_role: 'wholesaler',
      actor_name: 'ColdFresh Freight Transport',
      movement_type: 'TRANSFERRED_IN',
      temperature_reading: '3.4°C',
      notes: 'Refrigerated transit chain validated.',
      timestamp: '2026-09-21T14:15:00Z'
    },
    {
      id: 'mov_seed_003',
      batch_number: 'LOT-DAIRY-8891',
      product_name: 'Organic Whole Milk 1L',
      from_location: 'ColdFresh Logistics Depot #3',
      to_location: 'FreshMart Walk-in Chiller',
      quantity_moved: 100,
      actor_role: 'retailer',
      actor_name: 'FreshMart Receiving Team',
      movement_type: 'TRANSFERRED_IN',
      temperature_reading: '3.5°C',
      notes: 'Stock received and checked against FEFO rotation protocol.',
      timestamp: '2026-09-23T08:00:00Z'
    },
    {
      id: 'mov_seed_004',
      batch_number: 'LOT-DAIRY-8891',
      product_name: 'Organic Whole Milk 1L',
      from_location: 'FreshMart Walk-in Chiller',
      to_location: 'Retail Display Shelf (Front Row)',
      quantity_moved: 24,
      actor_role: 'retailer',
      actor_name: 'Floor Merchandiser',
      movement_type: 'RELOCATED',
      temperature_reading: '3.8°C',
      notes: 'Placed for immediate customer sale under FEFO.',
      timestamp: '2026-09-24T11:00:00Z'
    }
  ],
  'AMX-404-X': [
    {
      id: 'mov_seed_101',
      batch_number: 'AMX-404-X',
      product_name: 'Amoxicillin Trihydrate 500mg',
      from_location: 'Biocure Formulation Suite 4',
      to_location: 'Biocure Controlled Storage',
      quantity_moved: 10000,
      actor_role: 'manufacturer',
      actor_name: 'Biocure QA Release',
      movement_type: 'MANUFACTURED',
      temperature_reading: '21.0°C',
      notes: 'GMP certified blister packaging lot.',
      timestamp: '2026-01-10T10:00:00Z'
    },
    {
      id: 'mov_seed_102',
      batch_number: 'AMX-404-X',
      product_name: 'Amoxicillin Trihydrate 500mg',
      from_location: 'Biocure Controlled Storage',
      to_location: 'MediTrans Central Hub',
      quantity_moved: 2000,
      actor_role: 'wholesaler',
      actor_name: 'MediTrans Healthcare Depot',
      movement_type: 'TRANSFERRED_IN',
      temperature_reading: '20.5°C',
      notes: 'Tamper seals audited.',
      timestamp: '2026-01-15T09:30:00Z'
    },
    {
      id: 'mov_seed_103',
      batch_number: 'AMX-404-X',
      product_name: 'Amoxicillin Trihydrate 500mg',
      from_location: 'MediTrans Central Hub',
      to_location: 'Community Pharmacy Dispensary Safe',
      quantity_moved: 100,
      actor_role: 'pharmacy',
      actor_name: 'Head Pharmacist',
      movement_type: 'TRANSFERRED_IN',
      temperature_reading: '21.5°C',
      notes: 'Rx lot cataloged in pharmacy inventory.',
      timestamp: '2026-01-22T10:00:00Z'
    }
  ]
};
