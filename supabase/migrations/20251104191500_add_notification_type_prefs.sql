-- Add type preferences and actions flags
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS enabled_types TEXT[] DEFAULT ARRAY['dose_due','refill_reminder','streak_milestone'],
  ADD COLUMN IF NOT EXISTS default_type TEXT DEFAULT 'dose_due',
  ADD COLUMN IF NOT EXISTS use_actions BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS action_settings JSONB DEFAULT '{}'::jsonb;

