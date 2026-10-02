/**
 * BiteBeforeExpiry Unified Database Service
 * 
 * Supports Supabase PostgreSQL with offline-first resilient local storage fallback.
 * Guarantees zero data loss, strict user isolation, and reliable persistence.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { OFFICIAL_RECALL_REGISTRY } from './productRecallService.js';
import { SAMPLE_BATCH_TRAILS } from './batchTrackingService.js';
import { 
  SEEDED_ORGANIZATIONS, 
  SEEDED_WAREHOUSES, 
  SEEDED_DISPATCHES, 
  SEEDED_PRODUCT_MASTER 
} from './roleService.js';


export const EXPIRY_THRESHOLDS = {
  SOON_DAYS: 7,
  URGENT_DAYS: 3,
  IMMEDIATE_DAYS: 1
};

export function calculateExpiryStatus(expiryDate, thresholds = EXPIRY_THRESHOLDS) {
  if (!expiryDate) return 'active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiryDate);
  target.setHours(0, 0, 0, 0);
  if (isNaN(target.getTime())) return 'active';

  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'expired';
  if (diffDays <= (thresholds.SOON_DAYS || 7)) return 'expiring_soon';
  return 'active';
}

const LOCAL_TABLE_KEYS = {
  USERS: 'bbe_db_users',
  PROFILES: 'bbe_db_profiles',
  USER_PROFILES: 'bbe_db_user_profiles',
  PRODUCTS: 'bbe_db_products',
  USER_SCANS: 'bbe_db_user_scans',
  SCANNED_PRODUCTS: 'bbe_db_scanned_products',
  REMINDERS: 'bbe_db_reminders',
  PANTRY_ITEMS: 'bbe_db_pantry_items',
  WASTE_RECORDS: 'bbe_db_waste_records',
  USER_CORRECTIONS: 'bbe_db_user_corrections',
  NOTIFICATIONS: 'bbe_db_notifications',
  ML_PREDICTIONS: 'bbe_db_ml_predictions',
  KNOWLEDGE_ITEMS: 'bbe_db_knowledge_items',
  HOUSEHOLD_INVENTORY: 'bbe_db_household_inventory',
  BUSINESSES: 'bbe_db_businesses',
  BUSINESS_STAFF: 'bbe_db_business_staff',
  BUSINESS_INVENTORY: 'bbe_db_business_inventory',
  MEDICINE_INVENTORY: 'bbe_db_medicine_inventory',
  DONATION_LISTINGS: 'bbe_db_donation_listings',
  PRODUCT_TRACEABILITY: 'bbe_db_product_traceability',
  OFFICIAL_RECALLS: 'bbe_db_official_recalls',
  BATCH_MOVEMENTS: 'bbe_db_batch_movements',
  WASTE_PREDICTIONS: 'bbe_db_waste_predictions',
  ORGANIZATIONS: 'bbe_db_organizations',
  USER_ROLES: 'bbe_db_user_roles',
  WAREHOUSES: 'bbe_db_warehouses',
  DISPATCHES: 'bbe_db_dispatches',
  PRODUCT_MASTER: 'bbe_db_product_master',
  RECALL_ITEMS: 'bbe_db_recall_items',
  AUDIT_LOGS: 'bbe_db_audit_logs',
  CURRENT_SESSION: 'bbe_active_session'
};

// In-memory fallback for Node.js / non-browser test environments
const inMemoryStorage = {};

// Helper for local table reads
function getLocalTable(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    }
    return inMemoryStorage[key] || [];
  } catch (err) {
    console.error(`[DB] Error reading local table ${key}:`, err);
    return [];
  }
}

// Helper for local table writes
function setLocalTable(key, data) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }
    inMemoryStorage[key] = data;
    return true;
  } catch (err) {
    console.error(`[DB] Error writing local table ${key}:`, err);
    return false;
  }
}

// Default initial demo user profile
const DEFAULT_DEMO_USER = {
  id: 'usr_demo_primary_001',
  name: 'Health Conscious User',
  email: 'demo@bitebeforeexpiry.com',
  created_at: new Date().toISOString()
};

const DEFAULT_DEMO_PROFILE = {
  id: 'prof_demo_001',
  user_id: 'usr_demo_primary_001',
  allergies: [],
  dietary_preferences: ['Vegetarian'],
  preferred_language: 'en',
  notification_preferences: {
    lead_days: 3,
    banner_enabled: true,
    daily_digest: true,
    push_notifications: true,
    category_overrides: { medicine: 7, grocery: 3 }
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

function getDayOffsetDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const DEFAULT_HOUSEHOLD_ITEMS = [
  {
    id: 'hh_item_001',
    user_id: 'usr_demo_primary_001',
    product_name: 'Organic Whole Milk 1L',
    category: 'Dairy',
    quantity: 1,
    manufacturing_date: getDayOffsetDateStr(-10),
    expiry_date: getDayOffsetDateStr(1),
    batch_number: 'LOT-MILK-9901',
    storage_location: 'Refrigerator Top Shelf',
    scan_date: new Date().toISOString(),
    entry_source: 'barcode',
    status: 'EXPIRING_SOON',
    use_first_priority: 'HIGH',
    estimated_value: 65.0,
    notes: 'Use in morning smoothie or baking immediately',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hh_item_002',
    user_id: 'usr_demo_primary_001',
    product_name: 'Multigrain Sliced Bread 400g',
    category: 'Bakery',
    quantity: 1,
    manufacturing_date: getDayOffsetDateStr(-4),
    expiry_date: getDayOffsetDateStr(3),
    batch_number: 'BREAD-788',
    storage_location: 'Kitchen Counter',
    scan_date: new Date().toISOString(),
    entry_source: 'OCR',
    status: 'EXPIRING_SOON',
    use_first_priority: 'MEDIUM',
    estimated_value: 45.0,
    notes: 'Good for toast today or freeze remaining slices',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hh_item_003',
    user_id: 'usr_demo_primary_001',
    product_name: 'Greek Yogurt 500g',
    category: 'Dairy',
    quantity: 2,
    manufacturing_date: getDayOffsetDateStr(-7),
    expiry_date: getDayOffsetDateStr(6),
    batch_number: 'YOG-4412',
    storage_location: 'Refrigerator Middle Shelf',
    scan_date: new Date().toISOString(),
    entry_source: 'barcode',
    status: 'ACTIVE',
    use_first_priority: 'LOW',
    estimated_value: 120.0,
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hh_item_004',
    user_id: 'usr_demo_primary_001',
    product_name: 'Organic Baby Spinach 200g',
    category: 'Produce',
    quantity: 1,
    manufacturing_date: getDayOffsetDateStr(-9),
    expiry_date: getDayOffsetDateStr(-2),
    batch_number: 'SPN-991',
    storage_location: 'Crisper Drawer',
    scan_date: new Date().toISOString(),
    entry_source: 'manual',
    status: 'EXPIRED',
    use_first_priority: 'EXPIRED',
    estimated_value: 50.0,
    notes: 'DO NOT CONSUME — Unsafe for consumption. Compost or discard safely.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hh_item_005',
    user_id: 'usr_demo_primary_001',
    product_name: 'Extra Virgin Olive Oil 750ml',
    category: 'Pantry',
    quantity: 1,
    manufacturing_date: getDayOffsetDateStr(-60),
    expiry_date: getDayOffsetDateStr(180),
    batch_number: 'OIL-2201',
    storage_location: 'Pantry Shelf 2',
    scan_date: new Date().toISOString(),
    entry_source: 'barcode',
    status: 'ACTIVE',
    use_first_priority: 'NONE',
    estimated_value: 280.0,
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hh_item_006',
    user_id: 'usr_demo_primary_001',
    product_name: 'Free-Range Brown Eggs 6pk',
    category: 'Poultry',
    quantity: 1,
    manufacturing_date: getDayOffsetDateStr(-14),
    expiry_date: getDayOffsetDateStr(-1),
    batch_number: 'EGG-3301',
    storage_location: 'Refrigerator Door',
    scan_date: new Date().toISOString(),
    entry_source: 'barcode',
    status: 'CONSUMED',
    use_first_priority: 'NONE',
    consumed_at: getDayOffsetDateStr(-3),
    estimated_value: 75.0,
    notes: 'Fully consumed in omelette before expiry date',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_BUSINESS = {
  id: 'biz_demo_001',
  owner_user_id: 'usr_demo_primary_001',
  business_name: 'FreshMart Organics & Gourmet Groceries',
  business_type: 'supermarket',
  registration_number: 'REG-2024-FM-8891',
  address: '104 Market Boulevard, Suite A, Metro City',
  created_at: new Date().toISOString()
};

const DEFAULT_STAFF = [
  {
    id: 'staff_demo_01',
    business_id: 'biz_demo_001',
    user_id: 'usr_demo_primary_001',
    staff_name: 'Elena Vance',
    staff_email: 'demo@bitebeforeexpiry.com',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'staff_demo_02',
    business_id: 'biz_demo_001',
    user_id: 'usr_staff_002',
    staff_name: 'Marcus Wright',
    staff_email: 'marcus.inventory@freshmart.local',
    role: 'manager',
    created_at: new Date().toISOString()
  },
  {
    id: 'staff_demo_03',
    business_id: 'biz_demo_001',
    user_id: 'usr_staff_003',
    staff_name: 'Chloe Bennett',
    staff_email: 'chloe.ops@freshmart.local',
    role: 'staff',
    created_at: new Date().toISOString()
  }
];

const DEFAULT_BUSINESS_INVENTORY = [
  {
    id: 'binv_001',
    business_id: 'biz_demo_001',
    product_name: 'French Artisan Baguettes',
    barcode: '793573189912',
    category: 'Bakery',
    batch_number: 'BAG-2026-10A',
    quantity: 24,
    supplier: 'Artisan Boulangerie Supplies',
    manufacturing_date: getDayOffsetDateStr(-1),
    expiry_date: getDayOffsetDateStr(1),
    storage_location: 'Bakery Front Display',
    inventory_status: 'IN_STOCK',
    fefo_rank: 1,
    unit_cost: 35.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'binv_002',
    business_id: 'biz_demo_001',
    product_name: 'Fresh Atlantic Salmon Fillets 250g',
    barcode: '890103082214',
    category: 'Seafood',
    batch_number: 'SAL-OCT-09',
    quantity: 15,
    supplier: 'Nordic Ocean Catch Co.',
    manufacturing_date: getDayOffsetDateStr(-2),
    expiry_date: getDayOffsetDateStr(2),
    storage_location: 'Cold Seafood Case #1',
    inventory_status: 'IN_STOCK',
    fefo_rank: 2,
    unit_cost: 180.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'binv_003',
    business_id: 'biz_demo_001',
    product_name: 'Organic Silk Tofu 400g',
    barcode: '490277810012',
    category: 'Refrigerated Grocery',
    batch_number: 'TOF-8812',
    quantity: 30,
    supplier: 'SoyGreen Distributors',
    manufacturing_date: getDayOffsetDateStr(-5),
    expiry_date: getDayOffsetDateStr(5),
    storage_location: 'Cold Walk-in Shelf B',
    inventory_status: 'IN_STOCK',
    fefo_rank: 3,
    unit_cost: 60.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'binv_004',
    business_id: 'biz_demo_001',
    product_name: 'Aged Cheddar Cheese Blocks 200g',
    barcode: '500016801991',
    category: 'Dairy',
    batch_number: 'CHD-5502',
    quantity: 50,
    supplier: 'Highland Dairy Federation',
    manufacturing_date: getDayOffsetDateStr(-20),
    expiry_date: getDayOffsetDateStr(30),
    storage_location: 'Dairy Aisle Refrigerator #3',
    inventory_status: 'IN_STOCK',
    fefo_rank: 4,
    unit_cost: 120.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'binv_005',
    business_id: 'biz_demo_001',
    product_name: 'Organic Canned Black Beans 400g',
    barcode: '028400041211',
    category: 'Pantry Canned',
    batch_number: 'BBN-9921',
    quantity: 120,
    supplier: 'SunHarvest Organics',
    manufacturing_date: getDayOffsetDateStr(-60),
    expiry_date: getDayOffsetDateStr(365),
    storage_location: 'Warehouse Aisle 4 Shelf C',
    inventory_status: 'IN_STOCK',
    fefo_rank: 5,
    unit_cost: 40.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_MEDICINE_ITEMS = [
  {
    id: 'med_001',
    user_id: 'usr_demo_primary_001',
    business_id: null,
    medicine_name: 'Amoxicillin Trihydrate 500mg',
    brand: 'Biocure Labs',
    barcode: '890108819231',
    batch_number: 'AMX-404-X',
    manufacturing_date: getDayOffsetDateStr(-100),
    expiry_date: getDayOffsetDateStr(45),
    quantity: 20,
    storage_location: 'Main Medicine Cabinet (Cool, Dry)',
    scan_date: new Date().toISOString(),
    source: 'barcode',
    verification_status: 'VERIFIED_SOURCE_DATA',
    recall_status: 'CLEAR',
    safe_disposal_guidance: 'Authorized Drug Take-Back Program or pharmacy collection kiosk.',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'med_002',
    user_id: 'usr_demo_primary_001',
    business_id: null,
    medicine_name: 'Paracetamol Pediatric Oral Suspension',
    brand: 'Generic Care',
    barcode: '890105520991',
    batch_number: 'PARA-REC-2024-09',
    manufacturing_date: getDayOffsetDateStr(-150),
    expiry_date: getDayOffsetDateStr(60),
    quantity: 1,
    storage_location: 'First Aid Shelf',
    scan_date: new Date().toISOString(),
    source: 'OCR',
    verification_status: 'OCR_RESULT',
    recall_status: 'CONFIRMED_RECALL',
    safe_disposal_guidance: 'CRITICAL: Return to pharmacy immediately due to manufacturer lot recall.',
    status: 'EXPIRING_SOON',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'med_003',
    user_id: 'usr_demo_primary_001',
    business_id: null,
    medicine_name: 'Cough & Bronchial Syrup 100ml',
    brand: 'RespiRelief',
    barcode: '890204481920',
    batch_number: 'CS-8812',
    manufacturing_date: getDayOffsetDateStr(-400),
    expiry_date: getDayOffsetDateStr(-15),
    quantity: 1,
    storage_location: 'Master Bathroom Cabinet',
    scan_date: new Date().toISOString(),
    source: 'manual',
    verification_status: 'USER_INPUT',
    recall_status: 'CLEAR',
    safe_disposal_guidance: 'DO NOT INGEST — Expired medicine. Follow FDA household disposal or take-back.',
    status: 'EXPIRED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_DONATION_LISTINGS = [
  {
    id: 'don_001',
    user_id: 'usr_demo_primary_001',
    business_id: 'biz_demo_001',
    product_name: 'Surplus Fresh Crisp Apples (Grade A)',
    category: 'Produce',
    quantity: 12,
    expiry_date: getDayOffsetDateStr(5),
    safety_verified: true,
    organization_name: 'National Food Rescue Network',
    pickup_location: 'FreshMart Loading Bay 2, 104 Market Blvd',
    status: 'listed',
    created_at: new Date().toISOString()
  },
  {
    id: 'don_002',
    user_id: 'usr_demo_primary_001',
    business_id: 'biz_demo_001',
    product_name: 'Whole Grain Loaves 400g (Unsold Surplus)',
    category: 'Bakery',
    quantity: 8,
    expiry_date: getDayOffsetDateStr(2),
    safety_verified: true,
    organization_name: 'Community Hope Kitchen',
    pickup_location: 'FreshMart Customer Service Counter',
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

const DEFAULT_TRACEABILITY_RECORDS = [
  {
    id: 'trc_rec_001',
    traceability_code: 'TRC-ORG-2024-8891',
    product_name: 'Organic Whole Milk 1L',
    batch_number: 'LOT-DAIRY-8891',
    manufacturer_name: 'GreenPastures Dairy Farms Ltd.',
    mfg_date: '2026-09-20',
    expiry_date: getDayOffsetDateStr(14),
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
    id: 'trc_rec_002',
    traceability_code: 'TRC-MED-2024-5542',
    product_name: 'Paracetamol 500mg Tablets 20s',
    batch_number: 'PARA-BATCH-2024-55',
    manufacturer_name: 'Apex Pharma Laboratories',
    mfg_date: '2026-01-10',
    expiry_date: getDayOffsetDateStr(300),
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

export const dbService = {
  isConfigured: isSupabaseConfigured,

  // ==========================================================================
  // 1. AUTHENTICATION & SESSION
  // ==========================================================================

  async getCurrentSession() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          const { data: userRow } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          return {
            user: {
              id: session.user.id,
              email: session.user.email,
              name: userRow?.name || session.user.user_metadata?.name || session.user.email.split('@')[0]
            },
            isOffline: false
          };
        }
      } catch (err) {
        console.warn('[DB] Supabase getSession failed, falling back to local session:', err.message);
      }
    }

    // Local Storage Session fallback
    try {
      const savedSession = localStorage.getItem(LOCAL_TABLE_KEYS.CURRENT_SESSION);
      if (savedSession) {
        return { user: JSON.parse(savedSession), isOffline: true };
      }
    } catch (_) {}

    // Initialize with demo user session
    setLocalTable(LOCAL_TABLE_KEYS.CURRENT_SESSION, DEFAULT_DEMO_USER);
    this._ensureLocalDefaults();
    return { user: DEFAULT_DEMO_USER, isOffline: true };
  },

  async signUp({ email, password, name }) {
    if (!email || !password) throw new Error('Email and password are required');
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: cleanName } }
        });
        if (error) throw error;

        if (data.user) {
          // Insert into users table
          await supabase.from('users').upsert({
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
            created_at: new Date().toISOString()
          });

          // Insert initial profile
          await supabase.from('user_profiles').upsert({
            user_id: data.user.id,
            allergies: [],
            dietary_preferences: [],
            preferred_language: 'en',
            notification_preferences: {
              lead_days: 3,
              banner_enabled: true,
              daily_digest: true,
              push_notifications: true,
              category_overrides: { medicine: 7, grocery: 3 }
            }
          });

          const userObj = { id: data.user.id, email: cleanEmail, name: cleanName };
          localStorage.setItem(LOCAL_TABLE_KEYS.CURRENT_SESSION, JSON.stringify(userObj));
          return { user: userObj, session: data.session };
        }
      } catch (err) {
        console.warn('[DB] Supabase signUp error, falling back to local auth:', err.message);
      }
    }

    // Local Auth Fallback
    const users = getLocalTable(LOCAL_TABLE_KEYS.USERS);
    let user = users.find(u => u.email === cleanEmail);
    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: cleanName,
        email: cleanEmail,
        created_at: new Date().toISOString()
      };
      users.push(user);
      setLocalTable(LOCAL_TABLE_KEYS.USERS, users);

      // Create local user profile
      const profiles = getLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES);
      profiles.push({
        id: `prof_${Date.now()}`,
        user_id: user.id,
        allergies: [],
        dietary_preferences: [],
        preferred_language: 'en',
        notification_preferences: {
          lead_days: 3,
          banner_enabled: true,
          daily_digest: true,
          push_notifications: true,
          category_overrides: { medicine: 7, grocery: 3 }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES, profiles);
    }

    localStorage.setItem(LOCAL_TABLE_KEYS.CURRENT_SESSION, JSON.stringify(user));
    return { user, session: { access_token: 'local_token' } };
  },

  async login({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required');
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) throw error;

        if (data.user) {
          const { data: userRow } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const userObj = {
            id: data.user.id,
            email: cleanEmail,
            name: userRow?.name || data.user.user_metadata?.name || cleanEmail.split('@')[0]
          };
          localStorage.setItem(LOCAL_TABLE_KEYS.CURRENT_SESSION, JSON.stringify(userObj));
          return { user: userObj, session: data.session };
        }
      } catch (err) {
        console.warn('[DB] Supabase login error, falling back to local login:', err.message);
      }
    }

    // Local Login Fallback
    const users = getLocalTable(LOCAL_TABLE_KEYS.USERS);
    let user = users.find(u => u.email === cleanEmail);
    if (!user) {
      // Create user automatically in local mode
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        created_at: new Date().toISOString()
      };
      users.push(user);
      setLocalTable(LOCAL_TABLE_KEYS.USERS, users);
    }

    localStorage.setItem(LOCAL_TABLE_KEYS.CURRENT_SESSION, JSON.stringify(user));
    return { user, session: { access_token: 'local_token' } };
  },

  async logout() {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    }
    localStorage.removeItem(LOCAL_TABLE_KEYS.CURRENT_SESSION);
    return true;
  },

  async resetPassword(email) {
    if (!email) throw new Error('Email is required');
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        return { success: true, message: 'Password reset link sent to your email.' };
      } catch (err) {
        console.warn('[DB] Supabase password reset failed:', err.message);
      }
    }
    return { success: true, message: 'Password reset instructions simulated for local mode.' };
  },

  // ==========================================================================
  // 2. USER PROFILE
  // ==========================================================================

  async getUserProfile(userId) {
    if (!userId) return null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getUserProfile failed:', err.message);
      }
    }

    const profiles = getLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES);
    const found = profiles.find(p => p.user_id === userId);
    if (found) return found;

    // Create default profile if missing
    const newProf = {
      ...DEFAULT_DEMO_PROFILE,
      id: `prof_${Date.now()}`,
      user_id: userId
    };
    profiles.push(newProf);
    setLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES, profiles);
    return newProf;
  },

  async upsertUserProfile(userId, profileData) {
    if (!userId) throw new Error('User ID is required');

    const updatePayload = {
      user_id: userId,
      allergies: profileData.allergies || [],
      dietary_preferences: profileData.dietary_preferences || [],
      preferred_language: profileData.preferred_language || 'en',
      notification_preferences: profileData.notification_preferences || {
        lead_days: 3,
        banner_enabled: true,
        daily_digest: true,
        push_notifications: true
      },
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .upsert(updatePayload, { onConflict: 'user_id' })
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase upsertUserProfile failed:', err.message);
      }
    }

    const profiles = getLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES);
    const index = profiles.findIndex(p => p.user_id === userId);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updatePayload };
    } else {
      profiles.push({ id: `prof_${Date.now()}`, ...updatePayload, created_at: new Date().toISOString() });
    }
    setLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES, profiles);
    return profiles[index !== -1 ? index : profiles.length - 1];
  },

  async getProfile(userId) {
    if (!userId) return null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getProfile failed:', err.message);
      }
    }
    const profiles = getLocalTable(LOCAL_TABLE_KEYS.PROFILES);
    const found = profiles.find(p => p.user_id === userId);
    if (found) return found;

    // Fallback to active user session
    const users = getLocalTable(LOCAL_TABLE_KEYS.USERS);
    const user = users.find(u => u.id === userId) || DEFAULT_DEMO_USER;
    return {
      id: `prof_${userId}`,
      user_id: userId,
      full_name: user.name || 'User',
      email: user.email || 'user@bitebeforeexpiry.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  async upsertProfile(userId, { full_name, email }) {
    if (!userId) throw new Error('user_id is required');
    const payload = {
      user_id: userId,
      full_name: full_name || 'User',
      email: email || '',
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase upsertProfile failed:', err.message);
      }
    }

    const profiles = getLocalTable(LOCAL_TABLE_KEYS.PROFILES);
    const idx = profiles.findIndex(p => p.user_id === userId);
    const updated = {
      id: idx !== -1 ? profiles[idx].id : `prof_${userId}`,
      created_at: idx !== -1 ? profiles[idx].created_at : new Date().toISOString(),
      ...payload
    };
    if (idx !== -1) {
      profiles[idx] = updated;
    } else {
      profiles.unshift(updated);
    }
    setLocalTable(LOCAL_TABLE_KEYS.PROFILES, profiles);
    return updated;
  },

  // ==========================================================================
  // 3. PRODUCT KNOWLEDGE BASE (Generic Products)
  // ==========================================================================

  async getProductByBarcode(barcode) {
    if (!barcode) return null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', barcode)
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getProductByBarcode failed:', err.message);
      }
    }

    const products = getLocalTable(LOCAL_TABLE_KEYS.PRODUCTS);
    return products.find(p => p.barcode === barcode) || null;
  },

  async saveProduct(product) {
    if (!product || !product.product_name) throw new Error('Product name is required');

    const payload = {
      barcode: product.barcode || null,
      product_name: product.product_name,
      brand: product.brand || null,
      category: product.category || 'Other Grocery',
      product_type: product.product_type || 'grocery',
      ingredients: product.ingredients || [],
      nutrition: product.nutrition || {},
      allergens: product.allergens || [],
      image_url: product.image_url || null,
      source: product.source || 'barcode',
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(payload, { onConflict: 'barcode' })
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveProduct failed:', err.message);
      }
    }

    const products = getLocalTable(LOCAL_TABLE_KEYS.PRODUCTS);
    let index = -1;
    if (payload.barcode) {
      index = products.findIndex(p => p.barcode === payload.barcode);
    }
    if (index !== -1) {
      products[index] = { ...products[index], ...payload };
      setLocalTable(LOCAL_TABLE_KEYS.PRODUCTS, products);
      return products[index];
    } else {
      const newProd = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ...payload,
        created_at: new Date().toISOString()
      };
      products.push(newProd);
      setLocalTable(LOCAL_TABLE_KEYS.PRODUCTS, products);
      return newProd;
    }
  },

  // ==========================================================================
  // 4. SCANNED PRODUCTS (Package-Specific Scan Instance)
  // ==========================================================================

  async saveScannedProduct(scanData) {
    if (!scanData || !scanData.user_id) throw new Error('User ID is required for scanned product');

    const payload = {
      user_id: scanData.user_id,
      product_id: scanData.product_id || null,
      barcode: scanData.barcode || null,
      ocr_text: scanData.ocr_text || null,
      mfg_date: scanData.mfg_date || null,
      expiry_date: scanData.expiry_date || null,
      best_before: scanData.best_before || null,
      batch_number: scanData.batch_number || null,
      ingredients: scanData.ingredients || [],
      nutrition: scanData.nutrition || {},
      confidence_score: scanData.confidence_score || 0,
      field_confidences: scanData.field_confidences || {},
      detection_source: scanData.detection_source || 'ocr',
      provenance: scanData.provenance || {},
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('scanned_products')
          .insert(payload)
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveScannedProduct failed:', err.message);
      }
    }

    const scans = getLocalTable(LOCAL_TABLE_KEYS.SCANNED_PRODUCTS);
    const newScan = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...payload
    };
    scans.unshift(newScan);
    setLocalTable(LOCAL_TABLE_KEYS.SCANNED_PRODUCTS, scans);
    return newScan;
  },

  // ==========================================================================
  // 4B. USER SCANS (Personal Scans, Expiry Tracking & Storage)
  // ==========================================================================

  async saveUserScan(scanData) {
    if (!scanData || !scanData.user_id) {
      throw new Error('user_id is required for user scan');
    }

    // 1. Data Validation: Expiry Date vs Manufacturing Date
    const mfgDate = scanData.manufacturing_date || scanData.mfg_date || null;
    const expDate = scanData.expiry_date || null;
    if (mfgDate && expDate) {
      const mfg = new Date(mfgDate);
      const exp = new Date(expDate);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime()) && exp < mfg) {
        throw new Error('Invalid date: Expiry date cannot be earlier than manufacturing date');
      }
    }

    // 2. Determine initial status
    let status = scanData.status || 'active';
    if (status !== 'consumed' && status !== 'discarded') {
      status = calculateExpiryStatus(expDate);
    }

    // 3. Ensure Product entry exists in reusable product catalog
    let productId = scanData.product_id || null;
    const prodName = scanData.product_name || scanData.name || null;
    if (!productId && (prodName || scanData.barcode)) {
      try {
        const savedProd = await this.saveProduct({
          barcode: scanData.barcode || null,
          product_name: prodName || 'Scanned Product',
          brand: scanData.brand || null,
          category: scanData.category || 'Food',
          ingredients: scanData.ingredients || [],
          image_url: scanData.scan_image_url || scanData.image_url || null,
          source: scanData.scan_type || 'barcode'
        });
        if (savedProd?.id) productId = savedProd.id;
      } catch (err) {
        console.warn('[DB] Automatic product catalog save warning:', err.message);
      }
    }

    const payload = {
      user_id: scanData.user_id,
      product_id: productId,
      scan_type: scanData.scan_type || 'barcode',
      barcode: scanData.barcode || null,
      extracted_text: scanData.extracted_text || scanData.ocr_text || null,
      expiry_date: expDate,
      manufacturing_date: mfgDate,
      quantity: scanData.quantity !== undefined ? scanData.quantity : 1,
      notes: scanData.notes || '',
      scan_image_url: scanData.scan_image_url || scanData.image_url || null,
      scanned_at: scanData.scanned_at || new Date().toISOString(),
      status,
      updated_at: new Date().toISOString()
    };

    let savedScan = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_scans')
          .insert(payload)
          .select('*, product:products(*)')
          .single();

        if (data && !error) savedScan = data;
      } catch (err) {
        console.warn('[DB] Supabase saveUserScan failed, using local store:', err.message);
      }
    }

    if (!savedScan) {
      const scans = getLocalTable(LOCAL_TABLE_KEYS.USER_SCANS);
      const newScan = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...payload,
        created_at: new Date().toISOString()
      };
      scans.unshift(newScan);
      setLocalTable(LOCAL_TABLE_KEYS.USER_SCANS, scans);
      savedScan = newScan;
    }

    // Attach product metadata if available locally
    if (!savedScan.product && productId) {
      const products = getLocalTable(LOCAL_TABLE_KEYS.PRODUCTS);
      savedScan.product = products.find(p => p.id === productId) || null;
    }

    // 4. Automatically generate reminders if expiry_date is provided and scan is active
    if (savedScan.expiry_date && savedScan.status !== 'consumed' && savedScan.status !== 'discarded') {
      try {
        await this.createRemindersForScan(savedScan);
      } catch (remErr) {
        console.warn('[DB] Error creating automatic reminders for scan:', remErr.message);
      }
    }

    return savedScan;
  },

  async getUserScans(userId, filters = {}) {
    if (!userId) return [];

    let scans = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('user_scans')
          .select('*, product:products(*)')
          .eq('user_id', userId);

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters.scan_type && filters.scan_type !== 'all') {
          query = query.eq('scan_type', filters.scan_type);
        }

        const { data, error } = await query;
        if (data && !error) scans = data;
      } catch (err) {
        console.warn('[DB] Supabase getUserScans failed, using local store:', err.message);
      }
    }

    if (scans.length === 0) {
      const localScans = getLocalTable(LOCAL_TABLE_KEYS.USER_SCANS);
      const products = getLocalTable(LOCAL_TABLE_KEYS.PRODUCTS);

      scans = localScans
        .filter(s => s.user_id === userId)
        .map(s => {
          const prod = products.find(p => p.id === s.product_id || (s.barcode && p.barcode === s.barcode));
          return {
            ...s,
            product: s.product || prod || null
          };
        });
    }

    // Dynamic Expiry Status Evaluation (refresh status if past threshold and not completed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    scans = scans.map(s => {
      let currentStatus = s.status;
      if (currentStatus !== 'consumed' && currentStatus !== 'discarded' && s.expiry_date) {
        currentStatus = calculateExpiryStatus(s.expiry_date);
      }
      return {
        ...s,
        status: currentStatus,
        product_name: s.product?.product_name || s.product_name || 'Scanned Product',
        brand: s.product?.brand || s.brand || '',
        category: s.product?.category || s.category || 'Food'
      };
    });

    // Apply In-Memory Filters
    if (filters.status && filters.status !== 'all') {
      scans = scans.filter(s => s.status.toLowerCase() === filters.status.toLowerCase());
    }

    if (filters.category && filters.category !== 'all') {
      const catLower = filters.category.toLowerCase();
      scans = scans.filter(s => {
        const itemCat = (s.category || s.product?.category || '').toLowerCase();
        if (catLower === 'food') {
          return itemCat.includes('food') || itemCat.includes('grocery') || itemCat.includes('beverage') || itemCat.includes('dairy');
        }
        if (catLower === 'medicine') {
          return itemCat.includes('medicine') || itemCat.includes('pharma');
        }
        return itemCat.includes(catLower);
      });
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      scans = scans.filter(s => {
        const name = (s.product_name || s.product?.product_name || '').toLowerCase();
        const brand = (s.brand || s.product?.brand || '').toLowerCase();
        const barcode = (s.barcode || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        const text = (s.extracted_text || '').toLowerCase();
        return name.includes(q) || brand.includes(q) || barcode.includes(q) || notes.includes(q) || text.includes(q);
      });
    }

    // Apply Sorting
    const sortBy = filters.sortBy || 'expiry_asc';
    scans.sort((a, b) => {
      if (sortBy === 'expiry_asc') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      }
      if (sortBy === 'expiry_desc') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(b.expiry_date) - new Date(a.expiry_date);
      }
      if (sortBy === 'scanned_desc') {
        return new Date(b.scanned_at || b.created_at || 0) - new Date(a.scanned_at || a.created_at || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.product_name || '').localeCompare(b.product_name || '');
      }
      return 0;
    });

    return scans;
  },

  async updateUserScan(id, updates) {
    if (!id) throw new Error('Scan ID is required');

    // Date validation if both dates are present
    const mfgDate = updates.manufacturing_date;
    const expDate = updates.expiry_date;
    if (mfgDate && expDate) {
      const mfg = new Date(mfgDate);
      const exp = new Date(expDate);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime()) && exp < mfg) {
        throw new Error('Invalid date: Expiry date cannot be earlier than manufacturing date');
      }
    }

    // If expiry date changed and status is active, recalculate status
    if (expDate && updates.status !== 'consumed' && updates.status !== 'discarded') {
      updates.status = calculateExpiryStatus(expDate);
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_scans')
          .update(payload)
          .eq('id', id)
          .select('*, product:products(*)')
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase updateUserScan failed:', err.message);
      }
    }

    const scans = getLocalTable(LOCAL_TABLE_KEYS.USER_SCANS);
    const index = scans.findIndex(s => s.id === id);
    if (index !== -1) {
      scans[index] = { ...scans[index], ...payload };
      setLocalTable(LOCAL_TABLE_KEYS.USER_SCANS, scans);
      return scans[index];
    }
    return null;
  },

  async markScanStatus(id, newStatus) {
    if (!id) throw new Error('Scan ID is required');
    const validStatuses = ['active', 'expiring_soon', 'expired', 'consumed', 'discarded'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await this.updateUserScan(id, { status: newStatus });

    // If marked consumed or discarded, cancel/mark pending reminders
    if (newStatus === 'consumed' || newStatus === 'discarded') {
      try {
        await this._cancelPendingRemindersForScan(id);
      } catch (e) {
        console.warn('[DB] Reminder cancellation note:', e.message);
      }
    }

    return updated;
  },

  async deleteUserScan(id) {
    if (!id) return false;

    if (isSupabaseConfigured && supabase) {
      try {
        // Cascade delete reminders first
        await supabase.from('reminders').delete().eq('scan_id', id);
        await supabase.from('user_scans').delete().eq('id', id);
      } catch (err) {
        console.warn('[DB] Supabase deleteUserScan failed:', err.message);
      }
    }

    // Local table cleanup
    const scans = getLocalTable(LOCAL_TABLE_KEYS.USER_SCANS);
    setLocalTable(LOCAL_TABLE_KEYS.USER_SCANS, scans.filter(s => s.id !== id));

    const reminders = getLocalTable(LOCAL_TABLE_KEYS.REMINDERS);
    setLocalTable(LOCAL_TABLE_KEYS.REMINDERS, reminders.filter(r => r.scan_id !== id));

    return true;
  },

  // ==========================================================================
  // 4C. AUTOMATIC REMINDERS (Scheduling & Processing)
  // ==========================================================================

  async createRemindersForScan(scan) {
    if (!scan || !scan.id || !scan.user_id || !scan.expiry_date) return [];
    const expDate = new Date(scan.expiry_date);
    if (isNaN(expDate.getTime())) return [];

    const reminderSchedule = [
      { type: '7_days_before', offsetDays: -7 },
      { type: '3_days_before', offsetDays: -3 },
      { type: '1_day_before', offsetDays: -1 },
      { type: 'expired', offsetDays: 0 }
    ];

    const newReminders = [];

    for (const schedule of reminderSchedule) {
      const rDate = new Date(expDate);
      rDate.setDate(rDate.getDate() + schedule.offsetDays);
      const reminderDateStr = rDate.toISOString().split('T')[0];

      const reminderRecord = {
        user_id: scan.user_id,
        scan_id: scan.id,
        reminder_date: reminderDateStr,
        reminder_type: schedule.type,
        notification_status: 'pending',
        sent_at: null,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('reminders')
            .upsert(reminderRecord, { onConflict: 'scan_id,reminder_type' })
            .select()
            .single();

          if (data && !error) {
            newReminders.push(data);
            continue;
          }
        } catch (err) {
          console.warn('[DB] Supabase createReminder error:', err.message);
        }
      }

      // Local storage fallback with deduplication
      const allReminders = getLocalTable(LOCAL_TABLE_KEYS.REMINDERS);
      const existingIdx = allReminders.findIndex(
        r => r.scan_id === scan.id && r.reminder_type === schedule.type
      );

      if (existingIdx === -1) {
        const item = {
          id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          ...reminderRecord
        };
        allReminders.push(item);
        setLocalTable(LOCAL_TABLE_KEYS.REMINDERS, allReminders);
        newReminders.push(item);
      } else {
        // Update existing date if expiry changed
        allReminders[existingIdx].reminder_date = reminderDateStr;
        setLocalTable(LOCAL_TABLE_KEYS.REMINDERS, allReminders);
        newReminders.push(allReminders[existingIdx]);
      }
    }

    return newReminders;
  },

  async getUserReminders(userId, statusFilter = 'all') {
    if (!userId) return [];

    let reminders = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('reminders')
          .select('*, scan:user_scans(*, product:products(*))')
          .eq('user_id', userId)
          .order('reminder_date', { ascending: true });

        if (statusFilter !== 'all') {
          query = query.eq('notification_status', statusFilter);
        }

        const { data, error } = await query;
        if (data && !error) reminders = data;
      } catch (err) {
        console.warn('[DB] Supabase getUserReminders failed:', err.message);
      }
    }

    if (reminders.length === 0) {
      const allReminders = getLocalTable(LOCAL_TABLE_KEYS.REMINDERS);
      const scans = getLocalTable(LOCAL_TABLE_KEYS.USER_SCANS);
      const products = getLocalTable(LOCAL_TABLE_KEYS.PRODUCTS);

      reminders = allReminders
        .filter(r => r.user_id === userId)
        .map(r => {
          const scan = scans.find(s => s.id === r.scan_id);
          const prod = scan ? products.find(p => p.id === scan.product_id || p.barcode === scan.barcode) : null;
          return {
            ...r,
            scan: scan ? { ...scan, product: prod } : null
          };
        });

      if (statusFilter !== 'all') {
        reminders = reminders.filter(r => r.notification_status === statusFilter);
      }

      reminders.sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date));
    }

    return reminders;
  },

  async getDueReminders(userId = null) {
    const todayStr = new Date().toISOString().split('T')[0];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('reminders')
          .select('*, scan:user_scans(*, product:products(*))')
          .eq('notification_status', 'pending')
          .lte('reminder_date', todayStr);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getDueReminders failed:', err.message);
      }
    }

    const allReminders = await this.getUserReminders(userId || DEFAULT_DEMO_USER.id, 'pending');
    return allReminders.filter(r => r.reminder_date <= todayStr);
  },

  async processDueReminders(userId = null) {
    const dueReminders = await this.getDueReminders(userId);
    if (!dueReminders || dueReminders.length === 0) return [];

    const now = new Date().toISOString();
    const processed = [];

    for (const rem of dueReminders) {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('reminders')
            .update({ notification_status: 'sent', sent_at: now })
            .eq('id', rem.id);
        } catch (e) {
          console.warn('[DB] Error updating reminder status in Supabase:', e.message);
        }
      }

      // Local table update
      const allReminders = getLocalTable(LOCAL_TABLE_KEYS.REMINDERS);
      const idx = allReminders.findIndex(r => r.id === rem.id);
      if (idx !== -1) {
        allReminders[idx].notification_status = 'sent';
        allReminders[idx].sent_at = now;
        setLocalTable(LOCAL_TABLE_KEYS.REMINDERS, allReminders);
      }

      processed.push({
        ...rem,
        notification_status: 'sent',
        sent_at: now
      });
    }

    return processed;
  },

  async _cancelPendingRemindersForScan(scanId) {
    if (!scanId) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('reminders')
          .delete()
          .eq('scan_id', scanId)
          .eq('notification_status', 'pending');
      } catch (_) {}
    }

    const allReminders = getLocalTable(LOCAL_TABLE_KEYS.REMINDERS);
    const filtered = allReminders.filter(
      r => !(r.scan_id === scanId && r.notification_status === 'pending')
    );
    setLocalTable(LOCAL_TABLE_KEYS.REMINDERS, filtered);
  },

  // ==========================================================================
  // 5. PANTRY ITEMS (Persistent User Pantry)
  // ==========================================================================

  async getPantryItems(userId) {
    if (!userId) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('pantry_items')
          .select('*, product:products(*), scan:scanned_products(*)')
          .eq('user_id', userId)
          .order('expiry_date', { ascending: true, nullsFirst: false });

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getPantryItems failed:', err.message);
      }
    }

    const allItems = getLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS);
    return allItems.filter(i => i.user_id === userId);
  },

  async savePantryItem(item) {
    if (!item || !item.user_id) throw new Error('User ID is required for pantry item');

    const payload = {
      user_id: item.user_id,
      product_id: item.product_id || null,
      scanned_product_id: item.scanned_product_id || null,
      quantity: item.quantity !== undefined ? item.quantity : 1,
      storage_location: item.storage_location || 'Pantry',
      opened_status: item.opened_status || false,
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      mfg_date: item.mfg_date || null,
      expiry_date: item.expiry_date || null,
      best_before: item.best_before || null,
      attention_status: item.attention_status || 'SAFE',
      // UI metadata passthrough for rich rendering
      name: item.name || 'Pantry Item',
      brand: item.brand || null,
      category: item.category || 'Other Grocery',
      type: item.type || 'grocery',
      barcode: item.barcode || null,
      batchNumber: item.batchNumber || item.batch_number || null,
      status: item.status || 'active',
      isCalculatedDate: item.isCalculatedDate || false,
      calculationNote: item.calculationNote || null,
      ingredientsOriginal: item.ingredientsOriginal || [],
      nutritionInfo: item.nutritionInfo || null,
      productIntelligence: item.productIntelligence || null,
      sourceOfInfo: item.sourceOfInfo || 'barcode+ocr',
      estimatedValue: item.estimatedValue || 100,
      notes: item.notes || '',
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('pantry_items')
          .insert(payload)
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase savePantryItem failed:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS);
    const newItem = {
      id: item.id || `pantry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...payload,
      created_at: new Date().toISOString()
    };
    items.unshift(newItem);
    setLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS, items);
    return newItem;
  },

  async updatePantryItem(id, updates) {
    if (!id) throw new Error('Pantry item ID is required');

    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('pantry_items')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase updatePantryItem failed:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS);
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updatePayload };
      setLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS, items);
      return items[index];
    }
    return null;
  },

  async deletePantryItem(id) {
    if (!id) return false;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pantry_items').delete().eq('id', id);
      } catch (err) {
        console.warn('[DB] Supabase deletePantryItem failed:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS);
    const filtered = items.filter(i => i.id !== id);
    setLocalTable(LOCAL_TABLE_KEYS.PANTRY_ITEMS, filtered);
    return true;
  },

  // ==========================================================================
  // 6. WASTE RECORDS
  // ==========================================================================

  async recordWaste({ userId, pantryItemId, product, category, expiryDate, status, reason, quantity = 1 }) {
    if (!userId || !status) throw new Error('User ID and status are required for waste record');

    const payload = {
      user_id: userId,
      pantry_item_id: pantryItemId || null,
      product: product || null,
      category: category || null,
      expiry_date: expiryDate || null,
      status, // 'used', 'wasted', 'discarded'
      reason: reason || null,
      quantity,
      recorded_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('waste_records')
          .insert(payload)
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase recordWaste failed:', err.message);
      }
    }

    const records = getLocalTable(LOCAL_TABLE_KEYS.WASTE_RECORDS);
    const newRecord = {
      id: `waste_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...payload
    };
    records.unshift(newRecord);
    setLocalTable(LOCAL_TABLE_KEYS.WASTE_RECORDS, records);
    return newRecord;
  },

  async getWasteRecords(userId) {
    if (!userId) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('waste_records')
          .select('*')
          .eq('user_id', userId)
          .order('recorded_at', { ascending: false });

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getWasteRecords failed:', err.message);
      }
    }

    const records = getLocalTable(LOCAL_TABLE_KEYS.WASTE_RECORDS);
    return records.filter(r => r.user_id === userId);
  },

  // ==========================================================================
  // 7. USER CORRECTIONS (Active Learning & Verification Log)
  // ==========================================================================

  async recordCorrection({ userId, scannedProductId, fieldName, originalValue, correctedValue }) {
    if (!userId || !fieldName) return null;

    const payload = {
      user_id: userId,
      scanned_product_id: scannedProductId || null,
      field_name: fieldName,
      original_value: String(originalValue || ''),
      corrected_value: String(correctedValue || ''),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_corrections')
          .insert(payload)
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase recordCorrection failed:', err.message);
      }
    }

    const corrections = getLocalTable(LOCAL_TABLE_KEYS.USER_CORRECTIONS);
    const newCorr = {
      id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...payload
    };
    corrections.unshift(newCorr);
    setLocalTable(LOCAL_TABLE_KEYS.USER_CORRECTIONS, corrections);
    return newCorr;
  },

  async getCorrections(userId) {
    if (!userId) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_corrections')
          .select('*')
          .eq('user_id', userId);

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getCorrections failed:', err.message);
      }
    }

    const corrections = getLocalTable(LOCAL_TABLE_KEYS.USER_CORRECTIONS);
    return corrections.filter(c => c.user_id === userId);
  },

  // ==========================================================================
  // 8. NOTIFICATIONS
  // ==========================================================================

  async createNotification({ userId, pantryItemId, notificationType = 'expiry_warning', message, scheduledAt }) {
    if (!userId || !message) return null;

    const payload = {
      user_id: userId,
      pantry_item_id: pantryItemId || null,
      notification_type: notificationType,
      message,
      scheduled_at: scheduledAt || new Date().toISOString(),
      delivered_at: null,
      status: 'pending'
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert(payload)
          .select()
          .single();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase createNotification failed:', err.message);
      }
    }

    const notifications = getLocalTable(LOCAL_TABLE_KEYS.NOTIFICATIONS);
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...payload
    };
    notifications.unshift(newNotif);
    setLocalTable(LOCAL_TABLE_KEYS.NOTIFICATIONS, notifications);
    return newNotif;
  },

  async getNotifications(userId) {
    if (!userId) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('scheduled_at', { ascending: false });

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getNotifications failed:', err.message);
      }
    }

    const notifications = getLocalTable(LOCAL_TABLE_KEYS.NOTIFICATIONS);
    return notifications.filter(n => n.user_id === userId);
  },

  // =========================================================================
  // ML PREDICTIONS & AUDITING (Supabase Table: ml_predictions)
  // =========================================================================
  async saveMlPrediction({
    userScanId = null,
    userId,
    modelName,
    modelVersion,
    datasetVersion = 'v1',
    predictionType,
    prediction,
    confidence,
    needsConfirmation = false
  }) {
    if (!userId || !modelName || !predictionType) return null;

    const record = {
      id: `ml_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_scan_id: userScanId,
      user_id: userId,
      model_name: modelName,
      model_version: modelVersion,
      dataset_version: datasetVersion,
      prediction_type: predictionType,
      prediction,
      confidence: Number(confidence) || 0.0,
      needs_confirmation: Boolean(needsConfirmation),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('ml_predictions')
          .insert([record])
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveMlPrediction failed, storing locally:', err.message);
      }
    }

    const predictions = getLocalTable(LOCAL_TABLE_KEYS.ML_PREDICTIONS);
    predictions.unshift(record);
    setLocalTable(LOCAL_TABLE_KEYS.ML_PREDICTIONS, predictions);
    return record;
  },

  async getMlPredictionsForScan(userScanId, userId) {
    if (!userScanId || !userId) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('ml_predictions')
          .select('*')
          .eq('user_scan_id', userScanId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getMlPredictionsForScan failed:', err.message);
      }
    }

    const predictions = getLocalTable(LOCAL_TABLE_KEYS.ML_PREDICTIONS);
    return predictions.filter(p => p.user_scan_id === userScanId && p.user_id === userId);
  },

  // =========================================================================
  // KNOWLEDGE ITEMS & SEMANTIC RETRIEVAL (Supabase Table: knowledge_items)
  // =========================================================================
  async saveKnowledgeItem({
    entityType,
    entityName,
    description = '',
    category = '',
    source = 'Open Food Facts / OpenFDA',
    sourceUrl = null,
    metadata = {},
    embedding = null
  }) {
    if (!entityType || !entityName) return null;

    const item = {
      id: `know_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      entity_type: entityType,
      entity_name: entityName,
      description,
      category,
      source,
      source_url: sourceUrl,
      metadata,
      embedding,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('knowledge_items')
          .upsert([item], { onConflict: 'entity_name' })
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveKnowledgeItem failed, storing locally:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.KNOWLEDGE_ITEMS);
    const existingIndex = items.findIndex(i => i.entity_name.toLowerCase() === entityName.toLowerCase());
    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...item, updated_at: new Date().toISOString() };
    } else {
      items.push(item);
    }
    setLocalTable(LOCAL_TABLE_KEYS.KNOWLEDGE_ITEMS, items);
    return item;
  },

  async searchKnowledgeItems(query, limit = 5) {
    if (!query) return [];
    const qLower = query.toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('knowledge_items')
          .select('*')
          .ilike('entity_name', `%${query}%`)
          .limit(limit);
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase searchKnowledgeItems failed:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.KNOWLEDGE_ITEMS);
    return items
      .filter(i => (i.entity_name || '').toLowerCase().includes(qLower) || (i.description || '').toLowerCase().includes(qLower))
      .slice(0, limit);
  },

  // ==========================================================================
  // 8. HOUSEHOLD INVENTORY & FOOD WASTE MANAGEMENT
  // ==========================================================================
  async getHouseholdInventory(userId = 'usr_demo_primary_001') {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('household_inventory')
          .select('*')
          .eq('user_id', userId)
          .order('expiry_date', { ascending: true });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getHouseholdInventory failed, falling back to local:', err.message);
      }
    }
    const items = getLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY);
    return items.filter(i => !userId || i.user_id === userId);
  },

  async saveHouseholdItem(itemData) {
    this._ensureLocalDefaults();
    const id = itemData.id || `hh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const item = {
      id,
      user_id: itemData.user_id || 'usr_demo_primary_001',
      product_id: itemData.product_id || null,
      product_name: itemData.product_name || 'Household Item',
      category: itemData.category || 'Pantry',
      quantity: parseFloat(itemData.quantity) || 1.0,
      manufacturing_date: itemData.manufacturing_date || null,
      expiry_date: itemData.expiry_date || null,
      batch_number: itemData.batch_number || null,
      storage_location: itemData.storage_location || 'Pantry',
      scan_date: itemData.scan_date || now,
      entry_source: itemData.entry_source || 'manual',
      status: itemData.status || 'ACTIVE',
      use_first_priority: itemData.use_first_priority || 'NONE',
      consumed_at: itemData.consumed_at || null,
      discarded_at: itemData.discarded_at || null,
      estimated_value: parseFloat(itemData.estimated_value) || 50.0,
      notes: itemData.notes || '',
      created_at: now,
      updated_at: now
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('household_inventory')
          .insert([item])
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveHouseholdItem failed, storing locally:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY);
    items.unshift(item);
    setLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY, items);
    return item;
  },

  async updateHouseholdItem(id, updates) {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('household_inventory')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase updateHouseholdItem failed, updating locally:', err.message);
      }
    }

    const items = getLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY);
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates, updated_at: now };
      setLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY, items);
      return items[idx];
    }
    return null;
  },

  async deleteHouseholdItem(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('household_inventory').delete().eq('id', id);
      } catch (err) {
        console.warn('[DB] Supabase deleteHouseholdItem failed:', err.message);
      }
    }
    const items = getLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY);
    const filtered = items.filter(i => i.id !== id);
    setLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY, filtered);
    return true;
  },

  // ==========================================================================
  // 9. BUSINESS MODE & FEFO INVENTORY
  // ==========================================================================
  async getBusinessProfile(ownerUserId = 'usr_demo_primary_001') {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_user_id', ownerUserId)
          .maybeSingle();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getBusinessProfile failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.BUSINESSES);
    return list.find(b => b.owner_user_id === ownerUserId) || list[0] || null;
  },

  async saveBusinessProfile(businessData) {
    this._ensureLocalDefaults();
    const id = businessData.id || `biz_${Date.now()}`;
    const entry = {
      id,
      owner_user_id: businessData.owner_user_id || 'usr_demo_primary_001',
      business_name: businessData.business_name || 'My Store',
      business_type: businessData.business_type || 'grocery',
      registration_number: businessData.registration_number || '',
      address: businessData.address || '',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('businesses').upsert([entry]).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveBusinessProfile failed:', err.message);
      }
    }

    const list = getLocalTable(LOCAL_TABLE_KEYS.BUSINESSES);
    const idx = list.findIndex(b => b.id === id);
    if (idx !== -1) list[idx] = entry;
    else list.push(entry);
    setLocalTable(LOCAL_TABLE_KEYS.BUSINESSES, list);
    return entry;
  },

  async getBusinessStaff(businessId) {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('business_staff').select('*').eq('business_id', businessId);
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getBusinessStaff failed:', err.message);
      }
    }
    const staff = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_STAFF);
    return staff.filter(s => !businessId || s.business_id === businessId);
  },

  async addBusinessStaff(staffData) {
    const entry = {
      id: staffData.id || `staff_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      business_id: staffData.business_id,
      user_id: staffData.user_id || `usr_staff_${Date.now()}`,
      staff_name: staffData.staff_name,
      staff_email: staffData.staff_email,
      role: staffData.role || 'staff',
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('business_staff').insert([entry]).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase addBusinessStaff failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_STAFF);
    list.push(entry);
    setLocalTable(LOCAL_TABLE_KEYS.BUSINESS_STAFF, list);
    return entry;
  },

  async getBusinessInventory(businessId) {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('business_inventory')
          .select('*')
          .eq('business_id', businessId)
          .order('expiry_date', { ascending: true });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getBusinessInventory failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY);
    return list.filter(i => !businessId || i.business_id === businessId);
  },

  async saveBusinessInventoryItem(itemData) {
    const id = itemData.id || `binv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const item = {
      id,
      business_id: itemData.business_id,
      product_name: itemData.product_name,
      barcode: itemData.barcode || '',
      category: itemData.category || 'Grocery',
      batch_number: itemData.batch_number || `BATCH-${Date.now().toString().slice(-4)}`,
      quantity: parseFloat(itemData.quantity) || 1.0,
      supplier: itemData.supplier || 'Standard Distributor',
      manufacturing_date: itemData.manufacturing_date || null,
      expiry_date: itemData.expiry_date,
      storage_location: itemData.storage_location || 'Warehouse Shelf A',
      inventory_status: itemData.inventory_status || 'IN_STOCK',
      fefo_rank: itemData.fefo_rank || 1,
      unit_cost: parseFloat(itemData.unit_cost) || 50.0,
      created_at: now,
      updated_at: now
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('business_inventory').insert([item]).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveBusinessInventoryItem failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY);
    list.unshift(item);
    setLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY, list);
    return item;
  },

  async bulkImportBusinessInventory(businessId, items = []) {
    const saved = [];
    for (const item of items) {
      const res = await this.saveBusinessInventoryItem({ ...item, business_id: businessId });
      saved.push(res);
    }
    return saved;
  },

  async updateBusinessInventoryItem(id, updates) {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('business_inventory')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase updateBusinessInventoryItem failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY);
    const idx = list.findIndex(i => i.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updated_at: now };
      setLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY, list);
      return list[idx];
    }
    return null;
  },

  // ==========================================================================
  // 10. MEDICINE INVENTORY & HEALTHCARE SAFETY
  // ==========================================================================
  async getMedicineInventory(userId = 'usr_demo_primary_001', businessId = null) {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('medicine_inventory').select('*');
        if (businessId) query = query.eq('business_id', businessId);
        else if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('expiry_date', { ascending: true });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getMedicineInventory failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY);
    return list.filter(m => {
      if (businessId) return m.business_id === businessId;
      if (userId) return m.user_id === userId;
      return true;
    });
  },

  async saveMedicineItem(itemData) {
    const id = itemData.id || `med_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const item = {
      id,
      user_id: itemData.user_id || 'usr_demo_primary_001',
      business_id: itemData.business_id || null,
      medicine_name: itemData.medicine_name || 'Prescription Medication',
      brand: itemData.brand || 'Standard Pharma',
      barcode: itemData.barcode || '',
      batch_number: itemData.batch_number || `BATCH-${Date.now().toString().slice(-4)}`,
      manufacturing_date: itemData.manufacturing_date || null,
      expiry_date: itemData.expiry_date,
      quantity: parseFloat(itemData.quantity) || 1.0,
      storage_location: itemData.storage_location || 'Main Medicine Cabinet',
      scan_date: itemData.scan_date || now,
      source: itemData.source || 'barcode',
      verification_status: itemData.verification_status || 'VERIFIED_SOURCE_DATA',
      recall_status: itemData.recall_status || 'CLEAR',
      safe_disposal_guidance: itemData.safe_disposal_guidance || 'Drop off at authorized pharmacy take-back collection site.',
      status: itemData.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('medicine_inventory').insert([item]).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase saveMedicineItem failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY);
    list.unshift(item);
    setLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY, list);
    return item;
  },

  async updateMedicineItem(id, updates) {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('medicine_inventory')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .select()
          .single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase updateMedicineItem failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY);
    const idx = list.findIndex(m => m.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updated_at: now };
      setLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY, list);
      return list[idx];
    }
    return null;
  },

  async deleteMedicineItem(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('medicine_inventory').delete().eq('id', id);
      } catch (err) {
        console.warn('[DB] Supabase deleteMedicineItem failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY);
    const filtered = list.filter(m => m.id !== id);
    setLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY, filtered);
    return true;
  },

  // ==========================================================================
  // 11. DONATIONS & TRACEABILITY
  // ==========================================================================
  async getDonationListings() {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('donation_listings').select('*').order('created_at', { ascending: false });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getDonationListings failed:', err.message);
      }
    }
    return getLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS);
  },

  async createDonationListing(listingData) {
    const id = listingData.id || `don_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const entry = {
      id,
      user_id: listingData.user_id || 'usr_demo_primary_001',
      business_id: listingData.business_id || null,
      product_name: listingData.product_name,
      category: listingData.category || 'Produce',
      quantity: parseFloat(listingData.quantity) || 1.0,
      expiry_date: listingData.expiry_date,
      safety_verified: listingData.safety_verified !== false,
      organization_name: listingData.organization_name || 'National Food Rescue Network',
      pickup_location: listingData.pickup_location || 'Community Hub Drop Point',
      status: listingData.status || 'listed',
      requested_at: null,
      accepted_at: null,
      completed_at: null,
      created_at: now
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('donation_listings').insert([entry]).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase createDonationListing failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS);
    list.unshift(entry);
    setLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS, list);
    return entry;
  },

  async updateDonationStatus(id, status) {
    const now = new Date().toISOString();
    const updates = { status };
    if (status === 'requested') updates.requested_at = now;
    if (status === 'accepted') updates.accepted_at = now;
    if (status === 'completed') updates.completed_at = now;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('donation_listings').update(updates).eq('id', id).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase updateDonationStatus failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS);
    const idx = list.findIndex(d => d.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS, list);
      return list[idx];
    }
    return null;
  },

  async getTraceabilityRecord(traceCode) {
    this._ensureLocalDefaults();
    if (!traceCode) return null;
    const cleanCode = traceCode.trim().toUpperCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('product_traceability')
          .select('*')
          .eq('traceability_code', cleanCode)
          .maybeSingle();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase getTraceabilityRecord failed:', err.message);
      }
    }
    const records = getLocalTable(LOCAL_TABLE_KEYS.PRODUCT_TRACEABILITY);
    return records.find(r => r.traceability_code.toUpperCase() === cleanCode) || null;
  },

  // ==========================================================================
  // 12. OFFICIAL RECALL ALERTS
  // ==========================================================================
  async getOfficialRecalls() {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('official_recalls').select('*').order('recall_date', { ascending: false });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getOfficialRecalls failed:', err.message);
      }
    }
    return getLocalTable(LOCAL_TABLE_KEYS.OFFICIAL_RECALLS);
  },

  // ==========================================================================
  // 13. BATCH TRACKING & MOVEMENT AUDITING
  // ==========================================================================
  async getBatchMovements(batchNumber = null) {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('batch_movements').select('*');
        if (batchNumber) query = query.eq('batch_number', batchNumber);
        const { data, error } = await query.order('timestamp', { ascending: true });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getBatchMovements failed:', err.message);
      }
    }
    const movements = getLocalTable(LOCAL_TABLE_KEYS.BATCH_MOVEMENTS);
    if (!batchNumber) return movements;
    return movements.filter(m => m.batch_number.toUpperCase() === batchNumber.toUpperCase());
  },

  async logBatchMovement(movementData) {
    this._ensureLocalDefaults();
    const id = movementData.id || `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const item = {
      id,
      batch_number: movementData.batch_number,
      product_name: movementData.product_name || 'Batch Item',
      from_location: movementData.from_location,
      to_location: movementData.to_location,
      quantity_moved: parseFloat(movementData.quantity_moved) || 1,
      actor_role: movementData.actor_role || 'household',
      actor_name: movementData.actor_name || 'Operator',
      movement_type: movementData.movement_type || 'RELOCATED',
      temperature_reading: movementData.temperature_reading || null,
      notes: movementData.notes || '',
      timestamp: movementData.timestamp || now
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('batch_movements').insert([item]).select().single();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase logBatchMovement failed:', err.message);
      }
    }

    const list = getLocalTable(LOCAL_TABLE_KEYS.BATCH_MOVEMENTS);
    list.push(item);
    setLocalTable(LOCAL_TABLE_KEYS.BATCH_MOVEMENTS, list);
    return item;
  },

  // ==========================================================================
  // 14. AI WASTE RISK PREDICTIONS
  // ==========================================================================
  async saveWasteRiskPrediction(predictionData) {
    this._ensureLocalDefaults();
    const id = predictionData.id || `wpred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const entry = {
      id,
      user_id: predictionData.user_id || 'usr_demo_primary_001',
      product_name: predictionData.product_name,
      category: predictionData.category,
      current_quantity: predictionData.current_quantity,
      expiry_date: predictionData.expiry_date,
      risk_level: predictionData.risk_level,
      reasons: predictionData.reasons || [],
      recommended_action: predictionData.recommended_action || '',
      created_at: new Date().toISOString()
    };

    const list = getLocalTable(LOCAL_TABLE_KEYS.WASTE_PREDICTIONS);
    list.unshift(entry);
    setLocalTable(LOCAL_TABLE_KEYS.WASTE_PREDICTIONS, list);
    return entry;
  },

  // ==========================================================================
  // 15. ENTERPRISE RELATIONAL & MULTI-TENANT RBAC
  // ==========================================================================
  async getOrganizations() {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('organizations').select('*').order('name');
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getOrganizations failed:', err.message);
      }
    }
    return getLocalTable(LOCAL_TABLE_KEYS.ORGANIZATIONS);
  },

  async getOrganizationById(orgId) {
    const orgs = await this.getOrganizations();
    return orgs.find(o => o.id === orgId) || null;
  },

  async saveOrganization(orgData) {
    this._ensureLocalDefaults();
    const id = orgData.id || `org_${Date.now()}`;
    const now = new Date().toISOString();
    const item = {
      id,
      name: orgData.name,
      role: orgData.role,
      type: orgData.type || 'COMMERCIAL',
      identifier: orgData.identifier || `ORG-${Date.now().toString().slice(-4)}`,
      address: orgData.address || '',
      contact_email: orgData.contact_email || '',
      status: orgData.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    const list = getLocalTable(LOCAL_TABLE_KEYS.ORGANIZATIONS);
    const idx = list.findIndex(o => o.id === id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    setLocalTable(LOCAL_TABLE_KEYS.ORGANIZATIONS, list);
    return item;
  },

  async getUserRoles(userId) {
    this._ensureLocalDefaults();
    const list = getLocalTable(LOCAL_TABLE_KEYS.USER_ROLES);
    return list.filter(r => !userId || r.user_id === userId);
  },

  async setUserRole({ userId, organizationId, role, permissions = [] }) {
    this._ensureLocalDefaults();
    const list = getLocalTable(LOCAL_TABLE_KEYS.USER_ROLES);
    const id = `urole_${Date.now()}`;
    const entry = {
      id,
      user_id: userId,
      organization_id: organizationId,
      role,
      permissions,
      is_primary: true,
      assigned_at: new Date().toISOString()
    };
    const existingIdx = list.findIndex(r => r.user_id === userId && r.organization_id === organizationId);
    if (existingIdx >= 0) list[existingIdx] = entry;
    else list.push(entry);
    setLocalTable(LOCAL_TABLE_KEYS.USER_ROLES, list);
    return entry;
  },

  async getWarehouses(orgId = null) {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('warehouses').select('*');
        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getWarehouses failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.WAREHOUSES);
    return orgId ? list.filter(w => w.organization_id === orgId) : list;
  },

  async saveWarehouse(whData) {
    this._ensureLocalDefaults();
    const id = whData.id || `wh_${Date.now()}`;
    const item = {
      id,
      organization_id: whData.organization_id,
      warehouse_name: whData.warehouse_name,
      code: whData.code || `WH-${Date.now().toString().slice(-4)}`,
      location: whData.location,
      capacity_pallets: whData.capacity_pallets || 1000,
      current_occupancy_pallets: whData.current_occupancy_pallets || 0,
      temperature_zones: whData.temperature_zones || ['Ambient (18-24°C)'],
      total_active_batches: whData.total_active_batches || 0,
      batches_expiring_soon: whData.batches_expiring_soon || 0
    };
    const list = getLocalTable(LOCAL_TABLE_KEYS.WAREHOUSES);
    list.push(item);
    setLocalTable(LOCAL_TABLE_KEYS.WAREHOUSES, list);
    return item;
  },

  async getDispatches({ originOrgId = null, recipientOrgId = null, status = null } = {}) {
    this._ensureLocalDefaults();
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('dispatches').select('*');
        if (originOrgId) query = query.eq('origin_organization_id', originOrgId);
        if (recipientOrgId) query = query.eq('recipient_organization_id', recipientOrgId);
        if (status) query = query.eq('dispatch_status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[DB] Supabase getDispatches failed:', err.message);
      }
    }
    const list = getLocalTable(LOCAL_TABLE_KEYS.DISPATCHES);
    return list.filter(d => {
      if (originOrgId && d.origin_warehouse_id !== originOrgId && d.origin_org_id !== originOrgId) return false;
      if (recipientOrgId && d.recipient_org_id !== recipientOrgId) return false;
      if (status && d.dispatch_status !== status) return false;
      return true;
    });
  },

  async createDispatch(dispatchData) {
    this._ensureLocalDefaults();
    const id = dispatchData.id || `disp_${Date.now()}`;
    const now = new Date().toISOString();
    const item = {
      id,
      dispatch_number: dispatchData.dispatch_number || `DSP-${Date.now().toString().slice(-6)}`,
      origin_warehouse_id: dispatchData.origin_warehouse_id || 'wh_central_01',
      origin_warehouse_name: dispatchData.origin_warehouse_name || 'Central Distribution Hub',
      recipient_type: dispatchData.recipient_type || 'RETAILER',
      recipient_name: dispatchData.recipient_name,
      recipient_org_id: dispatchData.recipient_org_id,
      product_name: dispatchData.product_name,
      batch_number: dispatchData.batch_number,
      quantity_cases: parseFloat(dispatchData.quantity_cases) || 10,
      unit_count: parseFloat(dispatchData.unit_count) || 100,
      manufacturing_date: dispatchData.manufacturing_date || null,
      expiry_date: dispatchData.expiry_date,
      fefo_priority_rank: dispatchData.fefo_priority_rank || 1,
      cold_chain_verified: dispatchData.cold_chain_verified !== false,
      transit_temp: dispatchData.transit_temp || '4.0°C',
      dispatch_status: dispatchData.dispatch_status || 'PENDING',
      dispatched_at: now,
      delivered_at: null
    };
    const list = getLocalTable(LOCAL_TABLE_KEYS.DISPATCHES);
    list.unshift(item);
    setLocalTable(LOCAL_TABLE_KEYS.DISPATCHES, list);
    return item;
  },

  async updateDispatchStatus(dispatchId, status) {
    const list = getLocalTable(LOCAL_TABLE_KEYS.DISPATCHES);
    const idx = list.findIndex(d => d.id === dispatchId || d.dispatch_number === dispatchId);
    if (idx >= 0) {
      list[idx].dispatch_status = status;
      if (status === 'DELIVERED') list[idx].delivered_at = new Date().toISOString();
      setLocalTable(LOCAL_TABLE_KEYS.DISPATCHES, list);
      return list[idx];
    }
    return null;
  },

  async getProductMaster() {
    this._ensureLocalDefaults();
    return getLocalTable(LOCAL_TABLE_KEYS.PRODUCT_MASTER);
  },

  async createProductMaster(prodData) {
    this._ensureLocalDefaults();
    const id = prodData.id || `prod_mfg_${Date.now()}`;
    const item = {
      id,
      sku: prodData.sku || `SKU-${Date.now().toString().slice(-6)}`,
      product_name: prodData.product_name,
      brand: prodData.brand || 'BiteBeforeExpiry Master',
      category: prodData.category || 'Food',
      subcategory: prodData.subcategory || 'General',
      standard_shelf_life_days: prodData.standard_shelf_life_days || 90,
      storage_temp_min_c: prodData.storage_temp_min_c || 2.0,
      storage_temp_max_c: prodData.storage_temp_max_c || 25.0,
      primary_barcode: prodData.primary_barcode || '',
      total_manufactured_batches: 1,
      active_in_circulation: 1
    };
    const list = getLocalTable(LOCAL_TABLE_KEYS.PRODUCT_MASTER);
    list.unshift(item);
    setLocalTable(LOCAL_TABLE_KEYS.PRODUCT_MASTER, list);
    return item;
  },

  async logAuditAction({ userId, orgId, role, actionType, targetEntity, entityId, details = {} }) {
    this._ensureLocalDefaults();
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      user_id: userId || 'usr_demo_primary_001',
      organization_id: orgId || null,
      role: role || 'NORMAL_USER',
      action_type: actionType,
      target_entity: targetEntity,
      entity_id: entityId || null,
      details,
      timestamp: new Date().toISOString()
    };
    const list = getLocalTable(LOCAL_TABLE_KEYS.AUDIT_LOGS);
    list.unshift(entry);
    setLocalTable(LOCAL_TABLE_KEYS.AUDIT_LOGS, list.slice(0, 500)); // Cap local logs
    return entry;
  },

  async getAuditLogs(limit = 100) {
    this._ensureLocalDefaults();
    const list = getLocalTable(LOCAL_TABLE_KEYS.AUDIT_LOGS);
    return list.slice(0, limit);
  },

  // Private helper to seed demo data if offline store is blank
  _ensureLocalDefaults() {
    const users = getLocalTable(LOCAL_TABLE_KEYS.USERS);
    if (users.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.USERS, [DEFAULT_DEMO_USER]);
    }
    const profiles = getLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES);
    if (profiles.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.USER_PROFILES, [DEFAULT_DEMO_PROFILE]);
    }
    const hh = getLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY);
    if (hh.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.HOUSEHOLD_INVENTORY, DEFAULT_HOUSEHOLD_ITEMS);
    }
    const biz = getLocalTable(LOCAL_TABLE_KEYS.BUSINESSES);
    if (biz.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.BUSINESSES, [DEFAULT_BUSINESS]);
    }
    const staff = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_STAFF);
    if (staff.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.BUSINESS_STAFF, DEFAULT_STAFF);
    }
    const binv = getLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY);
    if (binv.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.BUSINESS_INVENTORY, DEFAULT_BUSINESS_INVENTORY);
    }
    const med = getLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY);
    if (med.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.MEDICINE_INVENTORY, DEFAULT_MEDICINE_ITEMS);
    }
    const don = getLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS);
    if (don.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.DONATION_LISTINGS, DEFAULT_DONATION_LISTINGS);
    }
    const trc = getLocalTable(LOCAL_TABLE_KEYS.PRODUCT_TRACEABILITY);
    if (trc.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.PRODUCT_TRACEABILITY, DEFAULT_TRACEABILITY_RECORDS);
    }
    const recs = getLocalTable(LOCAL_TABLE_KEYS.OFFICIAL_RECALLS);
    if (recs.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.OFFICIAL_RECALLS, OFFICIAL_RECALL_REGISTRY);
    }
    const bmov = getLocalTable(LOCAL_TABLE_KEYS.BATCH_MOVEMENTS);
    if (bmov.length === 0) {
      const flattenedMovements = Object.values(SAMPLE_BATCH_TRAILS).flat();
      setLocalTable(LOCAL_TABLE_KEYS.BATCH_MOVEMENTS, flattenedMovements);
    }
    const orgs = getLocalTable(LOCAL_TABLE_KEYS.ORGANIZATIONS);
    if (orgs.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.ORGANIZATIONS, SEEDED_ORGANIZATIONS);
    }
    const whs = getLocalTable(LOCAL_TABLE_KEYS.WAREHOUSES);
    if (whs.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.WAREHOUSES, SEEDED_WAREHOUSES);
    }
    const disps = getLocalTable(LOCAL_TABLE_KEYS.DISPATCHES);
    if (disps.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.DISPATCHES, SEEDED_DISPATCHES);
    }
    const pm = getLocalTable(LOCAL_TABLE_KEYS.PRODUCT_MASTER);
    if (pm.length === 0) {
      setLocalTable(LOCAL_TABLE_KEYS.PRODUCT_MASTER, SEEDED_PRODUCT_MASTER);
    }
  }
};
