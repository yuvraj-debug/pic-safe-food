

## Subscription Pricing System Overhaul

This is a significant restructure of the monetization system. Here's the implementation plan:

---

### 1. Database Migration — New Plan Enum & Scan Tracking

**Current state:** `app_plan` enum has `free | basic | premium`. Scan tracking uses `scan_logs` table (one row per scan, daily reset logic in code).

**Changes needed:**

- Add `pro` and `lifetime` values to `app_plan` enum
- Create new `scan_usage` table to track monthly usage per user:
  ```
  scan_usage (
    id uuid PK,
    user_id uuid NOT NULL,
    scan_count integer DEFAULT 0,
    reset_date timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
  )
  ```
- Create a DB function `reset_scan_count_if_needed(user_id)` that checks if `reset_date` has passed and resets `scan_count` to 0, advancing `reset_date` by 30 days
- RLS: users can read/update own row, admin can read all
- Auto-create `scan_usage` row in `handle_new_user()` trigger with `reset_date = now() + 30 days`

**Plan limits (monthly):**
| Plan | Scans/month |
|------|------------|
| free | 20 |
| basic | 100 |
| pro | 300 |
| premium (lifetime) | 500 |

Note: Rename internal `premium` → keep as `lifetime` concept. The new enum values: `free`, `basic`, `pro`, `lifetime`.

---

### 2. Update `useScanLimit` Hook

Replace the current daily-count-from-scan_logs approach with the new `scan_usage` table:

- Fetch `scan_usage` row for user
- Call reset function if `reset_date` has passed (client-side check, then update via DB)
- Compare `scan_count` against plan limit
- `logScan()` increments `scan_count` in `scan_usage`
- Change from daily to monthly terminology throughout

---

### 3. Update `useAuth` Hook

- Fetch plan from `user_plans` table (already done)
- Map new plan values (`pro`, `lifetime`)

---

### 4. Redesign Pricing Page

Replace current 3-plan layout with 4 plans:

- **Free** — ₹0, 20 scans/month, basic analysis, watermark on shares
- **Basic** — ₹99/month, 100 scans/month, personalized scoring, no watermark — marked "MOST POPULAR"
- **Pro** — ₹249/month, 300 scans/month, family mode, product comparison, alt recommendations
- **Lifetime** — ₹999 one-time, 500 scans/month, all Pro features forever

Buy Now still goes to WhatsApp with pre-filled message.

---

### 5. Upgrade Modal Component

Create `src/components/UpgradeModal.tsx`:

- Triggered when scan limit is reached (from ScanPage)
- Shows "You've reached your monthly scan limit"
- Displays the 4 plan cards with prices
- Highlights Basic as "Most Popular"
- Buy Now buttons open WhatsApp (same logic as PricingPage)
- Close button to dismiss

---

### 6. Watermark Logic on ShareCard

- Pass `userPlan` as a prop to `ShareCard`
- If plan is `free`, render watermark text at bottom: "Scanned with PicSafe Food — picsafefood.in"
- If paid plan → no watermark (remove/hide the footer branding or replace with minimal logo)

The current footer already shows "picsafefood.in" — for free users, make it more prominent as a watermark overlay. For paid users, hide it or show minimal branding.

---

### 7. Feature Gating in UI

- **Personalized health scoring**: Only show for `basic`, `pro`, `lifetime`. Free users see a prompt to upgrade.
- **Share card watermark**: Controlled by plan (Feature 5 above).
- Home page: Show "X / Y scans this month" instead of daily.

---

### 8. Monthly Reset Logic

Two approaches (using simpler client-triggered approach):

- When `useScanLimit` fetches `scan_usage`, if `now() > reset_date`:
  - Update `scan_count = 0` and `reset_date = reset_date + 30 days`
- This is lazy reset — happens on next app usage after 30 days

---

### 9. Files to Create/Modify

**New files:**
- `src/components/UpgradeModal.tsx` — scan limit reached modal

**Modified files:**
- `src/hooks/useScanLimit.ts` — monthly tracking via `scan_usage` table
- `src/hooks/useAuth.ts` — support new plan types
- `src/pages/PricingPage.tsx` — 4 plans with new pricing
- `src/pages/ScanPage.tsx` — show UpgradeModal when limit reached
- `src/pages/HomePage.tsx` — monthly scan display
- `src/components/ShareCard.tsx` — watermark for free users
- `src/components/ShareModal.tsx` — pass userPlan to ShareCard
- `src/pages/ResultsPage.tsx` — pass userPlan for share card, gate personalized scoring

**Database migration:**
- Alter `app_plan` enum to add `pro`, `lifetime`  
- Create `scan_usage` table with RLS
- Update `handle_new_user()` trigger to create `scan_usage` row

---

### 10. Payment-Ready Architecture

No actual payment integration now, but the structure supports it:
- `user_plans` table is the single source of truth
- `purchase_intents` table logs upgrade requests
- Admin can manually change plans
- Future: Razorpay/Stripe webhook updates `user_plans.plan` directly

