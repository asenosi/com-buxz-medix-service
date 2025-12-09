-- Create a security definer function to check caregiver access
CREATE OR REPLACE FUNCTION public.is_caregiver_of(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.caregiver_access
    WHERE caregiver_user_id = auth.uid()
      AND patient_user_id = _patient_id
  )
$$;

-- Create a function to get all patient IDs for a caregiver
CREATE OR REPLACE FUNCTION public.get_patient_ids_for_caregiver()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT patient_user_id
  FROM public.caregiver_access
  WHERE caregiver_user_id = auth.uid()
$$;

-- Allow caregivers to view their patients' medications (read-only)
CREATE POLICY "Caregivers can view patient medications"
ON public.medications
FOR SELECT
USING (
  user_id IN (SELECT public.get_patient_ids_for_caregiver())
);

-- Allow caregivers to view their patients' dose logs (read-only)
CREATE POLICY "Caregivers can view patient dose logs"
ON public.dose_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    WHERE m.id = dose_logs.medication_id
    AND m.user_id IN (SELECT public.get_patient_ids_for_caregiver())
  )
);

-- Allow caregivers to view their patients' medication schedules (read-only)
CREATE POLICY "Caregivers can view patient medication schedules"
ON public.medication_schedules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    WHERE m.id = medication_schedules.medication_id
    AND m.user_id IN (SELECT public.get_patient_ids_for_caregiver())
  )
);

-- Allow caregivers to view patient profiles (read-only)
CREATE POLICY "Caregivers can view patient profiles"
ON public.profiles
FOR SELECT
USING (
  user_id IN (SELECT public.get_patient_ids_for_caregiver())
);