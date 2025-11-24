-- =====================================================
-- ATTENDANCE AUTOMATION MIGRATION
-- =====================================================
-- Description: Adds attendance automation settings table
--              to enable scheduled auto check-in/out and breaks
-- Date: 2025-11-24
-- Version: 1.0
-- =====================================================

-- =====================================================
-- STEP 1: Create attendance_automation_settings table
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance_automation_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  auto_check_in_time TIME,
  auto_check_out_time TIME,
  auto_break_start_time TIME,
  auto_break_duration INTEGER DEFAULT 60, -- minutes
  default_work_location VARCHAR(20) DEFAULT 'WFH' CHECK (default_work_location IN ('WFH', 'Onsite')),
  work_days JSONB DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_automation UNIQUE(user_id)
);

-- =====================================================
-- STEP 2: Create indexes for performance
-- =====================================================

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_automation_user
ON attendance_automation_settings(user_id);

-- Index for querying enabled automations
CREATE INDEX IF NOT EXISTS idx_automation_enabled
ON attendance_automation_settings(is_enabled)
WHERE is_enabled = TRUE;

-- Composite index for checking automation times
CREATE INDEX IF NOT EXISTS idx_automation_times
ON attendance_automation_settings(is_enabled, auto_check_in_time, auto_check_out_time)
WHERE is_enabled = TRUE;

-- =====================================================
-- STEP 3: Create trigger for updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_attendance_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendance_automation_timestamp
  BEFORE UPDATE ON attendance_automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_automation_updated_at();

-- =====================================================
-- STEP 4: Insert default global settings (user_id = NULL)
-- =====================================================

INSERT INTO attendance_automation_settings (
  user_id,
  is_enabled,
  auto_check_in_time,
  auto_check_out_time,
  auto_break_start_time,
  auto_break_duration,
  default_work_location,
  work_days
) VALUES (
  NULL, -- Global default settings
  FALSE, -- Disabled by default
  '09:00:00'::TIME, -- 9:00 AM check-in
  '18:00:00'::TIME, -- 6:00 PM check-out
  '12:00:00'::TIME, -- 12:00 PM break
  60, -- 60 minutes break
  'WFH',
  '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb
) ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- STEP 5: Add comments for documentation
-- =====================================================

COMMENT ON TABLE attendance_automation_settings IS
'Stores automation settings for user attendance. NULL user_id represents global default settings.';

COMMENT ON COLUMN attendance_automation_settings.user_id IS
'References users table. NULL for global default settings.';

COMMENT ON COLUMN attendance_automation_settings.is_enabled IS
'Whether automation is active for this user/globally.';

COMMENT ON COLUMN attendance_automation_settings.auto_check_in_time IS
'Scheduled time for automatic check-in (e.g., 09:00:00).';

COMMENT ON COLUMN attendance_automation_settings.auto_check_out_time IS
'Scheduled time for automatic check-out (e.g., 18:00:00).';

COMMENT ON COLUMN attendance_automation_settings.auto_break_start_time IS
'Scheduled time for automatic break start (e.g., 12:00:00).';

COMMENT ON COLUMN attendance_automation_settings.auto_break_duration IS
'Duration of break in minutes (default: 60).';

COMMENT ON COLUMN attendance_automation_settings.default_work_location IS
'Default work location for automated attendance (WFH or Onsite).';

COMMENT ON COLUMN attendance_automation_settings.work_days IS
'JSON array of work days when automation should run (e.g., ["Monday","Tuesday","Wednesday","Thursday","Friday"]).';

-- =====================================================
-- STEP 6: Grant permissions (if using RLS)
-- =====================================================

-- Admin users can manage all automation settings
-- Regular users can view their own settings (if needed in future)

-- Note: Actual RLS policies should be added based on your security requirements
-- Example policies (commented out, enable if needed):

-- ALTER TABLE attendance_automation_settings ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "admin_all_access" ON attendance_automation_settings
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- CREATE POLICY "users_view_own" ON attendance_automation_settings
--   FOR SELECT
--   USING (
--     user_id = auth.uid()
--     OR user_id IS NULL -- Allow viewing global settings
--   );

-- =====================================================
-- STEP 7: Create helper function to get effective settings
-- =====================================================

-- This function returns the effective automation settings for a user
-- If user has custom settings, return those; otherwise return global defaults

CREATE OR REPLACE FUNCTION get_effective_automation_settings(p_user_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  user_id INTEGER,
  is_enabled BOOLEAN,
  auto_check_in_time TIME,
  auto_check_out_time TIME,
  auto_break_start_time TIME,
  auto_break_duration INTEGER,
  default_work_location VARCHAR(20),
  work_days JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.is_enabled,
    s.auto_check_in_time,
    s.auto_check_out_time,
    s.auto_break_start_time,
    s.auto_break_duration,
    s.default_work_location,
    s.work_days
  FROM attendance_automation_settings s
  WHERE s.user_id = p_user_id

  UNION ALL

  SELECT
    s.id,
    s.user_id,
    s.is_enabled,
    s.auto_check_in_time,
    s.auto_check_out_time,
    s.auto_break_start_time,
    s.auto_break_duration,
    s.default_work_location,
    s.work_days
  FROM attendance_automation_settings s
  WHERE s.user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM attendance_automation_settings
    WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_effective_automation_settings IS
'Returns automation settings for a user. Falls back to global settings if user has no custom settings.';

-- =====================================================
-- STEP 8: Create function to check if automation should run
-- =====================================================

CREATE OR REPLACE FUNCTION should_run_automation(
  p_user_id INTEGER,
  p_current_time TIME,
  p_current_day VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
  v_work_days TEXT[];
BEGIN
  -- Get effective settings for user
  SELECT * INTO v_settings
  FROM get_effective_automation_settings(p_user_id);

  -- Check if automation is enabled
  IF v_settings.is_enabled = FALSE THEN
    RETURN FALSE;
  END IF;

  -- Parse work_days JSON to array
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(v_settings.work_days)
  ) INTO v_work_days;

  -- Check if current day is a work day
  IF NOT (p_current_day = ANY(v_work_days)) THEN
    RETURN FALSE;
  END IF;

  -- Check if current time matches any automation time (within 1 minute tolerance)
  IF (
    ABS(EXTRACT(EPOCH FROM (p_current_time - v_settings.auto_check_in_time))) < 60 OR
    ABS(EXTRACT(EPOCH FROM (p_current_time - v_settings.auto_check_out_time))) < 60 OR
    ABS(EXTRACT(EPOCH FROM (p_current_time - v_settings.auto_break_start_time))) < 60
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION should_run_automation IS
'Checks if automation should run for a user at the current time and day.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verification queries (run these to verify migration):
-- SELECT * FROM attendance_automation_settings WHERE user_id IS NULL;
-- SELECT * FROM get_effective_automation_settings(1);
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance_automation_settings';

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================

-- To rollback this migration, run:
-- DROP FUNCTION IF EXISTS should_run_automation(INTEGER, TIME, VARCHAR);
-- DROP FUNCTION IF EXISTS get_effective_automation_settings(INTEGER);
-- DROP TRIGGER IF EXISTS trigger_update_attendance_automation_timestamp ON attendance_automation_settings;
-- DROP FUNCTION IF EXISTS update_attendance_automation_updated_at();
-- DROP TABLE IF EXISTS attendance_automation_settings CASCADE;
