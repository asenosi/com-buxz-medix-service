-- Add practitioner_id column to appointments table
ALTER TABLE public.appointments
ADD COLUMN practitioner_id UUID REFERENCES public.medical_practitioners(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX idx_appointments_practitioner_id ON public.appointments(practitioner_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN public.appointments.practitioner_id IS 'Optional link to saved medical practitioner. When set, practitioner details can be used instead of doctor_name/doctor_specialty fields.';