

# Plan: Add Barcode Scan & Manual Ingredient Input

## Overview

Extend the existing ScanPage with two new input methods (barcode and manual text) alongside the current image scan, and update the edge function to accept raw ingredient text directly.

## Architecture

```text
ScanPage (tabs: Photo | Barcode | Ingredients)
   ├─ Photo tab → existing image flow → analyze-food(image)
   ├─ Barcode tab → input/camera → Open Food Facts API → analyze-food(ingredients_text)
   └─ Ingredients tab → textarea → analyze-food(ingredients_text)

Edge Function: analyze-food
   ├─ if body.image → OCR → Groq analysis (existing)
   └─ if body.ingredients_text → skip OCR → Groq analysis directly
```

## Changes

### 1. Update Edge Function (`supabase/functions/analyze-food/index.ts`)

- Accept an optional `ingredients_text` field alongside `image`
- If `ingredients_text` is provided, skip the OCR step entirely and pass it directly to the Groq analysis step
- If `image` is provided, use existing OCR flow
- Require at least one of the two fields

### 2. Redesign ScanPage (`src/pages/ScanPage.tsx`)

Replace the single image-upload UI with a tabbed interface using three modes:

- **Photo** (existing): Camera/gallery image upload, unchanged behavior
- **Barcode**: Text input for barcode number + a "Scan" button that uses camera. On submit:
  1. Fetch `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
  2. Extract `product_name`, `ingredients_text`, `allergens_tags`, `brands`
  3. If ingredients found, call `analyze-food` with `ingredients_text`
  4. If product not found or no ingredients, show error with option to paste manually
- **Ingredients**: Textarea for pasting raw ingredient text. Submit calls `analyze-food` with `ingredients_text`

All three paths reuse the same processing state UI (spinner, steps, redirect to results).

### 3. Shared Analysis Helper

Extract the post-analysis logic (save to history, save to DB, navigate) into a shared function within ScanPage to avoid duplication across the three input methods.

### 4. Processing Steps Update

Adjust the step labels dynamically based on input method:
- Photo: "Reading image" → "Extracting ingredients" → "Analyzing safety"
- Barcode: "Fetching product" → "Reading ingredients" → "Analyzing safety"  
- Ingredients: "Reading ingredients" → "Analyzing safety"

### 5. UI Design

The tab selector will sit above the current content area using pill-style buttons. Each tab shows its own input UI below. The processing and limit-reached states remain shared.

### 6. Error Handling

- Barcode not found: Toast error + suggest switching to Ingredients tab
- No ingredients in product data: Toast + suggest manual input
- API failures: Existing error handling applies
- Empty textarea submission: Client-side validation

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/analyze-food/index.ts` | Accept `ingredients_text`, skip OCR when provided |
| `src/pages/ScanPage.tsx` | Add tabbed UI with barcode + manual input modes |

No new routes, database changes, or dependencies needed. Open Food Facts API is public and requires no key.

