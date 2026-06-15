-- Service terminology: per-restaurant customizable term overrides
CREATE TABLE IF NOT EXISTS service_terminology (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  preset         TEXT,
  terms          JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_terminology ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON service_terminology
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_service_terminology_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_terminology_updated_at
  BEFORE UPDATE ON service_terminology
  FOR EACH ROW EXECUTE FUNCTION update_service_terminology_updated_at();
