-- Update Leads Schema - Remove Old Fields and Add New Fields
-- WARNING: This will DELETE ALL existing leads data

-- Step 1: Delete all existing data
DELETE FROM leads;

-- Step 2: Drop old columns that are no longer used
ALTER TABLE leads DROP COLUMN IF EXISTS type_of_business;
ALTER TABLE leads DROP COLUMN IF EXISTS number_of_employees;
ALTER TABLE leads DROP COLUMN IF EXISTS next_action;

-- Step 3: Add new columns for LEADS category
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_interaction TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS number_of_beneficiary TEXT;

-- Step 4: Rename next_action to disposition (or add new column)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS disposition TEXT;

-- Verification: Check the updated schema
-- Run this separately to verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads';
