-- Rollback attendance photo fields
-- Migration: ROLLBACK_ATTENDANCE_PHOTO_FIELDS
-- Date: 2026-01-05
-- Description: Remove photo/selfie columns from attendance table

-- Remove photo fields from attendance table
ALTER TABLE attendance
DROP COLUMN IF EXISTS check_in_photo_url,
DROP COLUMN IF EXISTS check_in_photo_path,
DROP COLUMN IF EXISTS check_out_photo_url,
DROP COLUMN IF EXISTS check_out_photo_path;
