-- Create pharmacies table
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  fax_number TEXT,
  notes TEXT,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pharmacies
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- Policies for pharmacies
CREATE POLICY "Users can view their own pharmacies"
  ON public.pharmacies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pharmacies"
  ON public.pharmacies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pharmacies"
  ON public.pharmacies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pharmacies"
  ON public.pharmacies FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient querying
CREATE INDEX idx_pharmacies_user_id ON public.pharmacies(user_id);

-- Create refill_history table
CREATE TABLE IF NOT EXISTS public.refill_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  quantity_added INTEGER NOT NULL CHECK (quantity_added > 0),
  prescription_number TEXT,
  prescriber_name TEXT,
  cost DECIMAL(10, 2),
  insurance_covered BOOLEAN DEFAULT false,
  copay_amount DECIMAL(10, 2),
  refill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_date DATE,
  pickup_date DATE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('requested', 'ready', 'picked_up', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on refill_history
ALTER TABLE public.refill_history ENABLE ROW LEVEL SECURITY;

-- Policies for refill_history
CREATE POLICY "Users can view their own refill history"
  ON public.refill_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own refill history"
  ON public.refill_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own refill history"
  ON public.refill_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own refill history"
  ON public.refill_history FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for efficient querying
CREATE INDEX idx_refill_history_medication_id ON public.refill_history(medication_id);
CREATE INDEX idx_refill_history_user_id ON public.refill_history(user_id);
CREATE INDEX idx_refill_history_refill_date ON public.refill_history(refill_date DESC);

-- Add pharmacy reference to medications table
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS preferred_pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_refill_date DATE,
ADD COLUMN IF NOT EXISTS prescription_number TEXT,
ADD COLUMN IF NOT EXISTS auto_refill_enabled BOOLEAN DEFAULT false;

-- Create trigger for updating updated_at on pharmacies
CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on refill_history
CREATE TRIGGER update_refill_history_updated_at
  BEFORE UPDATE ON public.refill_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();