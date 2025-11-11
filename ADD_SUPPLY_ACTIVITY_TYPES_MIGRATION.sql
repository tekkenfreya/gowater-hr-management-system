-- ================================================================
-- MIGRATION: Add Supply-Specific Activity Types
-- Date: 2025-11-11
-- Description: Adds 3 new activity types for Supply category:
--              - active-supplier
--              - recording
--              - checking
-- ================================================================

-- Drop the existing constraint
ALTER TABLE lead_activities
DROP CONSTRAINT IF EXISTS lead_activities_activity_type_check;

-- Add the new constraint with additional activity types for supply
ALTER TABLE lead_activities
ADD CONSTRAINT lead_activities_activity_type_check
CHECK (activity_type IN (
  'call',
  'email',
  'meeting',
  'site-visit',
  'follow-up',
  'remark',
  'other',
  'active-supplier',
  'recording',
  'checking'
));

-- ================================================================
-- NOTES:
-- ================================================================
-- The new activity types are:
-- - 'active-supplier': For suppliers that are currently active
-- - 'recording': For recording purposes
-- - 'checking': For checking/verification purposes
--
-- These activity types will ONLY be shown in the UI for Supply category entries.
-- Lead and Event categories will continue to see the original 7 activity types.
-- ================================================================
