-- =====================================================
-- FIX: RLS para restaurants UPDATE + bucket restaurant-assets
-- =====================================================

-- 1. Bucket restaurant-assets (portada del menú)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas storage para restaurant-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Auth can upload restaurant assets'
  ) THEN
    CREATE POLICY "Auth can upload restaurant assets"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'restaurant-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public can read restaurant assets'
  ) THEN
    CREATE POLICY "Public can read restaurant assets"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'restaurant-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Auth can update restaurant assets'
  ) THEN
    CREATE POLICY "Auth can update restaurant assets"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'restaurant-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Auth can delete restaurant assets'
  ) THEN
    CREATE POLICY "Auth can delete restaurant assets"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'restaurant-assets');
  END IF;
END $$;

-- 2. Política UPDATE en la tabla restaurants
-- Sin esto, el UPDATE retorna error=null pero afecta 0 filas (fallo silencioso)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurants'
    AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Owners can update their restaurant"
      ON public.restaurants FOR UPDATE TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- 3. Verificación: mostrar políticas activas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE (schemaname = 'public' AND tablename = 'restaurants')
   OR (schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%restaurant%')
ORDER BY tablename, cmd;
