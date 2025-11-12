-- Add foreign key constraint from appointments to medications
ALTER TABLE public.appointments
ADD CONSTRAINT fk_appointments_medication
FOREIGN KEY (medication_id)
REFERENCES public.medications(id)
ON DELETE SET NULL;