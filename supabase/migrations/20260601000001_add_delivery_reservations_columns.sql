-- Add delivery, takeaway, and reservations columns to restaurants table
-- PROBLEMA 3 FIX: el updatePayload de BusinessSettings enviaba estas columnas que no existían en la BD
-- Ejecutar en Supabase Dashboard > SQL Editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_enabled          BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_time_estimate    INTEGER     DEFAULT 30,
  ADD COLUMN IF NOT EXISTS delivery_min_order        NUMERIC     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_type         TEXT        DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS delivery_fee_value        NUMERIC     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zones            JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS takeaway_enabled          BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS takeaway_time_estimate    INTEGER     DEFAULT 15,
  ADD COLUMN IF NOT EXISTS reservations_enabled      BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservations_collect_guests BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservations_advance_days INTEGER     DEFAULT 30,
  ADD COLUMN IF NOT EXISTS reservations_min_hours    INTEGER     DEFAULT 2,
  ADD COLUMN IF NOT EXISTS reservations_max_party    INTEGER     DEFAULT 20,
  ADD COLUMN IF NOT EXISTS reservations_time_slots   JSONB       DEFAULT '["20:00","21:00","22:00"]',
  ADD COLUMN IF NOT EXISTS reservations_message      TEXT        DEFAULT '¡Gracias por tu reserva! Te esperamos.';
