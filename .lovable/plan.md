

## Problem
The bottom nav has 6-7 items (Home, Scan, History, Health, Plans, Admin, Profile) crammed together, making it look cluttered on mobile.

## Solution
Keep only 4 core items in the bottom nav. Move secondary items to a hamburger menu (☰) drawer that slides out from the left.

### Bottom Nav (4 items)
- **Home** — primary landing
- **Scan** — core action
- **History** — frequently used
- **Profile** — account access

### Hamburger Menu (top-left, accessible from all pages)
- Health Profile
- Plans / Pricing
- Admin (if admin)

### Implementation

1. **Create `SideMenu` component** using the existing `Sheet` component (slide from left). Contains links to Health Profile, Plans, and Admin. Include a hamburger trigger button.

2. **Update `BottomNav`** — reduce to 4 items: Home, Scan, History, Profile.

3. **Add `SideMenu` to layout** — render it alongside `BottomNav` in each page, or better, create a small `AppLayout` wrapper that includes both the hamburger menu (fixed top-left) and bottom nav, then use it across protected pages.

4. **Hamburger button styling** — fixed top-left with a subtle background, `Menu` icon from lucide-react. Active state highlighting for current route in the side menu.

