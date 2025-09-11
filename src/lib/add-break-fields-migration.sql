-- Migration to add break fields to attendance table
-- Run this in your Supabase SQL editor

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_end_time TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 0;

-- Add comment for break_duration field
COMMENT ON COLUMN attendance.break_duration IS 'Total break time in seconds';