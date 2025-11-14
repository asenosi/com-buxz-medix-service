-- Create medical practitioners table
CREATE TABLE public.medical_practitioners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  phone_number TEXT,
  email TEXT,
  clinic_name TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medical_practitioners ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own practitioners"
ON public.medical_practitioners
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own practitioners"
ON public.medical_practitioners
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practitioners"
ON public.medical_practitioners
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practitioners"
ON public.medical_practitioners
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_medical_practitioners_updated_at
BEFORE UPDATE ON public.medical_practitioners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_medical_practitioners_user_id ON public.medical_practitioners(user_id);