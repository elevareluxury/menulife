-- Fix: bcryptjs (frontend) generates $2b$10$... hashes.
-- pgcrypto's crypt() uses $2a$ internally; when given a $2b$ hash it may produce
-- a $2a$-prefixed output, so the string comparison fails even though the bytes match.
-- Solution: normalize $2b$ → $2a$ before calling crypt() — functionally identical
-- for passwords ≤ 72 chars (all PINs qualify).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION verify_staff_pin(
  p_table text,
  p_id    uuid,
  p_pin   text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored text;
  v_hash   text;
BEGIN
  -- Fetch stored hash from the appropriate table
  IF p_table = 'waiters' THEN
    SELECT pin INTO v_stored
    FROM public.waiters
    WHERE id = p_id AND is_active = true;
  ELSIF p_table = 'delivery_drivers' THEN
    SELECT pin INTO v_stored
    FROM public.delivery_drivers
    WHERE id = p_id AND is_active = true;
  ELSE
    RETURN false;
  END IF;

  IF v_stored IS NULL THEN
    RETURN false;
  END IF;

  IF v_stored LIKE '$2%' THEN
    -- Normalize $2b$ (bcryptjs output) → $2a$ (pgcrypto-compatible prefix).
    -- substr() is 1-indexed; $2b$ is 4 chars, so substr(v_stored, 5) skips the prefix.
    v_hash := CASE
      WHEN v_stored LIKE '$2b$%' THEN '$2a$' || substr(v_stored, 5)
      ELSE v_stored
    END;
    RETURN v_hash = crypt(p_pin, v_hash);
  ELSE
    -- Legacy plain-text PIN: compare directly, then auto-migrate to bcrypt on success.
    IF v_stored = p_pin THEN
      IF p_table = 'waiters' THEN
        UPDATE public.waiters
          SET pin = crypt(p_pin, gen_salt('bf', 10))
          WHERE id = p_id;
      ELSE
        UPDATE public.delivery_drivers
          SET pin = crypt(p_pin, gen_salt('bf', 10))
          WHERE id = p_id;
      END IF;
      RETURN true;
    END IF;
    RETURN false;
  END IF;
END;
$$;

-- Re-grant so unauthenticated login pages can call the RPC
GRANT EXECUTE ON FUNCTION verify_staff_pin(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_staff_pin(text, uuid, text) TO authenticated;
