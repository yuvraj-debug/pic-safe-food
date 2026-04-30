-- Production repair: restore core app tables, policies, triggers, and RPCs.
-- This migration is intentionally idempotent because the hosted database was
-- missing several earlier migrations while some later objects already existed.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'app_plan') THEN
    CREATE TYPE public.app_plan AS ENUM ('free', 'basic', 'premium');
  END IF;
END $$;

ALTER TYPE public.app_plan ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE public.app_plan ADD VALUE IF NOT EXISTS 'lifetime';

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan public.app_plan NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  safety_score integer NOT NULL,
  safety_level text NOT NULL,
  analysis jsonb NOT NULL,
  thumbnail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  scan_count integer NOT NULL DEFAULT 0,
  reset_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.referral_profiles(user_id),
  referral_count integer NOT NULL DEFAULT 0,
  referral_rewards_scans integer NOT NULL DEFAULT 0,
  monthly_referral_scans integer NOT NULL DEFAULT 0,
  monthly_referral_reset_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  highest_milestone_reached integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  referrer_rewarded boolean NOT NULL DEFAULT false,
  referred_rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  allergies text[] NOT NULL DEFAULT '{}',
  diet_type text NOT NULL DEFAULT 'none',
  health_conditions text[] NOT NULL DEFAULT '{}',
  low_sugar_preference boolean NOT NULL DEFAULT false,
  avoid_additives boolean NOT NULL DEFAULT false,
  low_sodium_preference boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON public.scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON public.scan_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_user_id ON public.scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_logs_referrer_id ON public.referral_logs(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_referred_id ON public.referral_logs(referred_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.role::text = $2
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, _role::text);
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := 'PSF' || upper(substr(md5(random()::text), 1, 5));
    SELECT EXISTS(SELECT 1 FROM public.referral_profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

INSERT INTO public.profiles (id, email, created_at)
SELECT id, COALESCE(email, ''), created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

INSERT INTO public.user_plans (user_id, plan)
SELECT id, 'free'::public.app_plan
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.scan_usage (user_id)
SELECT id
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.referral_profiles (user_id, referral_code)
SELECT u.id, public.generate_referral_code()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_profiles rp WHERE rp.user_id = u.id
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'ys8800221@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.reset_scan_if_needed(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed to reset scan usage for this user';
  END IF;

  INSERT INTO public.scan_usage (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.scan_usage
  SET scan_count = 0,
      reset_date = now() + interval '30 days'
  WHERE user_id = _user_id
    AND reset_date <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_scan_count(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
  current_bonus integer;
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed to increment scan usage for this user';
  END IF;

  INSERT INTO public.scan_usage (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.referral_profiles (user_id, referral_code)
  VALUES (_user_id, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.reset_scan_if_needed(_user_id);

  SELECT referral_rewards_scans INTO current_bonus
  FROM public.referral_profiles
  WHERE user_id = _user_id;

  IF COALESCE(current_bonus, 0) > 0 THEN
    UPDATE public.referral_profiles
    SET referral_rewards_scans = GREATEST(0, referral_rewards_scans - 1)
    WHERE user_id = _user_id;

    SELECT scan_count INTO new_count
    FROM public.scan_usage
    WHERE user_id = _user_id;
  ELSE
    UPDATE public.scan_usage
    SET scan_count = scan_count + 1
    WHERE user_id = _user_id
    RETURNING scan_count INTO new_count;
  END IF;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_referral(_referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _log_id uuid;
  _current_count integer;
  _milestone_bonus integer := 0;
  _prev_milestone integer;
  _monthly_scans integer;
  _monthly_reset timestamptz;
  _reward integer;
  _capped_reward integer;
BEGIN
  IF auth.uid() IS NOT NULL AND _referred_user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed to complete referral for this user';
  END IF;

  INSERT INTO public.scan_usage (user_id)
  VALUES (_referred_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.referral_profiles (user_id, referral_code)
  VALUES (_referred_user_id, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, referrer_id INTO _log_id, _referrer_id
  FROM public.referral_logs
  WHERE referred_id = _referred_user_id AND status = 'pending'
  LIMIT 1;

  IF _log_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.referral_logs
  SET status = 'completed',
      completed_at = now(),
      referrer_rewarded = true,
      referred_rewarded = true
  WHERE id = _log_id;

  SELECT monthly_referral_scans, monthly_referral_reset_date, referral_count, highest_milestone_reached
  INTO _monthly_scans, _monthly_reset, _current_count, _prev_milestone
  FROM public.referral_profiles
  WHERE user_id = _referrer_id;

  IF _monthly_reset <= now() THEN
    _monthly_scans := 0;
    _monthly_reset := now() + interval '30 days';
  END IF;

  IF _monthly_scans >= 100 THEN
    RETURN;
  END IF;

  _current_count := COALESCE(_current_count, 0) + 1;

  IF _current_count >= 10 AND COALESCE(_prev_milestone, 0) < 10 THEN
    _milestone_bonus := 200; _prev_milestone := 10;
  ELSIF _current_count >= 5 AND COALESCE(_prev_milestone, 0) < 5 THEN
    _milestone_bonus := 100; _prev_milestone := 5;
  ELSIF _current_count >= 3 AND COALESCE(_prev_milestone, 0) < 3 THEN
    _milestone_bonus := 50; _prev_milestone := 3;
  ELSIF _current_count >= 1 AND COALESCE(_prev_milestone, 0) < 1 THEN
    _milestone_bonus := 10; _prev_milestone := 1;
  END IF;

  _reward := 10 + _milestone_bonus;
  _capped_reward := LEAST(_reward, 100 - COALESCE(_monthly_scans, 0));
  IF _capped_reward <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.referral_profiles
  SET referral_count = _current_count,
      referral_rewards_scans = referral_rewards_scans + _capped_reward,
      monthly_referral_scans = COALESCE(_monthly_scans, 0) + _capped_reward,
      monthly_referral_reset_date = _monthly_reset,
      highest_milestone_reached = COALESCE(_prev_milestone, 0)
  WHERE user_id = _referrer_id;

  UPDATE public.referral_profiles
  SET referral_rewards_scans = referral_rewards_scans + 5
  WHERE user_id = _referred_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.user_plans (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.scan_usage (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.referral_profiles (user_id, referral_code)
  VALUES (NEW.id, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;

  IF NEW.email = 'ys8800221@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own plan" ON public.user_plans;
CREATE POLICY "Users can view own plan" ON public.user_plans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own plan" ON public.user_plans;
CREATE POLICY "Users can insert own plan" ON public.user_plans
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update plans" ON public.user_plans;
DROP POLICY IF EXISTS "Admin can update plans" ON public.user_plans;
CREATE POLICY "Admins can update plans" ON public.user_plans
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own scans" ON public.scan_logs;
CREATE POLICY "Users can view own scans" ON public.scan_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own scans" ON public.scan_logs;
CREATE POLICY "Users can insert own scans" ON public.scan_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own scan results" ON public.scan_results;
CREATE POLICY "Users can insert own scan results" ON public.scan_results
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own scan results" ON public.scan_results;
CREATE POLICY "Users can view own scan results" ON public.scan_results
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can delete own scan results" ON public.scan_results;
CREATE POLICY "Users can delete own scan results" ON public.scan_results
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own scan usage" ON public.scan_usage;
CREATE POLICY "Users can view own scan usage" ON public.scan_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update own scan usage" ON public.scan_usage;
CREATE POLICY "Users can update own scan usage" ON public.scan_usage
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert scan usage" ON public.scan_usage;
CREATE POLICY "System can insert scan usage" ON public.scan_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read referral codes" ON public.referral_profiles;
CREATE POLICY "Anyone can read referral codes" ON public.referral_profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own referral profile" ON public.referral_profiles;
CREATE POLICY "Users can update own referral profile" ON public.referral_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert referral profile" ON public.referral_profiles;
CREATE POLICY "System can insert referral profile" ON public.referral_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own referral logs" ON public.referral_logs;
CREATE POLICY "Users can view own referral logs" ON public.referral_logs
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert referral logs" ON public.referral_logs;
DROP POLICY IF EXISTS "System can insert referral logs" ON public.referral_logs;
CREATE POLICY "Users can insert referral logs" ON public.referral_logs
  FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update referral logs" ON public.referral_logs;
DROP POLICY IF EXISTS "System can update referral logs" ON public.referral_logs;
CREATE POLICY "Users can update referral logs" ON public.referral_logs
  FOR UPDATE TO authenticated
  USING (referred_id = auth.uid() OR referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own intents" ON public.purchase_intents;
CREATE POLICY "Users can insert own intents" ON public.purchase_intents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all intents" ON public.purchase_intents;
CREATE POLICY "Admins can view all intents" ON public.purchase_intents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view settings" ON public.app_settings;
CREATE POLICY "Admins can view settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
CREATE POLICY "Admins can insert settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete settings" ON public.app_settings;
CREATE POLICY "Admins can delete settings" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own health profile" ON public.health_profiles;
CREATE POLICY "Users can view own health profile" ON public.health_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own health profile" ON public.health_profiles;
CREATE POLICY "Users can insert own health profile" ON public.health_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own health profile" ON public.health_profiles;
CREATE POLICY "Users can update own health profile" ON public.health_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
