-- Create crm_contacts table with RLS
-- PROBLEMA 2 FIX: la tabla no existía, lo que causaba "Error al cargar clientes"
-- Ejecutar en Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS crm_contacts (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id     uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  first_name        text        NOT NULL DEFAULT '',
  last_name         text        NOT NULL DEFAULT '',
  phone             text        NOT NULL DEFAULT '',
  email             text,
  total_visits      integer     DEFAULT 0,
  total_spent       numeric     DEFAULT 0,
  avg_ticket        numeric     DEFAULT 0,
  first_visit_date  date,
  last_visit_date   date,
  is_vip            boolean     DEFAULT false,
  tags              text[]      DEFAULT '{}',
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Index for fast lookup by restaurant
CREATE INDEX IF NOT EXISTS crm_contacts_restaurant_id_idx ON crm_contacts(restaurant_id);
CREATE INDEX IF NOT EXISTS crm_contacts_phone_idx         ON crm_contacts(restaurant_id, phone);
CREATE INDEX IF NOT EXISTS crm_contacts_last_visit_idx    ON crm_contacts(restaurant_id, last_visit_date DESC);

-- Enable RLS
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: owners can do everything with their own contacts
DROP POLICY IF EXISTS "Owners manage their CRM" ON crm_contacts;
CREATE POLICY "Owners manage their CRM"
  ON crm_contacts FOR ALL
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );
