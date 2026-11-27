-- Persistent rate limiting, security event logging, and per-business write throttling

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_row public.rate_limits%ROWTYPE;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_row
  FROM public.rate_limits
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND OR v_row.window_start + make_interval(secs => p_window_seconds) <= v_now THEN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (key) DO UPDATE
      SET count = 1,
          window_start = v_now;
    RETURN TRUE;
  END IF;

  IF v_row.count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limits
  SET count = v_row.count + 1
  WHERE key = p_key;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Security audit events (written by Edge Functions via service_role)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  identifier TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events(created_at DESC);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_events FROM anon, authenticated;
GRANT ALL ON TABLE public.security_events TO service_role;

-- Per-business write throttling trigger on customers & bills (anti-flooding)
CREATE OR REPLACE FUNCTION public.enforce_business_write_throttle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_allowed BOOLEAN;
BEGIN
  IF NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_key := 'db-write:' || TG_TABLE_NAME || ':' || NEW.business_id::text;
  v_allowed := public.check_rate_limit(v_key, 60, 60);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Too many % operations in a short time. Please wait a minute.', TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_customers_insert ON public.customers;
CREATE TRIGGER trg_throttle_customers_insert
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_write_throttle();

DROP TRIGGER IF EXISTS trg_throttle_bills_insert ON public.bills;
CREATE TRIGGER trg_throttle_bills_insert
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_write_throttle();
