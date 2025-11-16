-- Add calendar sync tracking to appointments table
ALTER TABLE public.appointments 
ADD COLUMN calendar_synced BOOLEAN DEFAULT false,
ADD COLUMN calendar_event_id TEXT;

-- Add index for efficient querying of synced appointments
CREATE INDEX idx_appointments_calendar_synced ON public.appointments(calendar_synced);

-- Add comment
COMMENT ON COLUMN public.appointments.calendar_synced IS 'Tracks whether this appointment has been synced to external calendar';
COMMENT ON COLUMN public.appointments.calendar_event_id IS 'External calendar event ID for synced appointments';