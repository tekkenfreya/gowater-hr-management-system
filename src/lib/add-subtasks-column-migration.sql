-- Add sub_tasks column to tasks table
-- This column stores sub-tasks as a JSON array

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN tasks.sub_tasks IS 'JSON array of sub-tasks with structure: [{ id, title, notes, completed }]';

-- Create index for sub_tasks JSONB operations (optional, for better query performance)
CREATE INDEX IF NOT EXISTS idx_tasks_sub_tasks ON tasks USING GIN (sub_tasks);
