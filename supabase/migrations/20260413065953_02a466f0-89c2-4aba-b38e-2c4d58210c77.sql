-- Create discover_products table
CREATE TABLE public.discover_products (
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

-- Enable RLS
ALTER TABLE public.discover_products ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active products
CREATE POLICY "Anyone can view active discover products"
ON public.discover_products
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can view all products (including inactive)
CREATE POLICY "Admins can view all discover products"
ON public.discover_products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert
CREATE POLICY "Admins can add discover products"
ON public.discover_products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update discover products"
ON public.discover_products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete discover products"
ON public.discover_products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));