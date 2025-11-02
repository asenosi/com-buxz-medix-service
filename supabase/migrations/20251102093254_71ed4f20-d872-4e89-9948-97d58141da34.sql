-- Add grace period and reminder fields to medications table
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS frequency_type text,
ADD COLUMN IF NOT EXISTS grace_period_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS reminder_window_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS missed_dose_cutoff_minutes integer DEFAULT 180;

-- Add frequency type to medication_schedules
ALTER TABLE public.medication_schedules
ADD COLUMN IF NOT EXISTS frequency_type text;

-- Add status and metadata to dose_logs
ALTER TABLE public.dose_logs
ADD COLUMN IF NOT EXISTS dose_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone;

-- Create index for efficient querying of upcoming doses
CREATE INDEX IF NOT EXISTS idx_dose_logs_scheduled_for ON public.dose_logs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_dose_logs_status ON public.dose_logs(status, dose_status);

COMMENT ON COLUMN medications.frequency_type IS 'Once daily, Twice daily, Three times daily, Four times daily, With meals, Before meals (fasting)';
COMMENT ON COLUMN medications.grace_period_minutes IS 'Minutes after scheduled time before dose is considered LATE';
COMMENT ON COLUMN medications.reminder_window_minutes IS 'Minutes before scheduled time to send reminder';
COMMENT ON COLUMN medications.missed_dose_cutoff_minutes IS 'Minutes after scheduled time before dose is considered MISSED';
COMMENT ON COLUMN dose_logs.dose_status IS 'ON_TIME, LATE, MISSED based on grace period rules';