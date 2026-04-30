-- This script assigns admin role to an existing user by email
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = 'ys8800221@gmail.com';
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email ys8800221@gmail.com not found in auth.users';
  END IF;
  
  -- Insert admin role (if not already exists)
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Admin role assigned to ys8800221@gmail.com (user_id: %)', user_id;
END $$;

-- Verify the assignment
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ys8800221@gmail.com' AND ur.role = 'admin';
