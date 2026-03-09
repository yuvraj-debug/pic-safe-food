

## Plan: FoodScan AI - Major Feature Additions

This is a large set of changes. Here's the plan broken into phases:

---

### 1. Replace Safety Meter with Semi-Circle Progress + Arrow Needle

Replace the current `SafetyMeter` component with the semi-circle gauge from the provided code. The needle/arrow will point based on the score (e.g., 50/100 = middle). Will keep the existing color scheme (red/orange/green zones) and add a gradient fill with animated arrow transition.

---

### 2. Authentication System with Email OTP

**Database tables needed:**
- `profiles` table (id, email, created_at, daily_scans_used, last_scan_date)
- `user_roles` table (id, user_id, role enum: admin/user)
- `user_plans` table (id, user_id, plan enum: free/basic/premium, created_at)

**Auth flow:**
- Sign up page: user enters email, receives OTP via email
- OTP verification page: user enters the 6-digit code
- On successful verification, profile + free plan auto-created via trigger
- Login page with same OTP flow
- Protected routes: redirect unauthenticated users to login
- Configure auth to use OTP (magic link with OTP) — no password needed

**Note:** Will enable email auto-confirm since we're using OTP flow (user proves email ownership by entering the code).

---

### 3. Pricing / Plans Page

Display three plans:
- **Free** — 1 scan/day, ₹0
- **Basic** — 10 scans/day, ₹99
- **Premium** — 99 scans/day, ₹499

Static pricing page (no payment integration unless requested later). Admin can manually change plans.

---

### 4. Scan Limit Enforcement

- Before each scan, check user's plan and daily usage
- Track scans in a `scan_logs` table (user_id, scanned_at)
- Count today's scans vs plan limit
- Show remaining scans on home page
- Block scan with friendly message when limit reached

---

### 5. Admin Panel

- Route: `/admin` — only accessible by `ys8800221@gmail.com`
- Seed admin role for this email via migration
- Dashboard showing: all registered users, their plan, scan count
- Ability to change any user's plan
- RLS policies: admin can read all profiles/plans, users can only read own
- Use `has_role` security definer function for RLS

---

### 6. Mobile-Responsive UI Polish

- Ensure all pages work well on small screens (already mostly mobile-first)
- Fix any overflow or spacing issues
- Improve card layouts, button sizes, typography for mobile
- Add bottom navigation bar for mobile (Home, Scan, Pricing, Profile)

---

### Technical Details

**Database migrations (in order):**
1. Create `app_role` enum, `app_plan` enum
2. Create `profiles`, `user_roles`, `user_plans`, `scan_logs` tables
3. Create `has_role` security definer function
4. RLS policies on all tables
5. Trigger to auto-create profile + free plan on signup
6. Insert admin role for `ys8800221@gmail.com` (will run after they sign up, or use a trigger)

**New pages/components:**
- `src/pages/AuthPage.tsx` — email input + OTP verification
- `src/pages/PricingPage.tsx` — plan display
- `src/pages/AdminPage.tsx` — user management
- `src/components/BottomNav.tsx` — mobile navigation
- `src/hooks/useAuth.ts` — auth state management
- `src/hooks/useScanLimit.ts` — scan limit checking

**Route updates in App.tsx:**
- `/auth` — public
- `/pricing` — public
- `/admin` — protected (admin only)
- All other routes — protected (authenticated)

