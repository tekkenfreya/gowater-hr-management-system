-- Add work_location field to attendance table
-- Migration to add dedicated work location field instead of storing in notes

-- Add the work_location column
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS work_location TEXT DEFAULT 'WFH' CHECK (work_location IN ('WFH', 'Onsite'));

-- Update existing records to extract work location from notes
UPDATE attendance
SET work_location = CASE
    WHEN notes LIKE '%Work Location: WFH%' THEN 'WFH'
    WHEN notes LIKE '%Work Location: Onsite%' THEN 'Onsite'
    ELSE 'WFH'
END
WHERE work_location IS NULL OR work_location = 'WFH';

-- Clean up notes field by removing work location entries (optional)
UPDATE attendance
SET notes = CASE
    WHEN notes = 'Work Location: WFH' OR notes = 'Work Location: Onsite' THEN NULL
    WHEN notes LIKE 'Work Location: WFH%' THEN TRIM(SUBSTR(notes, LENGTH('Work Location: WFH') + 1))
    WHEN notes LIKE 'Work Location: Onsite%' THEN TRIM(SUBSTR(notes, LENGTH('Work Location: Onsite') + 1))
    ELSE notes
END
WHERE notes LIKE '%Work Location:%';

-- Add index for better performance when filtering by work location
CREATE INDEX IF NOT EXISTS idx_attendance_work_location ON attendance (work_location);

-- Add comment for documentation
COMMENT ON COLUMN attendance.work_location IS 'Work location: WFH (Work From Home) or Onsite';