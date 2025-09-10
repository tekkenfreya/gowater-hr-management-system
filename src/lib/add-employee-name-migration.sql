-- Migration to add employee_name column to users table
-- Run this in your Supabase SQL editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Optional: Update existing users to have their name as default employee_name
UPDATE users SET employee_name = name WHERE employee_name IS NULL;