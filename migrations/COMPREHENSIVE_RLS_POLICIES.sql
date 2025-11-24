-- ================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- Migration: Implement comprehensive RLS policies for all tables
-- Author: Security Audit Remediation
-- Date: 2025-11-24
--
-- SAFETY: This migration only ADDS policies, does not DROP or modify data
-- ROLLBACK: See rollback section at the end
-- ================================================================

-- ================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ================================================================

-- Create a helper function to get current user's role
-- This uses the JWT claim from Supabase auth
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.users
    WHERE id = auth.uid()::INTEGER
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if user is admin or boss
CREATE OR REPLACE FUNCTION public.is_admin_or_boss()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'boss');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- USERS TABLE POLICIES
-- ================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- SELECT: Users can view their own profile, admins/boss can view all
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- INSERT: Only admins can create new users
CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_boss());

-- UPDATE: Users can update their own profile, admins can update anyone
CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()::INTEGER
    OR is_admin_or_boss()
  )
  WITH CHECK (
    -- Prevent non-admins from changing their role
    (id = auth.uid()::INTEGER AND role = (SELECT role FROM users WHERE id = auth.uid()::INTEGER))
    OR is_admin_or_boss()
  );

-- DELETE: Only admins can delete users
CREATE POLICY "users_delete_policy"
  ON users
  FOR DELETE
  TO authenticated
  USING (is_admin_or_boss());

-- ================================================================
-- ATTENDANCE TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_delete_policy" ON attendance;

-- SELECT: Users see their own attendance, managers/admins/boss see all
CREATE POLICY "attendance_select_policy"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- INSERT: Users can only create their own attendance records
CREATE POLICY "attendance_insert_policy"
  ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- UPDATE: Users can update their own records, managers/admins can update all
CREATE POLICY "attendance_update_policy"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- DELETE: Only admins can delete attendance records (for corrections)
CREATE POLICY "attendance_delete_policy"
  ON attendance
  FOR DELETE
  TO authenticated
  USING (is_admin_or_boss());

-- ================================================================
-- LEAVE REQUESTS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "leave_select_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_insert_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_update_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_delete_policy" ON leave_requests;

-- SELECT: Users see their own requests, managers/admins/boss see all
CREATE POLICY "leave_select_policy"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- INSERT: Users can only create their own leave requests
CREATE POLICY "leave_insert_policy"
  ON leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::INTEGER);

-- UPDATE: Users can update pending requests, managers/admins can approve/reject
CREATE POLICY "leave_update_policy"
  ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid()::INTEGER AND status = 'pending')
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- DELETE: Users can delete pending requests, admins can delete any
CREATE POLICY "leave_delete_policy"
  ON leave_requests
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid()::INTEGER AND status = 'pending')
    OR is_admin_or_boss()
  );

-- ================================================================
-- TASKS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- SELECT: Users see assigned tasks, assigners see created tasks, managers/admins/boss see all
CREATE POLICY "tasks_select_policy"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR assigned_by = auth.uid()::INTEGER
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- INSERT: Managers and admins can create tasks
CREATE POLICY "tasks_insert_policy"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'manager', 'boss')
  );

-- UPDATE: Assigned users can update status, assigners/managers/admins can update all fields
CREATE POLICY "tasks_update_policy"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR assigned_by = auth.uid()::INTEGER
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- DELETE: Only task creators, managers, and admins can delete tasks
CREATE POLICY "tasks_delete_policy"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    assigned_by = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- ================================================================
-- REPORTS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "reports_select_policy" ON reports;
DROP POLICY IF EXISTS "reports_insert_policy" ON reports;
DROP POLICY IF EXISTS "reports_update_policy" ON reports;
DROP POLICY IF EXISTS "reports_delete_policy" ON reports;

-- SELECT: Users see their own reports, managers/admins/boss see all
CREATE POLICY "reports_select_policy"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- INSERT: Users can only create their own reports
CREATE POLICY "reports_insert_policy"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::INTEGER);

-- UPDATE: Users can update their own reports, admins can update all
CREATE POLICY "reports_update_policy"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- DELETE: Users can delete their own reports, admins can delete any
CREATE POLICY "reports_delete_policy"
  ON reports
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- ================================================================
-- FILES TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- SELECT: All authenticated users can view all files (shared resource)
CREATE POLICY "files_select_policy"
  ON files
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: All authenticated users can upload files
CREATE POLICY "files_insert_policy"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid()::INTEGER);

-- UPDATE: Users can update their own files, admins can update all
CREATE POLICY "files_update_policy"
  ON files
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- DELETE: Users can delete their own files, admins can delete any
CREATE POLICY "files_delete_policy"
  ON files
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()::INTEGER
    OR is_admin_or_boss()
  );

-- ================================================================
-- LEADS TABLE POLICIES (Enhanced from existing)
-- ================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

-- Drop new policy names if they exist
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
DROP POLICY IF EXISTS "leads_update_policy" ON leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON leads;

-- SELECT: All authenticated users can view leads (sales collaboration)
CREATE POLICY "leads_select_policy"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: All authenticated users can create leads
CREATE POLICY "leads_insert_policy"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Users can update leads they created or are assigned to, managers/admins can update all
CREATE POLICY "leads_update_policy"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT name FROM users WHERE id = auth.uid()::INTEGER)
    OR assigned_to = (SELECT name FROM users WHERE id = auth.uid()::INTEGER)
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- DELETE: Only lead creators, managers, and admins can delete leads
CREATE POLICY "leads_delete_policy"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT name FROM users WHERE id = auth.uid()::INTEGER)
    OR is_admin_or_boss()
  );

-- ================================================================
-- LEAD ACTIVITIES TABLE POLICIES (Enhanced from existing)
-- ================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view activities" ON lead_activities;
DROP POLICY IF EXISTS "Authenticated users can log activities" ON lead_activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON lead_activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON lead_activities;

-- Drop new policy names if they exist
DROP POLICY IF EXISTS "activities_select_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_insert_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_update_policy" ON lead_activities;
DROP POLICY IF EXISTS "activities_delete_policy" ON lead_activities;

-- SELECT: All authenticated users can view activities (transparency for boss tracking)
CREATE POLICY "activities_select_policy"
  ON lead_activities
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: All authenticated users can log activities
CREATE POLICY "activities_insert_policy"
  ON lead_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Users can update their own activities, managers/admins can update all
CREATE POLICY "activities_update_policy"
  ON lead_activities
  FOR UPDATE
  TO authenticated
  USING (
    employee_name = (SELECT name FROM users WHERE id = auth.uid()::INTEGER)
    OR get_user_role() IN ('admin', 'manager', 'boss')
  );

-- DELETE: Users can delete their own activities, admins can delete any
CREATE POLICY "activities_delete_policy"
  ON lead_activities
  FOR DELETE
  TO authenticated
  USING (
    employee_name = (SELECT name FROM users WHERE id = auth.uid()::INTEGER)
    OR is_admin_or_boss()
  );

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these queries to verify policies were created successfully

-- Check all policies
-- SELECT
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;

-- Count policies per table
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE):
-- - users: 4 policies
-- - attendance: 4 policies
-- - leave_requests: 4 policies
-- - tasks: 4 policies
-- - reports: 4 policies
-- - files: 4 policies
-- - leads: 4 policies
-- - lead_activities: 4 policies
-- TOTAL: 32 policies

-- ================================================================
-- ROLLBACK PROCEDURE
-- ================================================================
-- If you need to rollback this migration, run the following:

-- DROP POLICY IF EXISTS "users_select_policy" ON users;
-- DROP POLICY IF EXISTS "users_insert_policy" ON users;
-- DROP POLICY IF EXISTS "users_update_policy" ON users;
-- DROP POLICY IF EXISTS "users_delete_policy" ON users;
-- DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
-- DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance;
-- DROP POLICY IF EXISTS "attendance_update_policy" ON attendance;
-- DROP POLICY IF EXISTS "attendance_delete_policy" ON attendance;
-- DROP POLICY IF EXISTS "leave_select_policy" ON leave_requests;
-- DROP POLICY IF EXISTS "leave_insert_policy" ON leave_requests;
-- DROP POLICY IF EXISTS "leave_update_policy" ON leave_requests;
-- DROP POLICY IF EXISTS "leave_delete_policy" ON leave_requests;
-- DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
-- DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
-- DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
-- DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
-- DROP POLICY IF EXISTS "reports_select_policy" ON reports;
-- DROP POLICY IF EXISTS "reports_insert_policy" ON reports;
-- DROP POLICY IF EXISTS "reports_update_policy" ON reports;
-- DROP POLICY IF EXISTS "reports_delete_policy" ON reports;
-- DROP POLICY IF EXISTS "files_select_policy" ON files;
-- DROP POLICY IF EXISTS "files_insert_policy" ON files;
-- DROP POLICY IF EXISTS "files_update_policy" ON files;
-- DROP POLICY IF EXISTS "files_delete_policy" ON files;
-- DROP POLICY IF EXISTS "leads_select_policy" ON leads;
-- DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
-- DROP POLICY IF EXISTS "leads_update_policy" ON leads;
-- DROP POLICY IF EXISTS "leads_delete_policy" ON leads;
-- DROP POLICY IF EXISTS "activities_select_policy" ON lead_activities;
-- DROP POLICY IF EXISTS "activities_insert_policy" ON lead_activities;
-- DROP POLICY IF EXISTS "activities_update_policy" ON lead_activities;
-- DROP POLICY IF EXISTS "activities_delete_policy" ON lead_activities;
-- DROP FUNCTION IF EXISTS public.get_user_role();
-- DROP FUNCTION IF EXISTS public.is_admin_or_boss();

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- After running this migration:
-- 1. Run verification queries above
-- 2. Test with different user roles (employee, manager, admin, boss)
-- 3. Verify users can only access data according to their role
-- 4. Update REUSABLE_REFERENCE.md with RLS policy documentation
-- ================================================================
