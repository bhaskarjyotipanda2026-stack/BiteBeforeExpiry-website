/**
 * BiteBeforeExpiry — Business Mode & FEFO Inventory Service
 * 
 * Supports:
 * - Supermarkets, Grocery Stores, Restaurants, Food Businesses, Clinics
 * - Role-Based Access Control (RBAC): admin, manager, staff
 * - Bulk barcode scanning & bulk text/CSV import
 * - Batch tracking with First-Expired, First-Out (FEFO) recommendation engine
 * - Expiry & near-expiry monitoring with financial capital-at-risk analysis
 */

import { calculateDaysRemaining, sortInventoryByFefo, determineUseFirstPriority } from './fefoService.js';

export const BUSINESS_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff'
};

export const ROLE_PERMISSIONS = {
  admin: ['manage_staff', 'manage_inventory', 'dispatch_fefo', 'bulk_import', 'view_reports', 'delete_records'],
  manager: ['manage_inventory', 'dispatch_fefo', 'bulk_import', 'view_reports'],
  staff: ['view_inventory', 'scan_items', 'dispatch_fefo']
};

export function hasPermission(role, action) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

/**
 * Parses bulk CSV / text into standardized business inventory items
 * Format expected:
 * Product Name, Barcode, Category, Batch Number, Quantity, Supplier, Mfg Date, Expiry Date, Storage Location, Unit Cost
 */
export function parseBulkInventoryImport(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines or obvious headers
    if (line.startsWith('#') || (i === 0 && line.toLowerCase().includes('product') && line.toLowerCase().includes('expiry'))) {
      continue;
    }

    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 3) continue;

    const [
      product_name,
      barcode,
      category,
      batch_number,
      quantity,
      supplier,
      manufacturing_date,
      expiry_date,
      storage_location,
      unit_cost
    ] = parts;

    if (!product_name) continue;

    items.push({
      product_name: product_name || 'Bulk Item',
      barcode: barcode || `BCODE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: category || 'Pantry',
      batch_number: batch_number || `BATCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      quantity: parseFloat(quantity) || 1.0,
      supplier: supplier || 'General Distributor',
      manufacturing_date: manufacturing_date || null,
      expiry_date: expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      storage_location: storage_location || 'Warehouse Shelf A',
      unit_cost: parseFloat(unit_cost) || 50.0,
      inventory_status: 'IN_STOCK'
    });
  }

  return items;
}

/**
 * Calculates business FEFO priority queue and financial metrics
 */
export function computeBusinessMetrics(inventory = []) {
  if (!Array.isArray(inventory)) return { items: [], metrics: {} };

  const inStock = inventory.filter(i => i.inventory_status === 'IN_STOCK');
  const dispatched = inventory.filter(i => i.inventory_status === 'DISPATCHED_FEFO');
  const discarded = inventory.filter(i => i.inventory_status === 'DISCARDED');

  let totalStockCount = 0;
  let totalUnits = 0;
  let totalInventoryValue = 0;
  let capitalAtRisk = 0; // Expiry in <= 7 days
  let expiredUnits = 0;
  let expiredValue = 0;
  let nearExpiryUnits = 0;

  const fefoSorted = sortInventoryByFefo(inStock);

  const enhancedItems = fefoSorted.map((item, index) => {
    const days = calculateDaysRemaining(item.expiry_date);
    const qty = parseFloat(item.quantity) || 1;
    const cost = parseFloat(item.unit_cost) || 0;
    const itemTotalValue = qty * cost;

    totalStockCount += 1;
    totalUnits += qty;
    totalInventoryValue += itemTotalValue;

    const useFirst = determineUseFirstPriority(item.expiry_date, item.category === 'medicine' ? 'medicine' : 'grocery');

    let dynamicStatus = item.inventory_status;
    let fefoDispatchRecommendation = '';

    if (days !== null && days <= 0) {
      dynamicStatus = 'EXPIRED';
      expiredUnits += qty;
      expiredValue += itemTotalValue;
      fefoDispatchRecommendation = 'CRITICAL: Stock is EXPIRED. DO NOT DISPATCH. Quarantine for safe disposal.';
    } else if (days !== null && days <= 3) {
      dynamicStatus = 'NEAR_EXPIRY';
      nearExpiryUnits += qty;
      capitalAtRisk += itemTotalValue;
      fefoDispatchRecommendation = `PRIORITY 1: Dispatch immediately via FEFO (Expires in ${days}d).`;
    } else if (days !== null && days <= 7) {
      nearExpiryUnits += qty;
      capitalAtRisk += itemTotalValue;
      fefoDispatchRecommendation = `PRIORITY 2: Place on front shelves / discount promotion (Expires in ${days}d).`;
    } else {
      fefoDispatchRecommendation = `NORMAL ROTATION: Stock safe (${days || 'N/A'}d remaining).`;
    }

    return {
      ...item,
      fefoRank: index + 1,
      daysRemaining: days,
      calculatedTotalValue: Math.round(itemTotalValue * 100) / 100,
      useFirstInfo: useFirst,
      dispatchRecommendation: fefoDispatchRecommendation,
      isExpired: days !== null && days <= 0
    };
  });

  return {
    items: enhancedItems,
    metrics: {
      totalProductsTracked: inventory.length,
      inStockCount: inStock.length,
      dispatchedCount: dispatched.length,
      discardedCount: discarded.length,
      totalUnits: Math.round(totalUnits * 100) / 100,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      capitalAtRisk: Math.round(capitalAtRisk * 100) / 100,
      nearExpiryUnits: Math.round(nearExpiryUnits * 100) / 100,
      expiredUnits: Math.round(expiredUnits * 100) / 100,
      expiredValue: Math.round(expiredValue * 100) / 100
    }
  };
}
