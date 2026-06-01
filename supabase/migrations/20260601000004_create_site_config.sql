-- site_config: global landing page configuration (single-row table)
CREATE TABLE IF NOT EXISTS site_config (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_link             text NOT NULL DEFAULT 'mailto:contacto@menulife.digital',
  contact_link          text NOT NULL DEFAULT 'mailto:contacto@menulife.digital',
  tester_restaurant_id  uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Only super-admins should read/write this — restrict to service role or authenticated users
-- For now allow all authenticated to read (landing can fetch publicly if needed)
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage site_config"
  ON site_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed one default row so selects always return something
INSERT INTO site_config (demo_link, contact_link)
VALUES ('mailto:contacto@menulife.digital', 'mailto:contacto@menulife.digital')
ON CONFLICT DO NOTHING;
