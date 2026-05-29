-- Add allow_language_switch column to restaurants
-- Allows owners to control whether customers can switch menu language

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS allow_language_switch BOOLEAN DEFAULT true;

-- Ensure default_language has a sensible default
ALTER TABLE restaurants
ALTER COLUMN default_language SET DEFAULT 'ES';
