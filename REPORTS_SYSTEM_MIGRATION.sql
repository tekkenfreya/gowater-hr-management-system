-- ================================================================
-- GOWATER - REPORTS SYSTEM MIGRATION
-- ================================================================
-- This migration creates a configuration-driven report system
-- Run this in your Supabase SQL editor
-- ================================================================

-- ================================================================
-- STEP 1: STATUS CONFIGURATION TABLE
-- ================================================================
-- Centralized status definitions for tasks, subtasks, and reports
CREATE TABLE IF NOT EXISTS status_config (
  id SERIAL PRIMARY KEY,
  status_key VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  display_tag VARCHAR(50),
  color_class VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  entity_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_status_config_key ON status_config(status_key);
CREATE INDEX IF NOT EXISTS idx_status_config_entity ON status_config(entity_type);

-- Seed status data for tasks
INSERT INTO status_config (status_key, display_name, display_tag, color_class, sort_order, entity_type) VALUES
('pending', 'Pending', '[PENDING]', 'bg-orange-500', 1, 'task'),
('in_progress', 'In Progress', '[IN PROGRESS]', 'bg-blue-500', 2, 'task'),
('completed', 'Completed', '[DONE]', 'bg-green-500', 3, 'task'),
('blocked', 'Blocked', '[BLOCKED]', 'bg-red-500', 4, 'task'),
('archived', 'Archived', '[ARCHIVED]', 'bg-gray-500', 5, 'task')
ON CONFLICT (status_key) DO NOTHING;

-- ================================================================
-- STEP 2: REPORT TYPE CONFIGURATION TABLE
-- ================================================================
-- Dynamic report type definitions with filter logic
CREATE TABLE IF NOT EXISTS report_type_config (
  id SERIAL PRIMARY KEY,
  type_key VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  filter_logic JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_type_key ON report_type_config(type_key);

-- Seed report type data
INSERT INTO report_type_config (type_key, display_name, description, filter_logic) VALUES
('start', 'Start of Day Report', 'Tasks planned for the day',
 '{"include_statuses": ["pending", "blocked"]}'::jsonb),
('eod', 'End of Day Report', 'All tasks with progress status',
 '{"exclude_statuses": ["archived"]}'::jsonb),
('weekly', 'Weekly Summary', 'Summary of tasks for the week',
 '{"exclude_statuses": ["archived"]}'::jsonb)
ON CONFLICT (type_key) DO NOTHING;

-- ================================================================
-- STEP 3: TASK REPORTS TABLE
-- ================================================================
-- Store report snapshots with metadata
CREATE TABLE IF NOT EXISTS task_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL REFERENCES report_type_config(type_key),
  report_date DATE NOT NULL,
  check_in_time TIMESTAMP,
  break_duration INTEGER DEFAULT 0,
  sent_at TIMESTAMP,
  sent_to VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_message_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_reports_user ON task_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_date ON task_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_task_reports_type ON task_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON task_reports(status);

-- ================================================================
-- STEP 4: TASK REPORT ITEMS TABLE
-- ================================================================
-- Links tasks to reports with status snapshot
CREATE TABLE IF NOT EXISTS task_report_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES task_reports(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  task_title TEXT NOT NULL,
  task_status VARCHAR(50) NOT NULL,
  task_priority VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_report_items_report ON task_report_items(report_id);
CREATE INDEX IF NOT EXISTS idx_task_report_items_task ON task_report_items(task_id);

-- ================================================================
-- STEP 5: SUBTASK REPORT ITEMS TABLE
-- ================================================================
-- Store individual subtask statuses in reports
CREATE TABLE IF NOT EXISTS subtask_report_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_item_id UUID NOT NULL REFERENCES task_report_items(id) ON DELETE CASCADE,
  subtask_id VARCHAR(255) NOT NULL,
  subtask_title TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subtask_report_items_report_item ON subtask_report_items(report_item_id);

-- ================================================================
-- STEP 6: MODIFY EXISTING TASKS TABLE
-- ================================================================
-- Add report tracking fields to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS last_reported_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_report_id UUID REFERENCES task_reports(id);

-- Create index for report tracking
CREATE INDEX IF NOT EXISTS idx_tasks_last_report ON tasks(last_report_id);

-- ================================================================
-- STEP 7: CREATE VIEW FOR REPORT SUMMARY
-- ================================================================
-- Convenient view for report listing
CREATE OR REPLACE VIEW task_reports_summary AS
SELECT
  tr.id,
  tr.user_id,
  u.name AS user_name,
  tr.report_type,
  rtc.display_name AS report_type_name,
  tr.report_date,
  tr.check_in_time,
  tr.sent_at,
  tr.status,
  tr.whatsapp_sent,
  COUNT(DISTINCT tri.id) AS task_count,
  COUNT(DISTINCT sri.id) AS subtask_count,
  tr.created_at,
  tr.updated_at
FROM task_reports tr
LEFT JOIN users u ON tr.user_id = u.id
LEFT JOIN report_type_config rtc ON tr.report_type = rtc.type_key
LEFT JOIN task_report_items tri ON tr.id = tri.report_id
LEFT JOIN subtask_report_items sri ON tri.id = sri.report_item_id
GROUP BY tr.id, u.name, rtc.display_name;

-- ================================================================
-- STEP 8: CREATE TRIGGER FOR UPDATED_AT
-- ================================================================
-- Auto-update updated_at timestamp

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to status_config
DROP TRIGGER IF EXISTS update_status_config_updated_at ON status_config;
CREATE TRIGGER update_status_config_updated_at
    BEFORE UPDATE ON status_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to report_type_config
DROP TRIGGER IF EXISTS update_report_type_config_updated_at ON report_type_config;
CREATE TRIGGER update_report_type_config_updated_at
    BEFORE UPDATE ON report_type_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to task_reports
DROP TRIGGER IF EXISTS update_task_reports_updated_at ON task_reports;
CREATE TRIGGER update_task_reports_updated_at
    BEFORE UPDATE ON task_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
--
-- Summary of changes:
-- 1. Created status_config table (centralized status definitions)
-- 2. Created report_type_config table (dynamic report types)
-- 3. Created task_reports table (report snapshots)
-- 4. Created task_report_items table (task-report linkage)
-- 5. Created subtask_report_items table (subtask statuses)
-- 6. Modified tasks table (added report tracking)
-- 7. Created task_reports_summary view
-- 8. Added auto-update triggers
--
-- Next steps:
-- 1. Update API endpoints to use new tables
-- 2. Update frontend to fetch config from database
-- 3. Implement report CRUD operations
-- 4. Update REUSABLE_REFERENCE.md documentation
-- ================================================================
