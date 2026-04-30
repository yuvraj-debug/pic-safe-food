# Setup Guide - Fixing Database and Edge Function Issues

## Issue 1: "Could not find the table 'public.discover_products'"

The `discover_products` table hasn't been created in your Supabase database yet.

### Solution: Apply the Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard: https://apespgoyjmaucvozizgm.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of this file: `supabase/migrations/20260413065953_02a466f0-89c2-4aba-b38e-2c4d58210c77.sql`
5. Click **Run** to execute
6. You should see "Success. No rows returned" or similar

**Note:** The migration is now idempotent (safe to run multiple times). If you get "relation already exists" errors, the table may already exist - you can skip to verifying the RLS policies below.

**Option B: Using Supabase CLI (if installed)**
```bash
supabase db push
```

### Verify the Table and Policies

After running the migration, verify in the Supabase Dashboard:
1. Go to **Table Editor** - confirm `discover_products` exists
2. Go to **Authentication** > **Policies** - verify these RLS policies exist:
   - "Anyone can view active discover products"
   - "Admins can view all discover products"
   - "Admins can add discover products"
   - "Admins can update discover products"
   - "Admins can delete discover products"

---

## Issue 2: "Failed to send a request to the Edge Function"

The `analyze-food` Edge Function needs to be deployed and configured with environment variables.

**Note:** The app now uses **StepFun only** (no Groq or Lovable fallbacks).

### Step 1: Get Required API Keys

You need:
- **STEPFUN_API_KEY** - From StepFun (https://platform.stepfun.com)
- **SUPABASE_SERVICE_ROLE_KEY** - From Supabase Settings > API
- **OCR_API_KEY** - From [OCR.space](https://ocr.space/) (free tier available)

### Step 2: Deploy the Edge Function

**Option A: Using Supabase Dashboard**

1. Go to your Supabase project
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Fill in:
   - **Name**: `analyze-food`
   - **Runtime**: `Deno`
5. In the **Code** tab, copy and paste the contents of `supabase/functions/analyze-food/index.ts`
6. Go to the **Configuration** tab
7. Add these environment variables:
   - `SUPABASE_URL` = `https://apespgoyjmaucvozizgm.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = [your service role key]
   - `STEPFUN_API_KEY` = [your StepFun API key]
   - `OCR_API_KEY` = [your OCR.space API key]
8. Click **Deploy function**

**Option B: Using Supabase CLI**

```bash
# Make sure you're logged in and have the project selected
supabase login
supabase link --project-ref apespgoyjmaucvozizgm

# Deploy the function
supabase functions deploy analyze-food --no-verify-jwt

# Set environment variables
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set STEPFUN_API_KEY=your-key
supabase secrets set OCR_API_KEY=your-ocr-space-key
```

### Step 3: Verify Edge Function Deployment

1. In Supabase Dashboard, go to **Edge Functions**
2. You should see `analyze-food` in the list with a green "Deployed" status
3. Click on it and go to the **Logs** tab to see recent invocations

---

## Step 4: Test the Application

After completing both setups:

1. Restart your development server if it's running
2. Go to the admin panel at `/admin`
3. The products should load without errors
4. Try scanning a product to test the Edge Function

---

## Troubleshooting

### Database Table Already Exists
- The migration is now idempotent - it's safe to run even if the table exists
- If you previously got "relation already exists" error, just re-run the updated migration
- It will drop and recreate the RLS policies to ensure they're correct

### Edge Function Still Failing
- Check the Edge Function logs in the Supabase Dashboard for specific error messages
- Verify all environment variables are set correctly
- Ensure your STEPFUN_API_KEY is valid and has sufficient quota
- Check that the `app_settings` table exists if you're using DB-stored keys

### Permission Denied on `discover_products`
- The RLS policies require the user to have the `admin` role
- Make sure you're logged in as an admin (ys8800221@gmail.com should have admin automatically)
- If you signed up before the trigger was added, run `supabase/scripts/set-admin.sql` in the SQL Editor

---

## Need Help?

Check the browser console (F12) for detailed error logs. The app now includes comprehensive logging to help diagnose issues.
