-- Migration to add 'archived' status to tasks table
-- This updates the existing check constraint to include 'archived'

-- Drop the existing constraint
ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;

-- Add the new constraint with 'archived' included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'archived'));

-- Update any existing tasks that might need to be archived (optional)
-- UPDATE tasks SET status = 'archived' WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '30 days';