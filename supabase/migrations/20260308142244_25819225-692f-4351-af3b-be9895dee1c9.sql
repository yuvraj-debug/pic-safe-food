
CREATE TABLE public.health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  allergies text[] NOT NULL DEFAULT '{}',
  diet_type text NOT NULL DEFAULT 'none',
  health_conditions text[] NOT NULL DEFAULT '{}',
  low_sugar_preference boolean NOT NULL DEFAULT false,
  avoid_additives boolean NOT NULL DEFAULT false,
  low_sodium_preference boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health profile"
  ON public.health_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own health profile"
  ON public.health_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own health profile"
  ON public.health_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
