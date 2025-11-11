-- Create enum for appointment types
CREATE TYPE public.appointment_type AS ENUM (
  'checkup',
  'follow_up',
  'lab_test',
  'imaging',
  'procedure',
  'consultation',
  'vaccination',
  'therapy',
  'other'
);

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show'
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT,
  doctor_name TEXT,
  doctor_specialty TEXT,
  appointment_type appointment_type NOT NULL DEFAULT 'checkup',
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  reminder_minutes_before INTEGER DEFAULT 60,
  medication_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own appointments"
  ON public.appointments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON public.appointments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
  ON public.appointments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_appointments_user_date ON public.appointments(user_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_medication ON public.appointments(medication_id);