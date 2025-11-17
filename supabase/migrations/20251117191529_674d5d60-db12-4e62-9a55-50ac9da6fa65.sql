-- Add fulfillment_method column to refill_history table
ALTER TABLE refill_history 
ADD COLUMN fulfillment_method text DEFAULT 'collection' CHECK (fulfillment_method IN ('collection', 'delivery'));