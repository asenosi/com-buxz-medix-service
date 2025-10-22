-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  phone_number TEXT,
  is_caregiver BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create medications table
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  form TEXT, -- pill, liquid, injection, etc.
  instructions TEXT,
  prescribing_doctor TEXT,
  refills_remaining INTEGER DEFAULT 0,
  total_pills INTEGER,
  pills_remaining INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Medications policies
CREATE POLICY "Users can view their own medications" 
ON public.medications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own medications" 
ON public.medications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications" 
ON public.medications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications" 
ON public.medications FOR DELETE 
USING (auth.uid() = user_id);

-- Create medication schedules table
CREATE TABLE public.medication_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc. NULL means every day
  with_food BOOLEAN DEFAULT false,
  special_instructions TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

-- Medication schedules policies
CREATE POLICY "Users can view schedules for their medications" 
ON public.medication_schedules FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = medication_schedules.medication_id 
    AND medications.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create schedules for their medications" 
ON public.medication_schedules FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = medication_schedules.medication_id 
    AND medications.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update schedules for their medications" 
ON public.medication_schedules FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = medication_schedules.medication_id 
    AND medications.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete schedules for their medications" 
ON public.medication_schedules FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = medication_schedules.medication_id 
    AND medications.user_id = auth.uid()
  )
);

-- Create dose logs table to track taken/missed doses
CREATE TABLE public.dose_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  taken_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, taken, missed, skipped
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;

-- Dose logs policies
CREATE POLICY "Users can view logs for their medications" 
ON public.dose_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = dose_logs.medication_id 
    AND medications.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create logs for their medications" 
ON public.dose_logs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = dose_logs.medication_id 
    AND medications.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update logs for their medications" 
ON public.dose_logs FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.medications 
    WHERE medications.id = dose_logs.medication_id 
    AND medications.user_id = auth.uid()
  )
);

-- Create caregiver access table
CREATE TABLE public.caregiver_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'view', -- view, manage
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_user_id, caregiver_user_id)
);

-- Enable RLS
ALTER TABLE public.caregiver_access ENABLE ROW LEVEL SECURITY;

-- Caregiver access policies
CREATE POLICY "Users can view who has access to them" 
ON public.caregiver_access FOR SELECT 
USING (auth.uid() = patient_user_id OR auth.uid() = caregiver_user_id);

CREATE POLICY "Patients can grant caregiver access" 
ON public.caregiver_access FOR INSERT 
WITH CHECK (auth.uid() = patient_user_id);

CREATE POLICY "Patients can revoke caregiver access" 
ON public.caregiver_access FOR DELETE 
USING (auth.uid() = patient_user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON public.medications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_medications_user_id ON public.medications(user_id);
CREATE INDEX idx_medication_schedules_medication_id ON public.medication_schedules(medication_id);
CREATE INDEX idx_dose_logs_medication_id ON public.dose_logs(medication_id);
CREATE INDEX idx_dose_logs_status ON public.dose_logs(status);
CREATE INDEX idx_dose_logs_scheduled_time ON public.dose_logs(scheduled_time);
CREATE INDEX idx_caregiver_access_patient ON public.caregiver_access(patient_user_id);
CREATE INDEX idx_caregiver_access_caregiver ON public.caregiver_access(caregiver_user_id);