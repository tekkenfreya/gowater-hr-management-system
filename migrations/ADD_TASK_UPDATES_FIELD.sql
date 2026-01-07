-- Migration: Add updates field to tasks table
-- Purpose: Store task progress updates/notes as JSONB array
-- Date: 2026-01-07

-- Add updates column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS updates JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on updates
CREATE INDEX IF NOT EXISTS idx_tasks_updates ON tasks USING GIN (updates);

-- Comment on column
COMMENT ON COLUMN tasks.updates IS 'Array of task update objects: [{update_id, user_id, user_name, update_text, created_at}]';
