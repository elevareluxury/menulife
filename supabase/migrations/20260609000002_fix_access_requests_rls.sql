-- Fix: access_requests has RLS enabled but no SELECT/UPDATE policy for authenticated users.
-- Result: superadmin sees an empty list even though rows exist.

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read (superadmin route is app-level protected)
DROP POLICY IF EXISTS "authenticated_read_access_requests"  ON access_requests;
CREATE POLICY "authenticated_read_access_requests"
  ON access_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: authenticated users can update status (approve/reject)
DROP POLICY IF EXISTS "authenticated_update_access_requests" ON access_requests;
CREATE POLICY "authenticated_update_access_requests"
  ON access_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- INSERT: anon users can submit the public form
DROP POLICY IF EXISTS "anon_insert_access_requests" ON access_requests;
CREATE POLICY "anon_insert_access_requests"
  ON access_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verify
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'access_requests';
