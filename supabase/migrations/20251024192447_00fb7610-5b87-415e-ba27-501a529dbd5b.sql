-- Add new columns to medications table for enhanced medication management
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS route_of_administration TEXT,
ADD COLUMN IF NOT EXISTS reason_for_taking TEXT,
ADD COLUMN IF NOT EXISTS medication_color TEXT DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS medication_icon TEXT DEFAULT 'pill',
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS treatment_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS refill_reminder_threshold INTEGER,
ADD COLUMN IF NOT EXISTS with_food_timing TEXT;