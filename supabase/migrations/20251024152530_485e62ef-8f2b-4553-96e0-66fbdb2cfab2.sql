-- Add snooze_until column to dose_logs table
ALTER TABLE dose_logs
ADD COLUMN snooze_until timestamp with time zone;

-- Update status check to include snoozed
COMMENT ON COLUMN dose_logs.status IS 'Status of the dose: pending, taken, skipped, or snoozed';