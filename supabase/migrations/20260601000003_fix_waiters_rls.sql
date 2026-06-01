-- Add RLS policy for waiters table
-- PROBLEMA 1 FIX: no existía ninguna política RLS para UPDATE en waiters,
-- lo que causaba que editar el PIN fallara silenciosamente con error de RLS
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Asegurarse de que RLS está habilitado
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;

-- Política única FOR ALL: SELECT + INSERT + UPDATE + DELETE
-- Verificamos con USING (lectura/update/delete) y WITH CHECK (insert/update)
DROP POLICY IF EXISTS "Owners manage their waiters" ON waiters;
CREATE POLICY "Owners manage their waiters"
  ON waiters FOR ALL
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

-- Verificar que las políticas quedaron bien
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'waiters';
