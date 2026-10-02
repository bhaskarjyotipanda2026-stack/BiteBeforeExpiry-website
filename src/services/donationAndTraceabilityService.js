/**
 * BiteBeforeExpiry — Donation Before Expiry & Retailer-to-Consumer Traceability Service
 * 
 * Capabilities:
 * 1. Safe Surplus Food Donation Workflow:
 *    - Strict eligibility check: NEVER allow expired or hazardous food to be listed for donation!
 *    - Connects surplus households/businesses with verified food banks and relief organizations.
 * 2. Supply Chain Traceability:
 *    - Tracks product lifecycle: Manufacturer -> Distributor -> Wholesaler -> Retailer -> Consumer.
 *    - Public verification code for consumers to inspect authenticity and batch cold-chain history.
 */

import { calculateDaysRemaining } from './fefoService.js';

// Curated list of verified food rescue organizations
export const VERIFIED_DONATION_PARTNERS = [
  {
    id: 'org_food_rescue_01',
    name: 'National Food Rescue Network',
    type: 'Regional Food Bank',
    verificationStatus: 'VERIFIED_ACTIVE',
    acceptedCategories: ['Produce', 'Bakery', 'Pantry', 'Canned Goods', 'Dairy (Cold Chain)'],
    contactPhone: '+1-800-555-FOOD',
    operatingHours: '08:00 - 18:00'
  },
  {
    id: 'org_community_kitchen_02',
    name: 'Community Hope Kitchen',
    type: 'Soup Kitchen & Shelter',
    verificationStatus: 'VERIFIED_ACTIVE',
    acceptedCategories: ['Produce', 'Bakery', 'Grains', 'Pantry'],
    contactPhone: '+1-800-555-HOPE',
    operatingHours: '07:00 - 19:00'
  },
  {
    id: 'org_zero_waste_03',
    name: 'City Surplus Redistribution Alliance',
    type: 'Direct Table Distribution',
    verificationStatus: 'VERIFIED_ACTIVE',
    acceptedCategories: ['Produce', 'Packaged Snacks', 'Beverages', 'Pantry'],
    contactPhone: '+1-800-555-ZERO',
    operatingHours: '09:00 - 20:00'
  }
];

/**
 * Validates whether an item is eligible for food donation
 * STRICT RULE: Expired food or items with < 1 day remaining CANNOT be donated.
 */
export function validateDonationEligibility(product) {
  const expiryDate = product.expiry_date || product.expiryDate;
  const days = calculateDaysRemaining(expiryDate);

  if (days === null) {
    return {
      isEligible: false,
      reason: 'Product has no valid expiry date. Items without verifiable dates cannot be accepted for food safety compliance.',
      daysRemaining: null
    };
  }

  if (days <= 0) {
    return {
      isEligible: false,
      reason: 'CRITICAL SAFETY VIOLATION: Item is already EXPIRED. Expired food poses bacterial and health hazards and is strictly forbidden from donation listings.',
      daysRemaining: days
    };
  }

  if (days < 1) {
    return {
      isEligible: false,
      reason: 'Insufficient lead time. Items must have at least 24 hours remaining before expiry to allow transportation and safe distribution.',
      daysRemaining: days
    };
  }

  // Check product category restrictions (medicines cannot go to food banks)
  const category = (product.category || '').toLowerCase();
  if (category.includes('medicine') || category.includes('pharmaceutical') || category.includes('drug')) {
    return {
      isEligible: false,
      reason: 'Pharmaceutical items cannot be donated through food surplus channels. Utilize pharmacy medication return programs.',
      daysRemaining: days
    };
  }

  return {
    isEligible: true,
    reason: `Item is eligible for donation with ${days} days remaining shelf life. Meets food safety guidelines.`,
    daysRemaining: days
  };
}

/**
 * Demo verified traceability chains for consumer verification demonstration
 */
export const SAMPLE_TRACEABILITY_RECORDS = [
  {
    traceability_code: 'TRC-ORG-2024-8891',
    product_name: 'Organic Whole Milk 1L',
    batch_number: 'LOT-DAIRY-8891',
    manufacturer_name: 'GreenPastures Dairy Farms Ltd.',
    mfg_date: '2026-09-20',
    expiry_date: '2026-10-15',
    public_consumer_view: {
      origin: 'GreenPastures Farm, Valley Region',
      certifications: ['USDA Organic Certified', 'Non-GMO Project Verified', 'ISO 22000 Food Safety'],
      temperature_controlled: true,
      last_safety_inspection: 'PASSED - Zero Microbial Anomalies'
    },
    lifecycle_stages: [
      {
        stage: 'MANUFACTURER',
        actor: 'GreenPastures Dairy Processing Facility',
        timestamp: '2026-09-20T06:30:00Z',
        location: 'Facility #4, Green Valley',
        status: 'Produced & Bottled',
        quality_check: 'Passed (Acidity: 0.14%, Fat: 3.8%)',
        cold_chain_temp: '3.2°C'
      },
      {
        stage: 'DISTRIBUTOR',
        actor: 'ColdFresh Logistics National',
        timestamp: '2026-09-21T14:15:00Z',
        location: 'Central Cold Hub Depot',
        status: 'Dispatched via refrigerated freight',
        quality_check: 'Passed',
        cold_chain_temp: '3.5°C'
      },
      {
        stage: 'WHOLESALER',
        actor: 'Metro Food Distributors Wholesale',
        timestamp: '2026-09-23T08:00:00Z',
        location: 'Regional Distribution Center #2',
        status: 'Received & sorted for regional grocers',
        quality_check: 'Passed',
        cold_chain_temp: '3.1°C'
      },
      {
        stage: 'RETAILER',
        actor: 'FreshMart Supermarket #104',
        timestamp: '2026-09-24T11:00:00Z',
        location: 'FreshMart Grocery Bay Area',
        status: 'Stocked on refrigerated display shelf (FEFO priority)',
        quality_check: 'Passed',
        cold_chain_temp: '3.8°C'
      },
      {
        stage: 'CONSUMER',
        actor: 'End Consumer Verification',
        timestamp: 'Current Shelf Inspection',
        location: 'At Retail Point / Consumer Kitchen',
        status: 'Authentic & Verified Uncompromised Cold Chain',
        quality_check: 'Guaranteed Unbroken Supply Chain',
        cold_chain_temp: 'Verified Safe'
      }
    ]
  },
  {
    traceability_code: 'TRC-MED-2024-5542',
    product_name: 'Paracetamol 500mg Tablets 20s',
    batch_number: 'PARA-BATCH-2024-55',
    manufacturer_name: 'Apex Pharma Laboratories',
    mfg_date: '2026-01-10',
    expiry_date: '2027-01-10',
    public_consumer_view: {
      origin: 'Apex GMP Certified Facility #1',
      certifications: ['WHO-GMP', 'FDA Registered', 'Serial Lot Audited'],
      temperature_controlled: false,
      last_safety_inspection: 'Assay 99.8% Active Compound'
    },
    lifecycle_stages: [
      {
        stage: 'MANUFACTURER',
        actor: 'Apex Pharma Manufacturing Facility',
        timestamp: '2026-01-10T10:00:00Z',
        location: 'Pharma Zone Unit 12',
        status: 'Tableted, blister-sealed, and batch-coded',
        quality_check: 'Passed GMP assay dissolution test',
        cold_chain_temp: 'Room Temp (22°C)'
      },
      {
        stage: 'DISTRIBUTOR',
        actor: 'MediTrans Safe Distribution Hub',
        timestamp: '2026-01-15T09:30:00Z',
        location: 'Healthcare Logistics Depot',
        status: 'Controlled storage and transit verification',
        quality_check: 'Passed carton tamper seal check',
        cold_chain_temp: 'Controlled Room Temp (21°C)'
      },
      {
        stage: 'WHOLESALER',
        actor: 'CarePlus Medical Supplies Wholesale',
        timestamp: '2026-01-18T16:00:00Z',
        location: 'Medical Supply Hub',
        status: 'Distributed to licensed pharmacies',
        quality_check: 'Passed barcode lot authentication',
        cold_chain_temp: '20°C'
      },
      {
        stage: 'RETAILER',
        actor: 'Community Care Pharmacy #12',
        timestamp: '2026-01-22T10:00:00Z',
        location: 'Community Care Dispensary',
        status: 'Stocked in dispensary dispensing bay',
        quality_check: 'Pharmacist verification completed',
        cold_chain_temp: '22°C'
      },
      {
        stage: 'CONSUMER',
        actor: 'Patient Verification',
        timestamp: 'Point of Purchase',
        location: 'Patient Hands',
        status: 'Verified authentic pharmaceutical product',
        quality_check: 'Tamper seal intact',
        cold_chain_temp: 'Room Temp'
      }
    ]
  }
];

export function lookupProductTraceability(traceabilityCode) {
  if (!traceabilityCode) return null;
  const cleanCode = traceabilityCode.trim().toUpperCase();
  return SAMPLE_TRACEABILITY_RECORDS.find(r => r.traceability_code.toUpperCase() === cleanCode) || null;
}
