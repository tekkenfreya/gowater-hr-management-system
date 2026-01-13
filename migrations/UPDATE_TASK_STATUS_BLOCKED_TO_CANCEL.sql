-- Migration: Replace 'blocked' status with 'cancel' in tasks table
-- Date: 2026-01-13
-- Purpose: Standardize status naming across the application

-- Step 1: Update existing tasks with 'blocked' status to 'cancel'
UPDATE tasks
SET status = 'cancel'
WHERE status = 'blocked';

-- Step 2: Drop old constraint
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Step 3: Add new constraint with 'cancel' instead of 'blocked'
ALTER TABLE tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancel', 'archived'));

-- Step 4: Verify the migration
-- Run separately to check:
-- SELECT status, COUNT(*) FROM tasks GROUP BY status;
