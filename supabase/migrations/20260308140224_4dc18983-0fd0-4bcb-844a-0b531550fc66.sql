CREATE TABLE public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own intents" ON public.purchase_intents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all intents" ON public.purchase_intents
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));