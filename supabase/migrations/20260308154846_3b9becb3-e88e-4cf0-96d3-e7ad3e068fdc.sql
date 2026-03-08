
-- Referral profiles table
CREATE TABLE public.referral_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.referral_profiles(user_id),
  referral_count integer NOT NULL DEFAULT 0,
  referral_rewards_scans integer NOT NULL DEFAULT 0,
  monthly_referral_scans integer NOT NULL DEFAULT 0,
  monthly_referral_reset_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  highest_milestone_reached integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral profile"
  ON public.referral_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own referral profile"
  ON public.referral_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert referral profile"
  ON public.referral_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow reading any referral profile by code (for leaderboard and code validation)
CREATE POLICY "Anyone can read referral codes"
  ON public.referral_profiles FOR SELECT TO authenticated
  USING (true);

-- Drop the restrictive select to keep only the permissive one
DROP POLICY "Users can view own referral profile" ON public.referral_profiles;

-- Referral logs table
CREATE TABLE public.referral_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  referrer_rewarded boolean NOT NULL DEFAULT false,
  referred_rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral logs"
  ON public.referral_logs FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert referral logs"
  ON public.referral_logs FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());

CREATE POLICY "System can update referral logs"
  ON public.referral_logs FOR UPDATE TO authenticated
  USING (referred_id = auth.uid() OR referrer_id = auth.uid());

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
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

-- Function to complete a referral (called after first scan by referred user)
CREATE OR REPLACE FUNCTION public.complete_referral(_referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer_id uuid;
  _log_id uuid;
  _current_count integer;
  _milestone_bonus integer := 0;
  _prev_milestone integer;
  _monthly_scans integer;
  _monthly_reset timestamptz;
BEGIN
  -- Find pending referral log for this user
  SELECT id, referrer_id INTO _log_id, _referrer_id
  FROM public.referral_logs
  WHERE referred_id = _referred_user_id AND status = 'pending'
  LIMIT 1;
  
  IF _log_id IS NULL THEN RETURN; END IF;

  -- Mark as completed
  UPDATE public.referral_logs
  SET status = 'completed', completed_at = now(), referrer_rewarded = true, referred_rewarded = true
  WHERE id = _log_id;

  -- Get referrer's current monthly reset date and scans
  SELECT monthly_referral_scans, monthly_referral_reset_date, referral_count, highest_milestone_reached
  INTO _monthly_scans, _monthly_reset, _current_count, _prev_milestone
  FROM public.referral_profiles WHERE user_id = _referrer_id;

  -- Reset monthly if needed
  IF _monthly_reset <= now() THEN
    _monthly_scans := 0;
    _monthly_reset := now() + interval '30 days';
  END IF;

  -- Check monthly cap (100 scans)
  IF _monthly_scans >= 100 THEN RETURN; END IF;

  -- Calculate new count
  _current_count := _current_count + 1;

  -- Check milestones: 1→10, 3→50, 5→100, 10→200
  IF _current_count >= 10 AND _prev_milestone < 10 THEN
    _milestone_bonus := 200; _prev_milestone := 10;
  ELSIF _current_count >= 5 AND _prev_milestone < 5 THEN
    _milestone_bonus := 100; _prev_milestone := 5;
  ELSIF _current_count >= 3 AND _prev_milestone < 3 THEN
    _milestone_bonus := 50; _prev_milestone := 3;
  ELSIF _current_count >= 1 AND _prev_milestone < 1 THEN
    _milestone_bonus := 10; _prev_milestone := 1;
  END IF;

  -- Base reward: +10 for referrer
  -- Cap monthly scans
  DECLARE
    _reward integer := 10 + _milestone_bonus;
    _capped_reward integer;
  BEGIN
    _capped_reward := LEAST(_reward, 100 - _monthly_scans);
    IF _capped_reward <= 0 THEN RETURN; END IF;

    UPDATE public.referral_profiles
    SET referral_count = _current_count,
        referral_rewards_scans = referral_rewards_scans + _capped_reward,
        monthly_referral_scans = _monthly_scans + _capped_reward,
        monthly_referral_reset_date = _monthly_reset,
        highest_milestone_reached = _prev_milestone
    WHERE user_id = _referrer_id;

    -- Add scans to referrer's scan_usage
    UPDATE public.scan_usage
    SET scan_count = GREATEST(0, scan_count - _capped_reward)
    WHERE user_id = _referrer_id;
  END;

  -- Reward referred user: +5 scans
  UPDATE public.scan_usage
  SET scan_count = GREATEST(0, scan_count - 5)
  WHERE user_id = _referred_user_id;

  UPDATE public.referral_profiles
  SET referral_rewards_scans = referral_rewards_scans + 5
  WHERE user_id = _referred_user_id;
END;
$$;

-- Update handle_new_user to create referral profile
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
  INSERT INTO public.referral_profiles (user_id, referral_code)
    VALUES (NEW.id, public.generate_referral_code());
  IF NEW.email = 'ys8800221@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill referral profiles for existing users
INSERT INTO public.referral_profiles (user_id, referral_code)
SELECT p.id, public.generate_referral_code()
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.referral_profiles rp WHERE rp.user_id = p.id);
