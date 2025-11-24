-- ================================================================
-- MIGRATION: Remove Boss Role + Add Granular Permissions System
-- ================================================================
-- Date: 2025-11-24
-- Purpose:
--   1. Remove 'boss' role from system (replace with permission-based access)
--   2. Create permissions table for granular access control
--   3. Create user_permissions junction table
--   4. Migrate any existing 'boss' users to 'manager' role
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Create Permissions Table
-- ================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'analytics', 'management', 'reports', etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);

-- Insert default permissions
INSERT INTO permissions (permission_key, display_name, description, category) VALUES
  ('can_view_analytics', 'View Analytics', 'Access lead analytics and dashboards', 'analytics'),
  ('can_view_activity_monitor', 'View Activity Monitor', 'Monitor employee activities and performance', 'analytics'),
  ('can_manage_users', 'Manage Users', 'Create, update, and delete user accounts', 'management'),
  ('can_manage_tasks', 'Manage All Tasks', 'View and manage tasks for all users', 'management'),
  ('can_export_reports', 'Export Reports', 'Export data and generate reports', 'reports'),
  ('can_manage_attendance', 'Manage Attendance', 'View and manage attendance for all users', 'management'),
  ('can_approve_leaves', 'Approve Leave Requests', 'Approve or reject leave requests', 'management'),
  ('can_view_all_leads', 'View All Assigned Tasks', 'View all assigned tasks regardless of assignment', 'tasks')
ON CONFLICT (permission_key) DO NOTHING;

-- ================================================================
-- STEP 2: Create User Permissions Junction Table
-- ================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by INTEGER REFERENCES users(id), -- Who granted this permission
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id) -- Prevent duplicate permissions
);

-- Create indexes for efficient permission checking
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);

-- ================================================================
-- STEP 3: Migrate Existing 'Boss' Users to 'Manager' Role
-- ================================================================

-- Check if any users have 'boss' role (they shouldn't based on DB constraint, but just in case)
DO $$
DECLARE
  boss_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO boss_count FROM users WHERE role = 'boss';

  IF boss_count > 0 THEN
    RAISE NOTICE 'Found % users with boss role - migrating to manager', boss_count;

    -- Update all boss users to manager role
    UPDATE users
    SET role = 'manager',
        updated_at = NOW()
    WHERE role = 'boss';

    -- Grant all analytics permissions to former boss users
    INSERT INTO user_permissions (user_id, permission_id, granted_by)
    SELECT
      u.id as user_id,
      p.id as permission_id,
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as granted_by
    FROM users u
    CROSS JOIN permissions p
    WHERE u.role = 'manager'
      AND p.permission_key IN ('can_view_analytics', 'can_view_activity_monitor')
    ON CONFLICT (user_id, permission_id) DO NOTHING;

    RAISE NOTICE 'Successfully migrated % boss users to manager with analytics permissions', boss_count;
  ELSE
    RAISE NOTICE 'No boss users found in database';
  END IF;
END $$;

-- ================================================================
-- STEP 4: Update Users Table Role Constraint
-- ================================================================

-- Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint WITHOUT 'boss' role
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'employee', 'manager'));

-- ================================================================
-- STEP 5: Grant Default Permissions to Admin Role
-- ================================================================

-- All admins get all permissions by default
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT
  u.id as user_id,
  p.id as permission_id,
  u.id as granted_by -- Self-granted for admins
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'admin'
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- ================================================================
-- STEP 6: Grant Default Permissions to Manager Role
-- ================================================================

-- Managers get team management permissions by default
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT
  u.id as user_id,
  p.id as permission_id,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as granted_by
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'manager'
  AND p.permission_key IN ('can_manage_tasks', 'can_manage_attendance', 'can_approve_leaves', 'can_view_all_leads')
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- ================================================================
-- STEP 7: Create Helper Functions
-- ================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id INTEGER,
  p_permission_key VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  -- Admins always have all permissions
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin'
  ) INTO has_perm;

  IF has_perm THEN
    RETURN TRUE;
  END IF;

  -- Check if user has explicit permission
  SELECT EXISTS(
    SELECT 1
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
      AND p.permission_key = p_permission_key
      AND p.is_active = TRUE
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id INTEGER)
RETURNS TABLE(
  permission_key VARCHAR(100),
  display_name VARCHAR(255),
  description TEXT,
  category VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.permission_key,
    p.display_name,
    p.description,
    p.category
  FROM permissions p
  LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = p_user_id
  WHERE p.is_active = TRUE
    AND (
      -- User is admin (has all permissions)
      EXISTS(SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin')
      -- OR user has explicit permission
      OR up.id IS NOT NULL
    )
  ORDER BY p.category, p.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 8: Add Triggers for Updated_At Timestamps
-- ================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ================================================================

/*
-- 1. Check permissions table
SELECT * FROM permissions ORDER BY category, display_name;

-- 2. Check user_permissions for a specific user
SELECT
  u.name,
  u.role,
  p.permission_key,
  p.display_name,
  up.granted_at
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN permissions p ON up.permission_id = p.id
WHERE u.id = YOUR_USER_ID
ORDER BY p.category, p.display_name;

-- 3. Check all users and their permission counts
SELECT
  u.id,
  u.name,
  u.role,
  COUNT(up.id) as permission_count
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
GROUP BY u.id, u.name, u.role
ORDER BY u.role, u.name;

-- 4. Test permission checking function
SELECT user_has_permission(YOUR_USER_ID, 'can_view_analytics');

-- 5. Get all permissions for a user
SELECT * FROM get_user_permissions(YOUR_USER_ID);

-- 6. Verify role constraint (should only allow admin, employee, manager)
SELECT DISTINCT role FROM users;
*/

-- ================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ================================================================

/*
-- WARNING: Only run this if you need to rollback the migration

BEGIN;

-- Drop tables
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS user_has_permission(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS get_user_permissions(INTEGER);

-- Restore old constraint (with boss)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'employee', 'manager', 'boss'));

COMMIT;
*/

-- ================================================================
-- NOTES
-- ================================================================
-- 1. Boss role has been completely removed from the system
-- 2. All permission checks should now use user_has_permission() function
-- 3. Admins automatically have ALL permissions
-- 4. Managers get default team management permissions
-- 5. Employees have no permissions by default (must be granted explicitly)
-- 6. Frontend and API code must be updated to use permission checks instead of role === 'boss'
-- ================================================================
