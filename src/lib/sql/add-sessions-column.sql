-- =============================================
-- Add Sessions Column to Attendance Table
-- =============================================
-- This script adds a sessions column to track multiple check-in/out
-- sessions within the same day (for Zoho-style calendar view with gaps)
-- Run this in Supabase SQL Editor
-- =============================================

-- Add sessions column to attendance table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'attendance'
        AND column_name = 'sessions'
    ) THEN
        ALTER TABLE attendance
        ADD COLUMN sessions JSONB DEFAULT '[]'::jsonb;

        RAISE NOTICE 'Sessions column added successfully';
    ELSE
        RAISE NOTICE 'Sessions column already exists';
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN attendance.sessions IS 'Array of check-in/out sessions for the day: [{checkIn: timestamp, checkOut: timestamp}]';

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'attendance'
  AND column_name = 'sessions';

-- =============================================
-- Expected Result:
-- column_name | data_type | is_nullable | column_default
-- sessions    | jsonb     | YES         | '[]'::jsonb
-- =============================================

-- Example sessions data structure:
-- [
--   {"checkIn": "2025-10-07T07:00:00Z", "checkOut": "2025-10-07T10:00:00Z"},
--   {"checkIn": "2025-10-07T14:00:00Z", "checkOut": "2025-10-07T18:00:00Z"}
-- ]
