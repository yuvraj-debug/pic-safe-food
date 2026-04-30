# Supabase CLI Setup Instructions

## Prerequisites

Make sure you have Node.js installed (you already have npm since you're running the project).

## Step 1: Install Supabase CLI

Open **PowerShell** or **Command Prompt** as Administrator and run:

```powershell
# Using PowerShell (Windows)
iwr -useb https://raw.githubusercontent.com/supabase/cli/main/install/install.ps1 | iex
```

OR using npm:
```bash
npm install -g supabase
```

After installation, close and reopen your terminal, then verify:
```bash
supabase --version
```

You should see something like: `supabase/cli version x.x.x`

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your default browser asking for authentication. Approve the access.

## Step 3: Link Your Project

Navigate to your project directory first:
```bash
cd c:/Users/ys880/OneDrive/Desktop/picfood/pic-safe-food
```

Then link:
```bash
supabase link --project-ref apespgoyjmaucvozizgm
```

This will ask you to select a database (choose `prod` or the default).

## Step 4: Apply Migrations

```bash
supabase db push
```

This will execute all SQL files in `supabase/migrations/` against your database.

Expected output:
```
Applying migration...
...
Migration complete
```

## Step 5: Deploy Edge Function

```bash
supabase functions deploy analyze-food --no-verify-jwt
```

This may take a minute to upload and deploy.

## Step 6: Set Edge Function Environment Variables

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_rmBa8iySPSNF5RhLwb1IfA__dXXiU71
supabase secrets set STEPFUN_API_KEY=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
supabase secrets set OCR_API_KEY=your-ocr-space-api-key
```

Note: Your service role key is already in `.env`. Use that exact value.

**To get OCR_API_KEY:**
1. Sign up at [OCR.space](https://ocr.space/)
2. Get your free API key from the dashboard
3. Replace `your-ocr-space-api-key` with the actual key

## Step 7: Verify

1. Go to your Supabase dashboard
2. Check **Table Editor** - `discover_products` should exist
3. Check **Edge Functions** - `analyze-food` should show "Deployed"
4. Restart your app and test `/admin` and scan features

## Troubleshooting

### "supabase not recognized"
- Restart your terminal after installation
- Make sure npm global bin is in your PATH

### "Failed to link project"
- Make sure you're in the correct directory (pic-safe-food)
- Verify the project ref: `apespgoyjmaucvozizgm`

### "Permission denied" on db push
- Ensure you're logged in: `supabase auth status`
- Try logging out and back in: `supabase logout && supabase login`

### Edge Function deployment fails
- Check your internet connection
- Ensure environment variables are set correctly
- View logs: `supabase functions logs analyze-food`

## Need Help?

Check the browser console (F12) for detailed error logs after completing setup.
