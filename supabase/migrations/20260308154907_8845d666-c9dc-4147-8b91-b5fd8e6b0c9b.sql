
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
