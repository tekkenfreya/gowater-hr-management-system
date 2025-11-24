-- ================================================================
-- MIGRATION: Add Password Expiry Tracking for Monthly Rotation
-- ================================================================
-- Date: 2025-11-24
-- Purpose:
--   1. Add password_expires_at column to users table
--   2. Add password_expiry_days column for role-based expiry periods
--   3. Set admin users to 30-day password expiry
--   4. Create function to auto-calculate expiry dates
--   5. Create function to check expired passwords
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Add Password Expiry Columns (if not already exist)
-- ================================================================

-- Add last_password_change column first (needed for expiry calculation)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;

-- Add force_password_reset column (if not exists)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT FALSE;

-- Add password_expires_at column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;

-- Add password_expiry_days column (NULL = never expires)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_expiry_days INTEGER;

-- Add last_password_reset_warning column (track when user was last warned)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_password_reset_warning TIMESTAMPTZ;

-- ================================================================
-- STEP 2: Set Password Expiry for Admin Users
-- ================================================================

-- Set all admin users to 30-day password expiry
UPDATE users
SET
  password_expiry_days = 30,
  password_expires_at = CASE
    -- If last_password_change exists, use it
    WHEN last_password_change IS NOT NULL THEN last_password_change + INTERVAL '30 days'
    -- Otherwise, set to 30 days from now (first login will reset this)
    ELSE NOW() + INTERVAL '30 days'
  END,
  updated_at = NOW()
WHERE role = 'admin';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Set 30-day password expiry for % admin users', updated_count;
END $$;

-- ================================================================
-- STEP 3: Set No Expiry for Other Roles (Optional)
-- ================================================================

-- Managers and employees: no password expiry (NULL)
UPDATE users
SET
  password_expiry_days = NULL,
  password_expires_at = NULL,
  updated_at = NOW()
WHERE role IN ('manager', 'employee');

-- ================================================================
-- STEP 4: Create Trigger to Auto-Set Expiry on Password Change
-- ================================================================

-- Function to automatically set password_expires_at when password changes
CREATE OR REPLACE FUNCTION update_password_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if password_hash has changed
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    -- Set last_password_change to now
    NEW.last_password_change := NOW();

    -- Calculate expiry based on password_expiry_days
    IF NEW.password_expiry_days IS NOT NULL THEN
      NEW.password_expires_at := NOW() + (NEW.password_expiry_days || ' days')::INTERVAL;
      RAISE NOTICE 'Password expiry set to % for user %', NEW.password_expires_at, NEW.email;
    ELSE
      -- No expiry
      NEW.password_expires_at := NULL;
    END IF;

    -- Clear force_password_reset flag
    NEW.force_password_reset := FALSE;

    -- Clear last warning
    NEW.last_password_reset_warning := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_password_expiry ON users;
CREATE TRIGGER trigger_update_password_expiry
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_password_expiry();

-- ================================================================
-- STEP 5: Create Function to Check for Expired Passwords
-- ================================================================

-- Function to get users with expired passwords
CREATE OR REPLACE FUNCTION get_expired_password_users()
RETURNS TABLE(
  user_id INTEGER,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50),
  password_expires_at TIMESTAMPTZ,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.role,
    u.password_expires_at,
    EXTRACT(DAY FROM NOW() - u.password_expires_at)::INTEGER as days_overdue
  FROM users u
  WHERE u.password_expires_at IS NOT NULL
    AND u.password_expires_at < NOW()
    AND u.status = 'active'
  ORDER BY u.password_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 6: Create Function to Get Users Needing Warning
-- ================================================================

-- Function to get users whose passwords expire soon (within 7 days)
CREATE OR REPLACE FUNCTION get_password_expiry_warnings(warning_days INTEGER DEFAULT 7)
RETURNS TABLE(
  user_id INTEGER,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50),
  password_expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.role,
    u.password_expires_at,
    EXTRACT(DAY FROM u.password_expires_at - NOW())::INTEGER as days_until_expiry
  FROM users u
  WHERE u.password_expires_at IS NOT NULL
    AND u.password_expires_at > NOW()
    AND u.password_expires_at <= NOW() + (warning_days || ' days')::INTERVAL
    AND u.status = 'active'
    -- Only warn once per day
    AND (u.last_password_reset_warning IS NULL
         OR u.last_password_reset_warning < NOW() - INTERVAL '1 day')
  ORDER BY u.password_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 7: Create Function to Force Password Reset for Expired Users
-- ================================================================

-- Function to automatically set force_password_reset for expired passwords
CREATE OR REPLACE FUNCTION enforce_password_expiry()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Set force_password_reset = TRUE for users with expired passwords
  UPDATE users
  SET
    force_password_reset = TRUE,
    updated_at = NOW()
  WHERE password_expires_at IS NOT NULL
    AND password_expires_at < NOW()
    AND force_password_reset = FALSE
    AND status = 'active';

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE 'Forced password reset for % users with expired passwords', affected_count;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 8: Create Scheduled Job Helper (for cron/scheduler)
-- ================================================================

-- Function to be called by external scheduler (e.g., cron job)
CREATE OR REPLACE FUNCTION daily_password_expiry_check()
RETURNS JSON AS $$
DECLARE
  expired_users INTEGER;
  warning_users INTEGER;
  result JSON;
BEGIN
  -- Enforce password expiry (set force_password_reset flag)
  expired_users := enforce_password_expiry();

  -- Count users needing warnings
  SELECT COUNT(*) INTO warning_users
  FROM get_password_expiry_warnings(7);

  -- Build result JSON
  result := json_build_object(
    'timestamp', NOW(),
    'expired_users_count', expired_users,
    'warning_users_count', warning_users,
    'status', 'completed'
  );

  RAISE NOTICE 'Daily password expiry check completed: % expired, % warnings', expired_users, warning_users;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 9: Create Indexes for Performance
-- ================================================================

-- Index for finding expired passwords quickly
CREATE INDEX IF NOT EXISTS idx_users_password_expires_at
ON users(password_expires_at)
WHERE password_expires_at IS NOT NULL AND status = 'active';

-- Index for finding users needing warnings
CREATE INDEX IF NOT EXISTS idx_users_password_expiry_warning
ON users(password_expires_at, last_password_reset_warning)
WHERE password_expires_at IS NOT NULL AND status = 'active';

-- ================================================================
-- STEP 10: Log Migration
-- ================================================================

-- Log this migration
INSERT INTO migration_log (migration_name, description, affected_records)
SELECT
  'ADD_PASSWORD_EXPIRY',
  'Added password expiry tracking with 30-day rotation for admin users',
  (SELECT COUNT(*) FROM users WHERE password_expiry_days IS NOT NULL);

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ================================================================

/*
-- 1. Check all users with password expiry settings
SELECT
  id,
  email,
  name,
  role,
  password_expiry_days,
  password_expires_at,
  last_password_change,
  force_password_reset,
  CASE
    WHEN password_expires_at IS NULL THEN 'Never expires'
    WHEN password_expires_at < NOW() THEN 'EXPIRED (' || EXTRACT(DAY FROM NOW() - password_expires_at)::INTEGER || ' days ago)'
    WHEN password_expires_at <= NOW() + INTERVAL '7 days' THEN 'Expires soon (' || EXTRACT(DAY FROM password_expires_at - NOW())::INTEGER || ' days)'
    ELSE 'Valid (' || EXTRACT(DAY FROM password_expires_at - NOW())::INTEGER || ' days remaining)'
  END as expiry_status
FROM users
WHERE status = 'active'
ORDER BY password_expires_at NULLS LAST;

-- 2. Get users with expired passwords
SELECT * FROM get_expired_password_users();

-- 3. Get users needing password expiry warning
SELECT * FROM get_password_expiry_warnings(7);

-- 4. Test the daily check function
SELECT daily_password_expiry_check();

-- 5. Check admin users specifically
SELECT
  email,
  password_expiry_days,
  password_expires_at,
  force_password_reset,
  EXTRACT(DAY FROM password_expires_at - NOW())::INTEGER as days_remaining
FROM users
WHERE role = 'admin'
  AND status = 'active';

-- 6. Verify migration log
SELECT * FROM migration_log WHERE migration_name = 'ADD_PASSWORD_EXPIRY';
*/

-- ================================================================
-- CRON JOB SETUP (External - Run Daily)
-- ================================================================

/*
-- Set up a daily cron job to run password expiry checks
-- Option 1: PostgreSQL pg_cron extension (if available)
SELECT cron.schedule('daily-password-expiry-check', '0 1 * * *', 'SELECT daily_password_expiry_check()');

-- Option 2: External cron job (Linux/Unix)
-- Add to crontab:
-- 0 1 * * * psql -U your_user -d your_database -c "SELECT daily_password_expiry_check();"

-- Option 3: Node.js scheduled job (recommended for this app)
-- Create src/lib/cron/password-rotation.ts with node-cron
*/

-- ================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ================================================================

/*
-- WARNING: Only run this if you need to rollback the migration

BEGIN;

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

-- Remove columns
ALTER TABLE users DROP COLUMN IF EXISTS password_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS password_expiry_days;
ALTER TABLE users DROP COLUMN IF EXISTS last_password_reset_warning;

-- Delete migration log entry
DELETE FROM migration_log WHERE migration_name = 'ADD_PASSWORD_EXPIRY';

COMMIT;
*/

-- ================================================================
-- NOTES
-- ================================================================
-- 1. Admin users: 30-day password rotation (automatically enforced)
-- 2. Manager/Employee users: No password expiry (can be changed later)
-- 3. Trigger automatically updates expiry date when password changes
-- 4. Function daily_password_expiry_check() should be called by scheduler
-- 5. Frontend should show warning banner when password expires soon
-- 6. Login endpoint should check password expiry and return warning
-- 7. ForcePasswordChangeModal already exists in the frontend
-- ================================================================
