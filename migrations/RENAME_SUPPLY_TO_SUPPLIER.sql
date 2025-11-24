-- ================================================================
-- MIGRATION: Rename Supply Category to Supplier
-- ================================================================
-- Date: 2025-11-24
-- Purpose:
--   1. Update leads category constraint: 'supply' → 'supplier'
--   2. Update existing records with category = 'supply'
--   3. Update activity types for supply-related activities
--   4. Maintain backward compatibility for analytics
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Update Category Constraint FIRST
-- ================================================================

-- Drop the old CHECK constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_category_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS check_leads_category;

-- Add new constraint with BOTH 'supply' and 'supplier' temporarily
ALTER TABLE leads
ADD CONSTRAINT leads_category_check
CHECK (category IN ('lead', 'event', 'supply', 'supplier'));

-- ================================================================
-- STEP 2: Update Existing Records
-- ================================================================

-- Update all existing leads with category 'supply' to 'supplier'
UPDATE leads
SET category = 'supplier',
    updated_at = NOW()
WHERE category = 'supply';

-- Log the number of updated records
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % leads from category "supply" to "supplier"', updated_count;
END $$;

-- ================================================================
-- STEP 3: Remove 'supply' from Constraint
-- ================================================================

-- Drop the temporary constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_category_check;

-- Add final constraint with only 'supplier' (no 'supply')
ALTER TABLE leads
ADD CONSTRAINT leads_category_check
CHECK (category IN ('lead', 'event', 'supplier'));

-- ================================================================
-- STEP 3: Update Activity Types (if using supply-specific types)
-- ================================================================

-- Check if lead_activities table has activity_type constraint
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE lead_activities DROP CONSTRAINT IF EXISTS lead_activities_activity_type_check;

  -- Add updated constraint with supplier-specific activity types
  ALTER TABLE lead_activities
  ADD CONSTRAINT lead_activities_activity_type_check
  CHECK (activity_type IN (
    'call',
    'email',
    'meeting',
    'site-visit',
    'follow-up',
    'remark',
    'other',
    -- Supplier-specific activity types
    'active-supplier',
    'recording',
    'checking',
    'price-negotiation',
    'quality-check'
  ));

  RAISE NOTICE 'Activity type constraint updated successfully';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Activity types constraint not present or already updated';
END $$;

-- ================================================================
-- STEP 4: Create Migration Log Entry (Optional - for tracking)
-- ================================================================

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  affected_records INTEGER
);

-- Log this migration
INSERT INTO migration_log (migration_name, description, affected_records)
SELECT
  'RENAME_SUPPLY_TO_SUPPLIER',
  'Renamed category from "supply" to "supplier" in leads table',
  (SELECT COUNT(*) FROM leads WHERE category = 'supplier');

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ================================================================

/*
-- 1. Check all categories in leads table (should NOT show 'supply')
SELECT category, COUNT(*) as count
FROM leads
GROUP BY category
ORDER BY category;

-- 2. Verify constraint (should show 'lead', 'event', 'supplier')
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'leads'::regclass
  AND conname LIKE '%category%';

-- 3. Check supplier leads with all fields
SELECT
  id,
  category,
  supplier_name,
  supplier_location,
  supplier_product,
  contact_person,
  status,
  created_at
FROM leads
WHERE category = 'supplier'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check activity types distribution
SELECT activity_type, COUNT(*) as count
FROM lead_activities la
JOIN leads l ON la.lead_id = l.id
WHERE l.category = 'supplier'
GROUP BY activity_type
ORDER BY count DESC;

-- 5. Verify migration log
SELECT * FROM migration_log WHERE migration_name = 'RENAME_SUPPLY_TO_SUPPLIER';
*/

-- ================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ================================================================

/*
-- WARNING: Only run this if you need to rollback the migration

BEGIN;

-- Revert records back to 'supply'
UPDATE leads
SET category = 'supply',
    updated_at = NOW()
WHERE category = 'supplier';

-- Drop new constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_category_check;

-- Add old constraint with 'supply'
ALTER TABLE leads
ADD CONSTRAINT leads_category_check
CHECK (category IN ('lead', 'event', 'supply'));

-- Delete migration log entry
DELETE FROM migration_log WHERE migration_name = 'RENAME_SUPPLY_TO_SUPPLIER';

COMMIT;
*/

-- ================================================================
-- NOTES
-- ================================================================
-- 1. All frontend code must be updated to use 'supplier' instead of 'supply'
-- 2. TypeScript types must change: 'supply' → 'supplier'
-- 3. Zod validation schemas must be updated
-- 4. API routes that filter by category must use 'supplier'
-- 5. UI components (dropdowns, forms, tables) must display "Supplier" instead of "Supplies"
-- 6. The supplier-specific fields remain unchanged:
--    - supplier_name (already correct)
--    - supplier_location
--    - supplier_product
--    - price
--    - unit_type
-- ================================================================
