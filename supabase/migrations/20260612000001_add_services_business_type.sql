-- Add 'services' as a valid business_type value
-- Handles both check constraint and enum scenarios

-- Drop existing check constraint if present (text column with CHECK)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_business_type_check;

-- Re-add constraint including 'services'
ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_business_type_check
  CHECK (business_type IN ('gastronomy', 'retail', 'services') OR business_type IS NULL);

-- If business_type is a Postgres enum, run this instead:
-- DO $$
-- BEGIN
--   ALTER TYPE business_type_enum ADD VALUE IF NOT EXISTS 'services';
-- EXCEPTION WHEN duplicate_object THEN NULL;
-- END $$;
