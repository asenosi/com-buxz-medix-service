-- Create a public directory of health centers in Gauteng
CREATE TABLE public.health_centers_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  phone_number TEXT,
  email TEXT,
  clinic_name TEXT,
  address TEXT,
  region TEXT NOT NULL DEFAULT 'Gauteng',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_centers_directory ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view health centers directory" 
ON public.health_centers_directory 
FOR SELECT 
USING (true);

-- Insert Gauteng health centers
INSERT INTO public.health_centers_directory (name, specialty, phone_number, address, clinic_name) VALUES
  ('Netcare Sunninghill Hospital', 'General Practice', '+27 11 806 1500', 'Cnr Nanyuki & Arnott Rd, Sunninghill, Sandton, 2157', 'Netcare Group'),
  ('Life Healthcare Fourways Hospital', 'General Practice', '+27 11 875 1000', 'Cnr Cedar Rd & Fourways Blvd, Fourways, 2055', 'Life Healthcare'),
  ('Mediclinic Sandton', 'General Practice', '+27 11 709 2000', 'Cnr Peter Pl & Main Rd, Bryanston, Sandton, 2191', 'Mediclinic'),
  ('Charlotte Maxeke Johannesburg Academic Hospital', 'General Practice', '+27 11 488 3694', '17 Jubilee Rd, Parktown, Johannesburg, 2193', 'Public Hospital'),
  ('Steve Biko Academic Hospital', 'General Practice', '+27 12 354 1000', 'Malherbe St, Pretoria Central, Pretoria, 0001', 'Public Hospital'),
  ('Netcare Waterfall City Hospital', 'General Practice', '+27 10 020 4000', 'Jurg Ave, Waterfall City, Midrand, 1686', 'Netcare Group'),
  ('Life Wilgeheuwel Hospital', 'General Practice', '+27 11 950 6000', 'Cnr Amplifier & Planetarium Rd, Radiokop, Roodepoort, 1724', 'Life Healthcare'),
  ('Mediclinic Morningside', 'General Practice', '+27 11 282 5000', 'Corner Hill Rd & Rivonia Rd, Morningside, Sandton, 2196', 'Mediclinic'),
  ('Ahmed Kathrada Private Hospital', 'General Practice', '+27 11 812 1000', 'Cnr Ontdekkers & Scott St, Krugersdorp, 1739', 'Independent'),
  ('Life Groenkloof Hospital', 'General Practice', '+27 12 354 6000', 'George Storrar Dr, Groenkloof, Pretoria, 0181', 'Life Healthcare'),
  ('Netcare Montana Hospital', 'General Practice', '+27 12 764 3000', '1 Dulcie Rd, Montana Park, Pretoria, 0182', 'Netcare Group'),
  ('Mediclinic Midstream', 'General Practice', '+27 12 677 2000', 'Cnr K101 & Clifton Rd, Midstream Estate, Centurion, 1692', 'Mediclinic');