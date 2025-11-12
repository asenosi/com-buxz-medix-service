-- Create table for storing user calendar sync settings and OAuth tokens
CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own calendar sync settings"
  ON public.calendar_sync_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar sync settings"
  ON public.calendar_sync_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar sync settings"
  ON public.calendar_sync_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar sync settings"
  ON public.calendar_sync_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for efficient lookups
CREATE INDEX idx_calendar_sync_settings_user_id ON public.calendar_sync_settings(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_sync_settings_updated_at
  BEFORE UPDATE ON public.calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();