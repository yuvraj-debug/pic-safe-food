
-- 1. Add new enum values to app_plan
ALTER TYPE public.app_plan ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE public.app_plan ADD VALUE IF NOT EXISTS 'lifetime';

-- 2. Create scan_usage table for monthly tracking
CREATE TABLE public.scan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  scan_count integer NOT NULL DEFAULT 0,
  reset_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Users can view own scan usage"
  ON public.scan_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own scan usage"
  ON public.scan_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert scan usage"
  ON public.scan_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Create reset function
CREATE OR REPLACE FUNCTION public.reset_scan_if_needed(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.scan_usage
  SET scan_count = 0,
      reset_date = reset_date + interval '30 days'
  WHERE user_id = _user_id
    AND reset_date <= now();
END;
$$;

-- 6. Create increment function
CREATE OR REPLACE FUNCTION public.increment_scan_count(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.scan_usage
  SET scan_count = scan_count + 1
  WHERE user_id = _user_id
  RETURNING scan_count INTO new_count;
  RETURN new_count;
END;
$$;

-- 7. Update handle_new_user trigger to also create scan_usage row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_plans (user_id, plan) VALUES (NEW.id, 'free');
  INSERT INTO public.scan_usage (user_id) VALUES (NEW.id);
  IF NEW.email = 'ys8800221@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Backfill scan_usage for existing users who don't have one
INSERT INTO public.scan_usage (user_id)
SELECT p.id FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.scan_usage su WHERE su.user_id = p.id);
