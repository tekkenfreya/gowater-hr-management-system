-- =============================================
-- Add Avatar Column to Users Table
-- =============================================
-- This script adds the avatar column to store user profile photos
-- Run this in Supabase SQL Editor
-- =============================================

-- Add avatar column to users table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'avatar'
    ) THEN
        ALTER TABLE users
        ADD COLUMN avatar TEXT;

        RAISE NOTICE 'Avatar column added successfully';
    ELSE
        RAISE NOTICE 'Avatar column already exists';
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN users.avatar IS 'User profile photo URL (stored in Supabase Storage or as base64)';

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'avatar';

-- =============================================
-- Expected Result:
-- column_name | data_type | is_nullable | column_default
-- avatar      | text      | YES         | null
-- =============================================
