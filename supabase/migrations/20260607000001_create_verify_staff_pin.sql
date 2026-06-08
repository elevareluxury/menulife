-- RPC: verify_staff_pin
-- Verifies a PIN against the stored bcrypt hash server-side.
-- The hash never leaves the database, fixing the CRÍTICO 2 security issue.
-- Supports both bcrypt hashes ($2a$/$2b$) and legacy plain-text PINs,
-- migrating plain-text to bcrypt on first successful login.

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
BEGIN
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
    -- bcrypt comparison (compatible with both $2a$ and $2b$ hashes)
    RETURN v_stored = crypt(p_pin, v_stored);
  ELSE
    -- Legacy plain-text: compare then migrate to bcrypt
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

-- Needed for unauthenticated login flows
GRANT EXECUTE ON FUNCTION verify_staff_pin(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_staff_pin(text, uuid, text) TO authenticated;
