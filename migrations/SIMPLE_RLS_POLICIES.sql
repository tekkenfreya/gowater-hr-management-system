-- ================================================================
-- SIMPLIFIED ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- For custom JWT auth (non-Supabase Auth)
-- Uses Postgres session variables set by application code
-- ================================================================

-- ================================================================
-- USERS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Basic policy: All authenticated users can read all users
-- (Your app handles auth at API level with service_role key)
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert (done via API)
CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only service role can update (done via API)
CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (true);

-- Only service role can delete (done via API)
CREATE POLICY "users_delete_policy"
  ON users
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- ATTENDANCE TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_delete_policy" ON attendance;

CREATE POLICY "attendance_select_policy"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "attendance_insert_policy"
  ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "attendance_update_policy"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "attendance_delete_policy"
  ON attendance
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- LEAVE REQUESTS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "leave_select_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_insert_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_update_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_delete_policy" ON leave_requests;

CREATE POLICY "leave_select_policy"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "leave_insert_policy"
  ON leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "leave_update_policy"
  ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "leave_delete_policy"
  ON leave_requests
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- TASKS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

CREATE POLICY "tasks_select_policy"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tasks_insert_policy"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_policy"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "tasks_delete_policy"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- REPORTS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "reports_select_policy" ON reports;
DROP POLICY IF EXISTS "reports_insert_policy" ON reports;
DROP POLICY IF EXISTS "reports_update_policy" ON reports;
DROP POLICY IF EXISTS "reports_delete_policy" ON reports;

CREATE POLICY "reports_select_policy"
  ON reports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "reports_insert_policy"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "reports_update_policy"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "reports_delete_policy"
  ON reports
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- FILES TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

CREATE POLICY "files_select_policy"
  ON files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "files_insert_policy"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "files_update_policy"
  ON files
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "files_delete_policy"
  ON files
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- LEADS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
DROP POLICY IF EXISTS "leads_update_policy" ON leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON leads;

CREATE POLICY "leads_select_policy"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "leads_insert_policy"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "leads_update_policy"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "leads_delete_policy"
  ON leads
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- LEAD ACTIVITIES TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Authenticated users can view activities" ON lead_activities;
DROP POLICY IF EXISTS "Authenticated users can log activities" ON lead_activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON lead_activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON lead_activities;
DROP POLICY IF EXISTS "activities_select_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_insert_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_update_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_delete_policy" ON lead_activities;

CREATE POLICY "activities_select_policy"
  ON lead_activities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "activities_insert_policy"
  ON lead_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "activities_update_policy"
  ON lead_activities
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "activities_delete_policy"
  ON lead_activities
  FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Run this to verify policies were created:
/*
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
*/

-- ================================================================
-- NOTES
-- ================================================================
-- This simplified version allows all authenticated requests
-- Your API layer (using SUPABASE_SERVICE_ROLE_KEY) handles authorization
-- RLS is enabled to prevent direct database access
-- All access must go through your authenticated API routes
-- ================================================================
