-- ============================================================================
-- BiteBeforeExpiry: Production Relational Schema & Backend Architecture
-- Supabase PostgreSQL 15+ Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Maps to Supabase auth.users or functions independently
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2. PROFILES TABLE
-- Fields: id, user_id, full_name, email, created_at, updated_at
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_profiles_user_id UNIQUE (user_id)
);

-- Backward compatibility view/table for user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    dietary_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_language TEXT DEFAULT 'en' NOT NULL,
    notification_preferences JSONB DEFAULT '{
        "lead_days": 3,
        "banner_enabled": true,
        "daily_digest": true,
        "push_notifications": true,
        "category_overrides": {"medicine": 7, "grocery": 3}
    }'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_user_profile_user_id UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE (Reusable Product Knowledge Base)
-- Fields: id, barcode, product_name, brand, category, ingredients, description,
-- image_url, source, created_at, updated_at
-- Category supports: Food, Medicine, Other
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    product_name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'Food' NOT NULL CHECK (category IN ('Food', 'Medicine', 'Other')),
    product_type TEXT DEFAULT 'grocery',
    ingredients JSONB DEFAULT '[]'::JSONB,
    description TEXT,
    nutrition JSONB DEFAULT '{}'::JSONB,
    allergens TEXT[] DEFAULT ARRAY[]::TEXT[],
    image_url TEXT,
    source TEXT DEFAULT 'barcode' NOT NULL, -- 'barcode', 'openfoodfacts', 'openfda', 'manual'
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. USER_SCANS TABLE (Primary User Scans Storage)
-- Fields: id, user_id, product_id, scan_type, barcode, extracted_text,
-- expiry_date, manufacturing_date, quantity, notes, scan_image_url,
-- scanned_at, status, created_at, updated_at
-- scan_type: barcode, OCR, manual
-- status: active, expiring_soon, expired, consumed, discarded
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    scan_type TEXT DEFAULT 'barcode' NOT NULL CHECK (scan_type IN ('barcode', 'OCR', 'manual')),
    barcode TEXT,
    extracted_text TEXT,
    expiry_date DATE,
    manufacturing_date DATE,
    quantity NUMERIC(10, 2) DEFAULT 1.00 NOT NULL,
    notes TEXT,
    scan_image_url TEXT,
    scanned_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'expiring_soon', 'expired', 'consumed', 'discarded')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    -- Data Validation Constraint: Expiry must never be before Manufacturing date
    CONSTRAINT chk_expiry_after_mfg CHECK (
        manufacturing_date IS NULL OR 
        expiry_date IS NULL OR 
        expiry_date >= manufacturing_date
    )
);

-- ----------------------------------------------------------------------------
-- 5. REMINDERS TABLE (Automatic Expiry Notifications)
-- Fields: id, user_id, scan_id, reminder_date, reminder_type,
-- notification_status, sent_at, created_at
-- reminder_type: 7_days_before, 3_days_before, 1_day_before, expired
-- notification_status: pending, sent, failed
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scan_id UUID NOT NULL REFERENCES public.user_scans(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days_before', '3_days_before', '1_day_before', 'expired')),
    notification_status TEXT DEFAULT 'pending' NOT NULL CHECK (notification_status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    -- Prevent duplicate reminders for the same scan & schedule
    CONSTRAINT uq_scan_reminder_schedule UNIQUE (scan_id, reminder_type)
);

-- ----------------------------------------------------------------------------
-- BACKWARD-COMPATIBLE TABLES FOR EXISTING PANTRY & WASTE ANALYTICS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) DEFAULT 1.00 NOT NULL,
    storage_location TEXT DEFAULT 'Pantry' NOT NULL,
    opened_status BOOLEAN DEFAULT FALSE NOT NULL,
    purchase_date DATE DEFAULT CURRENT_DATE,
    mfg_date DATE,
    expiry_date DATE,
    best_before TEXT,
    attention_status TEXT DEFAULT 'SAFE' NOT NULL,
    name TEXT,
    brand TEXT,
    category TEXT,
    type TEXT DEFAULT 'grocery',
    barcode TEXT,
    batch_number TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.waste_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pantry_item_id UUID,
    product TEXT,
    category TEXT,
    expiry_date DATE,
    status TEXT NOT NULL,
    reason TEXT,
    quantity NUMERIC(10, 2) DEFAULT 1.00 NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scanned_product_id UUID,
    field_name TEXT NOT NULL,
    original_value TEXT,
    corrected_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pantry_item_id UUID,
    notification_type TEXT DEFAULT 'expiry_warning' NOT NULL,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' NOT NULL
);

-- ============================================================================
-- PERFORMANCE & QUERY INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_user_scans_user_id ON public.user_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scans_product_id ON public.user_scans(product_id);
CREATE INDEX IF NOT EXISTS idx_user_scans_expiry_date ON public.user_scans(expiry_date);
CREATE INDEX IF NOT EXISTS idx_user_scans_status ON public.user_scans(status);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scan_id ON public.reminders(scan_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON public.reminders(reminder_date, notification_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant user isolation: users only access their own records
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Products: Public read for catalog, authenticated insert/update
DROP POLICY IF EXISTS "Public products read" ON public.products;
CREATE POLICY "Public products read" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated products insert" ON public.products;
CREATE POLICY "Authenticated products insert" ON public.products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated products update" ON public.products;
CREATE POLICY "Authenticated products update" ON public.products
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Profiles: User isolation
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User profiles isolation" ON public.user_profiles;
CREATE POLICY "User profiles isolation" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- 3. User Scans: User isolation
DROP POLICY IF EXISTS "User scans isolation" ON public.user_scans;
CREATE POLICY "User scans isolation" ON public.user_scans
    FOR ALL USING (auth.uid() = user_id);

-- 4. Reminders: User isolation
DROP POLICY IF EXISTS "Reminders user isolation" ON public.reminders;
CREATE POLICY "Reminders user isolation" ON public.reminders
    FOR ALL USING (auth.uid() = user_id);

-- 5. Pantry Items & Waste
DROP POLICY IF EXISTS "Pantry items user isolation" ON public.pantry_items;
CREATE POLICY "Pantry items user isolation" ON public.pantry_items
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Waste records user isolation" ON public.waste_records;
CREATE POLICY "Waste records user isolation" ON public.waste_records
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- AUTOMATED REMINDER PROCESSING FUNCTION (For Cron / Edge Functions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_due_reminders()
RETURNS TABLE (
    reminder_id UUID,
    user_id UUID,
    scan_id UUID,
    product_name TEXT,
    expiry_date DATE,
    reminder_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH due_reminders AS (
        SELECT 
            r.id,
            r.user_id,
            r.scan_id,
            COALESCE(p.product_name, 'Scanned Item') AS product_name,
            s.expiry_date,
            r.reminder_type
        FROM public.reminders r
        JOIN public.user_scans s ON r.scan_id = s.id
        LEFT JOIN public.products p ON s.product_id = p.id
        WHERE r.notification_status = 'pending'
          AND r.reminder_date <= CURRENT_DATE
          AND s.status NOT IN ('consumed', 'discarded')
    )
    UPDATE public.reminders u
    SET 
        notification_status = 'sent',
        sent_at = NOW()
    FROM due_reminders d
    WHERE u.id = d.id
    RETURNING d.id, d.user_id, d.scan_id, d.product_name, d.expiry_date, d.reminder_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATIC TIMESTAMP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS update_user_scans_timestamp ON public.user_scans;
CREATE TRIGGER update_user_scans_timestamp
BEFORE UPDATE ON public.user_scans
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS update_products_timestamp ON public.products;
CREATE TRIGGER update_products_timestamp
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- ============================================================================
-- 6. ML_PREDICTIONS TABLE (ML Auditing, Tracking & Model Versioning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ml_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_scan_id UUID REFERENCES public.user_scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    dataset_version TEXT DEFAULT 'v1',
    prediction_type TEXT NOT NULL, -- 'product_type', 'ingredient_extraction', 'expiry_validation', 'smart_attention'
    prediction JSONB NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL,
    needs_confirmation BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 7. KNOWLEDGE_ITEMS TABLE (Semantic Product & Ingredient Knowledge Base)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'product', 'ingredient', 'allergen', 'category'
    entity_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    source TEXT DEFAULT 'Open Food Facts / OpenFDA' NOT NULL,
    source_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    embedding JSONB, -- Vector representation / embedding values
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for ML tables
CREATE INDEX IF NOT EXISTS idx_ml_predictions_scan_id ON public.ml_predictions(user_scan_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON public.ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON public.ml_predictions(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_entity ON public.knowledge_items(entity_type, entity_name);

-- RLS for ML tables
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ML predictions" ON public.ml_predictions;
CREATE POLICY "Users can read own ML predictions" ON public.ml_predictions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public knowledge items read" ON public.knowledge_items;
CREATE POLICY "Public knowledge items read" ON public.knowledge_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated knowledge items write" ON public.knowledge_items;
CREATE POLICY "Authenticated knowledge items write" ON public.knowledge_items
    FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 8. HOUSEHOLD_INVENTORY TABLE (Personal Household Expiry Management)
-- Statuses: ACTIVE, EXPIRING_SOON, EXPIRED, CONSUMED, DISCARDED
-- Use First Priorities: HIGH (1d), MEDIUM (3d), LOW (7d), NONE, EXPIRED
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.household_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1.00 NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    batch_number TEXT,
    storage_location TEXT DEFAULT 'Pantry' NOT NULL,
    scan_date TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    entry_source TEXT DEFAULT 'manual' NOT NULL CHECK (entry_source IN ('barcode', 'OCR', 'manual')),
    status TEXT DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CONSUMED', 'DISCARDED')),
    use_first_priority TEXT DEFAULT 'NONE' NOT NULL CHECK (use_first_priority IN ('HIGH', 'MEDIUM', 'LOW', 'NONE', 'EXPIRED')),
    consumed_at TIMESTAMPTZ,
    discarded_at TIMESTAMPTZ,
    estimated_value NUMERIC(10, 2) DEFAULT 100.00 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_household_expiry_mfg CHECK (
        manufacturing_date IS NULL OR expiry_date IS NULL OR expiry_date >= manufacturing_date
    )
);

-- ============================================================================
-- 9. BUSINESS MODE TABLES (Supermarkets, Restaurants, Food Businesses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('grocery', 'supermarket', 'restaurant', 'small_food_business', 'pharmacy', 'clinic')),
    registration_number TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.business_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    staff_email TEXT NOT NULL,
    role TEXT DEFAULT 'staff' NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_business_staff_user UNIQUE (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.business_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    barcode TEXT,
    category TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    quantity NUMERIC(12, 2) DEFAULT 1.00 NOT NULL,
    supplier TEXT,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    storage_location TEXT DEFAULT 'Warehouse Shelf A' NOT NULL,
    inventory_status TEXT DEFAULT 'IN_STOCK' NOT NULL CHECK (inventory_status IN ('IN_STOCK', 'NEAR_EXPIRY', 'EXPIRED', 'DISPATCHED_FEFO', 'DISCARDED')),
    fefo_rank INTEGER DEFAULT 1,
    unit_cost NUMERIC(10, 2) DEFAULT 50.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 10. MEDICINE EXPIRY & HEALTHCARE INVENTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medicine_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    batch_number TEXT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1.00 NOT NULL,
    storage_location TEXT DEFAULT 'Main Medicine Cabinet' NOT NULL,
    scan_date TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    source TEXT DEFAULT 'barcode' NOT NULL CHECK (source IN ('barcode', 'OCR', 'manual')),
    verification_status TEXT DEFAULT 'VERIFIED_SOURCE_DATA' NOT NULL CHECK (verification_status IN ('USER_INPUT', 'VERIFIED_SOURCE_DATA', 'OCR_RESULT', 'AI_GENERATED_CONFIRMATION_REQUIRED')),
    recall_status TEXT DEFAULT 'CLEAR' NOT NULL CHECK (recall_status IN ('CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_RECALL')),
    safe_disposal_guidance TEXT,
    status TEXT DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'DISPOSED_SAFELY')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 11. DONATION BEFORE EXPIRY TABLE (Surplus Food to Verified Organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.donation_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    safety_verified BOOLEAN DEFAULT TRUE NOT NULL,
    organization_name TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    status TEXT DEFAULT 'listed' NOT NULL CHECK (status IN ('listed', 'requested', 'accepted', 'completed', 'cancelled')),
    requested_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_donation_not_expired CHECK (expiry_date >= CURRENT_DATE)
);

-- ============================================================================
-- 12. RETAILER -> CONSUMER TRACEABILITY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_traceability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traceability_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    manufacturer_name TEXT NOT NULL,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    lifecycle_stages JSONB DEFAULT '[]'::JSONB NOT NULL,
    public_consumer_view JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_household_inv_user ON public.household_inventory(user_id, status);
CREATE INDEX IF NOT EXISTS idx_household_inv_expiry ON public.household_inventory(expiry_date, use_first_priority);
CREATE INDEX IF NOT EXISTS idx_business_inv_business ON public.business_inventory(business_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicine_inv_user ON public.medicine_inventory(user_id, status);
CREATE INDEX IF NOT EXISTS idx_donation_listings_status ON public.donation_listings(status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_traceability_code ON public.product_traceability(traceability_code);

-- Enable RLS
ALTER TABLE public.household_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_traceability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Household inventory user isolation" ON public.household_inventory;
CREATE POLICY "Household inventory user isolation" ON public.household_inventory
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Business owner access" ON public.businesses;
CREATE POLICY "Business owner access" ON public.businesses
    FOR ALL USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Medicine inventory access" ON public.medicine_inventory;
CREATE POLICY "Medicine inventory access" ON public.medicine_inventory
    FOR ALL USING (auth.uid() = user_id OR business_id IN (
        SELECT business_id FROM public.business_staff WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Public traceability read" ON public.product_traceability;
CREATE POLICY "Public traceability read" ON public.product_traceability
    FOR SELECT USING (true);

-- ============================================================================
-- 13. OFFICIAL_RECALLS TABLE (FDA, USDA FSIS & WHO Regulatory Bulletins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.official_recalls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recall_id TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    batch_numbers TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('food', 'medicine', 'beverage', 'device')),
    recall_status TEXT DEFAULT 'ACTIVE_RECALL' NOT NULL CHECK (recall_status IN ('ACTIVE_RECALL', 'TERMINATED')),
    classification TEXT NOT NULL CHECK (classification IN ('Class I', 'Class II', 'Class III')),
    source TEXT NOT NULL,
    source_url TEXT NOT NULL,
    recall_date DATE NOT NULL,
    reason TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    affected_jurisdiction TEXT DEFAULT 'Global' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 14. BATCH_MOVEMENTS TABLE (Custody & Movement Audit Trail Across Roles)
-- Stakeholder Roles: household, retailer, wholesaler, pharmacy, manufacturer
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.batch_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number TEXT NOT NULL,
    product_name TEXT NOT NULL,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    quantity_moved NUMERIC(12, 2) DEFAULT 1.00 NOT NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('household', 'retailer', 'wholesaler', 'pharmacy', 'manufacturer')),
    actor_name TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('MANUFACTURED', 'TRANSFERRED_IN', 'RELOCATED', 'DISPATCHED_FEFO', 'QUARANTINED', 'CONSUMED', 'DISPOSED_SAFELY')),
    temperature_reading TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 15. WASTE_RISK_PREDICTIONS TABLE (Explainable AI Predictions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.waste_risk_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_quantity NUMERIC(10, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW RISK', 'MEDIUM RISK', 'HIGH RISK', 'INSUFFICIENT DATA')),
    reasons JSONB DEFAULT '[]'::JSONB NOT NULL,
    recommended_action TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recalls_barcode ON public.official_recalls(barcode);
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch ON public.batch_movements(batch_number, timestamp);
CREATE INDEX IF NOT EXISTS idx_waste_pred_user ON public.waste_risk_predictions(user_id, risk_level);

-- RLS
ALTER TABLE public.official_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_risk_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public recalls read" ON public.official_recalls;
CREATE POLICY "Public recalls read" ON public.official_recalls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Batch movements authenticated read" ON public.batch_movements;
CREATE POLICY "Batch movements authenticated read" ON public.batch_movements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Batch movements authenticated write" ON public.batch_movements;
CREATE POLICY "Batch movements authenticated write" ON public.batch_movements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Waste risk predictions user isolation" ON public.waste_risk_predictions;
CREATE POLICY "Waste risk predictions user isolation" ON public.waste_risk_predictions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 16. ORGANIZATIONS TABLE (Multi-Tenant Stakeholder Entities)
-- Stakeholder Roles: NORMAL_USER, SHOPKEEPER, WHOLESALER, DISTRIBUTOR,
-- PHARMACY, CLINIC, HOSPITAL, MANUFACTURER, ADMIN
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'NORMAL_USER', 'SHOPKEEPER', 'WHOLESALER', 'DISTRIBUTOR',
        'PHARMACY', 'CLINIC', 'HOSPITAL', 'MANUFACTURER', 'ADMIN'
    )),
    organization_type TEXT NOT NULL,
    identifier TEXT UNIQUE NOT NULL,
    address TEXT,
    contact_email TEXT,
    phone TEXT,
    verified BOOLEAN DEFAULT TRUE NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 17. USER_ROLES TABLE (Mapping Users to Organizations & RBAC Permissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'NORMAL_USER', 'SHOPKEEPER', 'WHOLESALER', 'DISTRIBUTOR',
        'PHARMACY', 'CLINIC', 'HOSPITAL', 'MANUFACTURER', 'ADMIN'
    )),
    is_primary BOOLEAN DEFAULT TRUE NOT NULL,
    permissions JSONB DEFAULT '[]'::JSONB NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_user_org_role UNIQUE (user_id, organization_id, role)
);

-- ----------------------------------------------------------------------------
-- 18. WAREHOUSES TABLE (Multi-Location Storage for Wholesalers & Distributors)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    warehouse_name TEXT NOT NULL,
    warehouse_code TEXT UNIQUE NOT NULL,
    location TEXT NOT NULL,
    capacity_pallets INTEGER DEFAULT 1000 NOT NULL,
    current_occupancy_pallets INTEGER DEFAULT 0 NOT NULL,
    temperature_zones JSONB DEFAULT '["Ambient (18-24C)"]'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 19. INVENTORY_LOCATIONS TABLE (Aisles, Shelves, Fridges, Trolleys)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    storage_type TEXT DEFAULT 'SHELF' NOT NULL CHECK (storage_type IN ('SHELF', 'PALLET', 'REFRIGERATOR', 'FREEZER', 'CRASH_CART', 'LOCKER')),
    target_temperature_c NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 20. DISPATCHES TABLE (Upstream/Downstream Logistics & Retailer Delivery)
-- Supply Chain: Manufacturer -> Distributor -> Wholesaler -> Retailer -> Consumer
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_number TEXT UNIQUE NOT NULL,
    origin_organization_id UUID NOT NULL REFERENCES public.organizations(id),
    origin_warehouse_id UUID REFERENCES public.warehouses(id),
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('DISTRIBUTOR', 'WHOLESALER', 'RETAILER', 'PHARMACY', 'HOSPITAL', 'CONSUMER')),
    recipient_name TEXT NOT NULL,
    recipient_organization_id UUID REFERENCES public.organizations(id),
    product_name TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    quantity_cases NUMERIC(10, 2) NOT NULL,
    unit_count NUMERIC(12, 2) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    fefo_priority_rank INTEGER DEFAULT 1 NOT NULL,
    cold_chain_verified BOOLEAN DEFAULT TRUE NOT NULL,
    transit_temperature_c NUMERIC(5, 2),
    dispatch_status TEXT DEFAULT 'PENDING' NOT NULL CHECK (dispatch_status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'RECALLED_HOLD', 'CANCELLED')),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 21. RECALL_ITEMS TABLE (Downstream Batch Identification & Action Logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recall_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recall_id UUID NOT NULL REFERENCES public.official_recalls(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id),
    location_name TEXT NOT NULL,
    quantity_identified NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    action_taken TEXT DEFAULT 'QUARANTINED' NOT NULL CHECK (action_taken IN ('QUARANTINED', 'DISPOSED_SAFELY', 'RETURNED_TO_MANUFACTURER', 'PENDING_INSPECTION')),
    resolution_notes TEXT,
    resolved_by_user_id UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 22. AUDIT_LOGS TABLE (Security, Access & Regulatory Compliance Auditing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::JSONB NOT NULL,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- INDEXES & PERFORMANCE OPTIMIZATION
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orgs_role ON public.organizations(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_org ON public.warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_batch ON public.dispatches(batch_number);
CREATE INDEX IF NOT EXISTS idx_dispatches_origin ON public.dispatches(origin_organization_id);
CREATE INDEX IF NOT EXISTS idx_recall_items_batch ON public.recall_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, timestamp);

-- ----------------------------------------------------------------------------
-- RLS POLICIES FOR ENTERPRISE STAKEHOLDERS
-- Strict boundary: users only access data within their assigned organization
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizations read member access" ON public.organizations;
CREATE POLICY "Organizations read member access" ON public.organizations
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
        )
    );

DROP POLICY IF EXISTS "User roles own access" ON public.user_roles;
CREATE POLICY "User roles own access" ON public.user_roles
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Warehouses org access" ON public.warehouses;
CREATE POLICY "Warehouses org access" ON public.warehouses
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Dispatches org access" ON public.dispatches;
CREATE POLICY "Dispatches org access" ON public.dispatches
    FOR ALL USING (
        origin_organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()) OR
        recipient_organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Audit logs admin access" ON public.audit_logs;
CREATE POLICY "Audit logs admin access" ON public.audit_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs insert" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

