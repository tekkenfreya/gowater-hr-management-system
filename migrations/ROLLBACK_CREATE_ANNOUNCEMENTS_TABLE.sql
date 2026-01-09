-- Rollback: Drop announcements table and related objects
DROP TRIGGER IF EXISTS trigger_announcements_updated_at ON announcements;
DROP FUNCTION IF EXISTS update_announcements_updated_at();
DROP INDEX IF EXISTS idx_announcements_created_at;
DROP INDEX IF EXISTS idx_announcements_active;
DROP TABLE IF EXISTS announcements;
