# Admin Setup Scripts

## Assign Admin Role to Existing User

If you need to manually assign admin privileges to an existing user (e.g., ys8800221@gmail.com), follow these steps:

### Option 1: Using Supabase Dashboard SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `apespgoyjmaucvozizgm`
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `set-admin.sql`
6. Click **Run** (or press Ctrl+Enter)

The script will:
- Find the user by email
- Assign the admin role
- Display a confirmation showing the user's email and role

### Option 2: Using Supabase CLI

```bash
# Navigate to your supabase directory
cd supabase

# Apply the migration (if you want to make it permanent)
# Or just run the script directly:
supabase db execute -f scripts/set-admin.sql
```

## Verify Admin Assignment

After running the script, you can verify by:

1. Logging into your app as ys8800221@gmail.com
2. The `isAdmin` flag should be `true` (check via browser dev tools or console)
3. Access the admin panel at `/admin` - it should load without redirecting to auth

## Auto-Assignment for New Users

The database already has an auto-assignment trigger. Any new user who signs up with email `ys8800221@gmail.com` will automatically receive admin privileges.

See: `supabase/migrations/20260305135739_ec6f12fb-b3d5-4201-8e7d-89b3cb0162ab.sql` (lines 118-121)

## Troubleshooting

If the user cannot access admin panel after running the script:

1. **Check if user exists in auth.users:**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'ys8800221@gmail.com';
   ```

2. **Check existing roles:**
   ```sql
   SELECT * FROM public.user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ys8800221@gmail.com');
   ```

3. **Clear browser cache and re-login** - the auth session may need to be refreshed

4. **Check RLS policies** - ensure the admin role is properly recognized by the `has_role()` function
