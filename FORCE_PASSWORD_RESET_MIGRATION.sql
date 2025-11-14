-- Migration: Add Force Password Reset Functionality
-- Description: Adds fields to track password reset requirements and last password change
-- Date: 2025-01-14

-- Step 1: Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_force_password_reset
ON users(force_password_reset)
WHERE force_password_reset = TRUE;

-- Step 3: Flag all existing users (except admin@gowater.com) to force password reset
UPDATE users
SET force_password_reset = TRUE,
    updated_at = NOW()
WHERE email != 'admin@gowater.com'
  AND status = 'active';

-- Step 4: Set last_password_change to created_at for existing users (assuming they set password on creation)
UPDATE users
SET last_password_change = COALESCE(created_at, NOW())
WHERE last_password_change IS NULL;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN users.force_password_reset IS 'Flag to force user to change password on next login';
COMMENT ON COLUMN users.last_password_change IS 'Timestamp of last password change for audit trail';

-- Verification queries (run these to check the migration worked):
-- SELECT email, force_password_reset, last_password_change FROM users ORDER BY email;
-- SELECT COUNT(*) as users_needing_reset FROM users WHERE force_password_reset = TRUE;
