-- Rollback: Restore Old Leads Schema
-- WARNING: This will DELETE ALL current leads data and restore old structure

-- Step 1: Delete current data
DELETE FROM leads;

-- Step 2: Drop new columns
ALTER TABLE leads DROP COLUMN IF EXISTS date_of_interaction;
ALTER TABLE leads DROP COLUMN IF EXISTS lead_type;
ALTER TABLE leads DROP COLUMN IF EXISTS number_of_beneficiary;
ALTER TABLE leads DROP COLUMN IF EXISTS disposition;

-- Step 3: Restore old columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS type_of_business TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS number_of_employees TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action TEXT;
