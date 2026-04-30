-- =========================
-- REQUIRED FUNCTION (FIXED - no enum dependency)
-- =========================
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = user_id
      AND user_roles.role::text = role_name
  );
$$;


-- =========================
-- TABLE
-- =========================
CREATE TABLE IF NOT EXISTS public.discover_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'snacks',
  barcode TEXT DEFAULT '',
  emoji TEXT DEFAULT '🍽️',
  thumbnail TEXT,
  safety_score INTEGER NOT NULL DEFAULT 0,
  safety_level TEXT NOT NULL DEFAULT 'Unknown',
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =========================
-- RLS
-- =========================
ALTER TABLE public.discover_products ENABLE ROW LEVEL SECURITY;

-- =========================
-- CLEAN OLD POLICIES
-- =========================
DROP POLICY IF EXISTS "Anyone can view active discover products" ON public.discover_products;
DROP POLICY IF EXISTS "Admins can view all discover products" ON public.discover_products;
DROP POLICY IF EXISTS "Admins can add discover products" ON public.discover_products;
DROP POLICY IF EXISTS "Admins can update discover products" ON public.discover_products;
DROP POLICY IF EXISTS "Admins can delete discover products" ON public.discover_products;

-- =========================
-- POLICIES
-- =========================

CREATE POLICY "Anyone can view active discover products"
ON public.discover_products
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all discover products"
ON public.discover_products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add discover products"
ON public.discover_products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update discover products"
ON public.discover_products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete discover products"
ON public.discover_products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));