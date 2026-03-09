

# Plan: Scan Analytics Dashboard + Product Comparison + Dark/Light Mode

Three features to implement across new pages, components, and theme infrastructure.

---

## 1. Scan Analytics Dashboard (Home Page)

**What**: A collapsible analytics section on the home page showing scan trends and insights from the user's `scan_results` data.

**Components**:
- New `src/components/ScanAnalytics.tsx` component with:
  - **Average Safety Score** (big number + trend indicator)
  - **Weekly scan count bar chart** (recharts `BarChart`, last 4 weeks)
  - **Safety distribution pie chart** (safe/moderate/unsafe breakdown using `PieChart`)
  - **Top harmful ingredients** (aggregated from `analysis.harmful_ingredients` across all scans)
- Fetches from `scan_results` table (already has `safety_score`, `analysis` JSONB, `created_at`)
- Uses `recharts` (already installed) with chart config from existing `chart.tsx` primitives
- Shown on HomePage below hero, above recent scans, with a "Your Insights" header
- Only renders when user has 2+ scans

**Data query**: Single Supabase query to `scan_results` ordered by `created_at` desc, limit 100. All aggregation done client-side.

---

## 2. Product Comparison Page

**What**: New `/compare` page where users pick two products from their scan history and see a side-by-side comparison.

**Components & Files**:
- New `src/pages/ComparePage.tsx`:
  - Two product selector dropdowns (populated from `scan_results`)
  - Side-by-side layout showing for each product:
    - Safety score with color coding
    - Harmful ingredients list (highlighted differences)
    - Beneficial ingredients list
    - Allergens
    - Health warnings
    - Recommendation
  - A "Winner" badge on the product with higher safety score
  - "Pick Healthier" summary at the top
- Add route `/compare` to `App.tsx` (protected)
- Add "Compare" option to `BottomNav` (replace or add as 5th item) or add to `SideMenu`
- Add to SideMenu with `GitCompare` icon

---

## 3. Dark/Light Mode Toggle

**What**: Theme toggle using `next-themes` (already installed) to switch between dark and light modes.

**Changes**:

- **`src/index.css`**: Add light theme CSS variables under a `.light` or `:root` selector (the current vars are dark-only). Add corresponding light values for all CSS custom properties.

- **`src/main.tsx`**: Wrap app with `ThemeProvider` from `next-themes` with `attribute="class"` and `defaultTheme="dark"`.

- **`index.html`**: Ensure `<html>` doesn't have a hardcoded `class="dark"`.

- **New `src/components/ThemeToggle.tsx`**: Small toggle button using `useTheme()` from `next-themes`, with Sun/Moon icons. Placed in the SideMenu.

- **`src/components/SideMenu.tsx`**: Add ThemeToggle at the bottom of the menu.

---

## Technical Details

- **No database changes needed** -- all three features use existing tables
- **recharts** charts use the existing `ChartContainer` / `ChartConfig` pattern from `src/components/ui/chart.tsx`
- Light theme colors will be carefully chosen to complement the existing green primary palette
- The comparison page uses client-side data from `scan_results` already fetched via Supabase
- Theme preference persisted via `next-themes` localStorage

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/components/ScanAnalytics.tsx` |
| Create | `src/pages/ComparePage.tsx` |
| Create | `src/components/ThemeToggle.tsx` |
| Modify | `src/pages/HomePage.tsx` (add analytics section) |
| Modify | `src/App.tsx` (add compare route, ThemeProvider) |
| Modify | `src/components/SideMenu.tsx` (add compare + theme toggle) |
| Modify | `src/index.css` (add light theme variables) |
| Modify | `index.html` (remove hardcoded dark if any) |
| Modify | `src/main.tsx` (ThemeProvider wrapper) |

