-- Update Event Fields Schema
-- Add new fields for Events and modify existing ones

-- Step 1: Add new EVENT-SPECIFIC columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_lead TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_start_date TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_end_date TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_report TEXT; -- File path for uploaded report

-- Step 2: Rename event_date to event_date_old (keep backup)
-- Note: event_start_date will replace event_date
-- If you want to migrate data, run:
-- UPDATE leads SET event_start_date = event_date WHERE category = 'event' AND event_date IS NOT NULL;

-- Step 3: Add contact_number column (we'll use mobile_number in backend but display as Contact Number in UI)
-- No schema change needed - just UI label change from "Mobile Number" to "Contact Number"

-- Verification: Check the updated schema
-- Run this separately to verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' AND column_name LIKE '%event%';
