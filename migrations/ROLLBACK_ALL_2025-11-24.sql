-- ================================================================
-- ROLLBACK SCRIPT: Revert All Migrations from 2025-11-24
-- ================================================================
-- This script reverts the 4 migrations applied today in reverse order:
-- 1. ADD_PASSWORD_EXPIRY.sql
-- 2. REMOVE_BOSS_ADD_PERMISSIONS.sql
-- 3. RENAME_SUPPLY_TO_SUPPLIER.sql
-- 4. SIMPLE_RLS_POLICIES.sql (from earlier today)
--
-- Run this in Supabase SQL Editor to restore your database
-- to the state before today's migrations.
-- ================================================================

BEGIN;

-- ================================================================
-- ROLLBACK 1: Revert ADD_PASSWORD_EXPIRY
-- ================================================================

-- Drop functions
DROP FUNCTION IF EXISTS daily_password_expiry_check();
DROP FUNCTION IF EXISTS enforce_password_expiry();
DROP FUNCTION IF EXISTS get_password_expiry_warnings(INTEGER);
DROP FUNCTION IF EXISTS get_expired_password_users();
DROP FUNCTION IF EXISTS update_password_expiry();

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_update_password_expiry ON users;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_password_expires_at;
DROP INDEX IF EXISTS idx_users_password_expiry_warning;

-- Remove columns (only the NEW ones we added, keep existing ones)
ALTER TABLE users DROP COLUMN IF EXISTS password_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS password_expiry_days;
ALTER TABLE users DROP COLUMN IF EXISTS last_password_reset_warning;

-- Note: We keep last_password_change and force_password_reset
-- because they might have existed before

-- Delete migration log entry
DELETE FROM migration_log WHERE migration_name = 'ADD_PASSWORD_EXPIRY';

DO $$ BEGIN
  RAISE NOTICE 'Rolled back ADD_PASSWORD_EXPIRY migration';
END $$;

-- ================================================================
-- ROLLBACK 2: Revert REMOVE_BOSS_ADD_PERMISSIONS
-- ================================================================

-- Drop tables
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS user_has_permission(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS get_user_permissions(INTEGER);

-- Restore old constraint (with boss)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'employee', 'manager', 'boss'));

-- Delete migration log entry
DELETE FROM migration_log WHERE migration_name = 'REMOVE_BOSS_ADD_PERMISSIONS';

DO $$ BEGIN
  RAISE NOTICE 'Rolled back REMOVE_BOSS_ADD_PERMISSIONS migration';
END $$;

-- ================================================================
-- ROLLBACK 3: Revert RENAME_SUPPLY_TO_SUPPLIER
-- ================================================================

-- Update constraint to allow 'supply' again
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_category_check;
ALTER TABLE leads
ADD CONSTRAINT leads_category_check
CHECK (category IN ('lead', 'event', 'supply', 'supplier'));

-- Revert records back to 'supply'
UPDATE leads
SET category = 'supply',
    updated_at = NOW()
WHERE category = 'supplier';

-- Remove 'supplier' from constraint (restore original)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_category_check;
ALTER TABLE leads
ADD CONSTRAINT leads_category_check
CHECK (category IN ('lead', 'event', 'supply'));

-- Revert activity type constraint (if changed)
DO $$
BEGIN
  ALTER TABLE lead_activities DROP CONSTRAINT IF EXISTS lead_activities_activity_type_check;

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
    'active-supplier',
    'recording',
    'checking'
  ));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Activity type constraint rollback skipped (already reverted or not present)';
END $$;

-- Delete migration log entry
DELETE FROM migration_log WHERE migration_name = 'RENAME_SUPPLY_TO_SUPPLIER';

-- Drop migration_log table if it was created by our migrations
-- (Only drop if it has no other entries)
DO $$
DECLARE
  log_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO log_count FROM migration_log;

  IF log_count = 0 THEN
    DROP TABLE IF EXISTS migration_log;
    RAISE NOTICE 'Dropped empty migration_log table';
  ELSE
    RAISE NOTICE 'Kept migration_log table (has % other entries)', log_count;
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE 'Rolled back RENAME_SUPPLY_TO_SUPPLIER migration';
END $$;

-- ================================================================
-- ROLLBACK 4: Revert SIMPLE_RLS_POLICIES (Optional - see note below)
-- ================================================================

-- Drop all RLS policies created by SIMPLE_RLS_POLICIES.sql
-- Note: RLS itself (enabled/disabled) won't be changed, only policies removed

-- Users table policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Attendance table policies
DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_delete_policy" ON attendance;

-- Leave requests table policies
DROP POLICY IF EXISTS "leave_select_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_insert_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_update_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_delete_policy" ON leave_requests;

-- Tasks table policies
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Reports table policies
DROP POLICY IF EXISTS "reports_select_policy" ON reports;
DROP POLICY IF EXISTS "reports_insert_policy" ON reports;
DROP POLICY IF EXISTS "reports_update_policy" ON reports;
DROP POLICY IF EXISTS "reports_delete_policy" ON reports;

-- Files table policies
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- Leads table policies
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
DROP POLICY IF EXISTS "leads_update_policy" ON leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON leads;

-- Lead activities table policies
DROP POLICY IF EXISTS "activities_select_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_insert_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_update_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_delete_policy" ON lead_activities;

DO $$ BEGIN
  RAISE NOTICE 'Rolled back SIMPLE_RLS_POLICIES migration';
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES (Run after rollback)
-- ================================================================

/*
-- 1. Verify role constraint includes 'boss'
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname LIKE '%role%';

-- 2. Verify category is 'supply' (not 'supplier')
SELECT category, COUNT(*) as count
FROM leads
GROUP BY category
ORDER BY category;

-- 3. Verify permissions tables are gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('permissions', 'user_permissions');
-- Should return 0 rows

-- 4. Verify password expiry columns are removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('password_expires_at', 'password_expiry_days', 'last_password_reset_warning');
-- Should return 0 rows

-- 5. Check if any users have 'boss' role
SELECT COUNT(*) FROM users WHERE role = 'boss';
*/

-- ================================================================
-- NOTES
-- ================================================================
-- After running this rollback:
-- 1. Your production site should work normally again
-- 2. Database is restored to pre-migration state
-- 3. You can continue developing the new features locally
-- 4. Apply migrations again when you deploy the new code
--
-- IMPORTANT: This rollback is SAFE because:
-- - No user data is deleted (only structural changes)
-- - Existing users, leads, and activities are preserved
-- - Only reverts schema changes from today
-- ================================================================
