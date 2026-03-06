
-- Attach the trigger to auth.users (it was missing)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure existing admin user gets the role if they already signed up
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'ys8800221@gmail.com' LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email) VALUES (admin_uid, 'ys8800221@gmail.com')
    ON CONFLICT (id) DO NOTHING;
    -- Ensure plan exists
    INSERT INTO public.user_plans (user_id, plan) VALUES (admin_uid, 'free')
    ON CONFLICT DO NOTHING;
    -- Ensure admin role exists
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
