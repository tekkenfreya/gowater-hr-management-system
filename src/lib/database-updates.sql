-- Database Schema Updates for Leave Management System
-- Run this after the initial schema setup

-- 1. Add manager hierarchy to users table
ALTER TABLE users
ADD COLUMN manager_id INTEGER REFERENCES users(id);

-- 2. Update attendance status enum to include 'leave'
ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE attendance
ADD CONSTRAINT attendance_status_check
CHECK (status IN ('present', 'absent', 'late', 'on_duty', 'leave'));

-- 3. Add work_location field to attendance (if not exists)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS work_location TEXT CHECK (work_location IN ('WFH', 'Onsite'));

-- 4. Create notifications table for global notification system
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('leave_request', 'leave_approved', 'leave_rejected', 'attendance_alert', 'task_assigned', 'system_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Store additional data like leave_request_id, etc.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approver_id ON leave_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- 6. Update leave_requests table to include comments field
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS comments TEXT;

-- 7. Create view for manager-employee relationships
CREATE OR REPLACE VIEW manager_employees AS
SELECT
  m.id as manager_id,
  m.name as manager_name,
  m.email as manager_email,
  e.id as employee_id,
  e.name as employee_name,
  e.email as employee_email,
  e.department as employee_department
FROM users m
JOIN users e ON e.manager_id = m.id
WHERE m.status = 'active' AND e.status = 'active';

-- 8. Create view for leave requests with user details
CREATE OR REPLACE VIEW leave_requests_with_details AS
SELECT
  lr.*,
  u.name as employee_name,
  u.email as employee_email,
  u.department as employee_department,
  a.name as approver_name,
  a.email as approver_email,
  (lr.end_date - lr.start_date + 1) as total_days
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
LEFT JOIN users a ON lr.approver_id = a.id;

-- 9. Add position field to users table (separate from role)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS position TEXT;

-- 10. Update existing inactive users to allow email reuse
-- This modifies emails of inactive users to append a timestamp, allowing the original email to be reused
UPDATE users
SET email = email || '_deleted_' || EXTRACT(EPOCH FROM updated_at)::bigint
WHERE status = 'inactive'
  AND email NOT LIKE '%_deleted_%';

-- 11. Add employee_id field for login and identification (format: R-001, R-002, etc.)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;