
CREATE TABLE public.scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  safety_score integer NOT NULL,
  safety_level text NOT NULL,
  analysis jsonb NOT NULL,
  thumbnail text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own scan results"
  ON public.scan_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own scan results"
  ON public.scan_results FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own scan results"
  ON public.scan_results FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_scan_results_user_id ON public.scan_results(user_id);
CREATE INDEX idx_scan_results_created_at ON public.scan_results(created_at DESC);
