
CREATE OR REPLACE FUNCTION public.increment_scan_count(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count integer;
  current_bonus integer;
BEGIN
  -- Check bonus scans first
  SELECT referral_rewards_scans INTO current_bonus
  FROM public.referral_profiles
  WHERE user_id = _user_id;

  IF current_bonus IS NOT NULL AND current_bonus > 0 THEN
    -- Consume from bonus scans first
    UPDATE public.referral_profiles
    SET referral_rewards_scans = referral_rewards_scans - 1
    WHERE user_id = _user_id;

    -- Return current scan_count unchanged
    SELECT scan_count INTO new_count
    FROM public.scan_usage
    WHERE user_id = _user_id;
  ELSE
    -- No bonus scans left, increment regular count
    UPDATE public.scan_usage
    SET scan_count = scan_count + 1
    WHERE user_id = _user_id
    RETURNING scan_count INTO new_count;
  END IF;

  RETURN new_count;
END;
$function$;
