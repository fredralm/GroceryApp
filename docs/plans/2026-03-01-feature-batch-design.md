# Feature Batch Design — 2026-03-01

## Overview

Ten features added to the GroceryApp across the Recipes, Inventory, Shopping List, and a new Settings page.

---

## Section 1: Quick Wins

### 1a. Inventory "Delete" → "Remove"
- Change button text on line 74 of `InventoryPage.tsx` from `Delete` to `Remove`.

### 1b. ml ↔ dl Unit Conversion
- Add entries to the `CONVERSIONS` table in `logic.ts`:
  - `ml->dl: 0.01`, `dl->ml: 100`
  - `ml->l: 0.001`, `l->ml: 1000`
  - `ml->cl: 0.1`, `cl->ml: 10`

### 1c. Edit Ingredient in Recipe
- Tapping an ingredient row in the recipe detail view opens an edit modal pre-filled with name/quantity/unit.
- On save, the ingredient is updated in place.
- Reuses the same form UI as "Add ingredient".

---

## Section 2: Recipe List Enhancements

### 2a. Missing Ingredient Count
- New logic function `countMissing(recipe, inventory, allRecipes): number` — counts ingredients (including expanded sub-recipes) whose status is not `'enough'`.
- Shown on recipe list cards: e.g. `2 missing` in orange/red, or green ✓ if all covered.

### 2b. Sort by Missing Count
- Recipe list auto-sorted ascending by missing count (0 first).
- Stable sort: recipes with equal missing count keep their original relative order.

### 2c. Recipe Search
- Search input below the page header on the recipes list view.
- Filters by recipe name (case-insensitive substring match).
- State is local; resets when navigating away.

---

## Section 3: Sub-Recipe (Live Reference)

### Data Model
Extend `Recipe` in `types.ts`:
```ts
export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  subRecipes?: { recipeId: string; multiplier: number }[]
}
```

### Logic
- `expandIngredients(recipe, allRecipes): RecipeIngredient[]` — returns flat list of all effective ingredients: own ingredients plus each sub-recipe's ingredients scaled by multiplier.
- All inventory checks, cook-it, and shopping list operations use expanded ingredients.
- Circular reference guard: before adding recipe B as sub-recipe of A, traverse B's sub-recipe tree to ensure A does not appear.

### UI — Add Ingredient Flow
- The autocomplete in the "Add ingredient" form suggests both ingredient names and existing recipe names (recipe names displayed with a 📋 prefix or "Recipe:" label).
- When a recipe name is selected:
  - Quantity field label changes to "Multiplier" (accepts decimals, e.g. `0.5`)
  - Unit field is hidden
  - Saving stores `{ recipeId, multiplier }` in `subRecipes`
- When a plain ingredient name is selected: existing behaviour unchanged.

### UI — Recipe Detail
- Sub-recipe entries appear in the ingredient list as e.g. **📋 0.5× Ragu Bolognese** (italic or visually distinct).
- Tapping a sub-recipe row opens an edit modal with just the multiplier field.
- Delete works the same as for regular ingredients.

---

## Section 4: Shuffle / Meal Suggestion

- Shuffle button 🎲 in the recipes list header.
- Opens a modal with:
  - Toggle: "Any recipe" / "Only recipes I can cook now"
  - Large display of the suggested recipe name
  - "Shuffle again" button
  - "Open recipe" button (navigates to recipe detail and closes modal)
- If no recipes match the filter, shows a message instead.

---

## Section 5: Share & Import

### Share Recipes
- Share icon/button on the Recipes list header.
- Opens a selection modal:
  - Select all / Deselect all checkbox
  - List of recipes with individual checkboxes
  - "Share" button (disabled if none selected)
- Export format:
  ```json
  { "type": "grocery-recipes", "recipes": [...] }
  ```
- Uses `navigator.share()` if available, otherwise copies to clipboard.

### Import Recipes
- "Import" button (separate from share).
- Opens a textarea modal; user pastes JSON.
- On confirm: parses, validates `type === "grocery-recipes"`, merges by name (skips existing names).

### Share Shopping List
- Share button on Shopping List page header.
- Exports all current items:
  ```json
  { "type": "grocery-shopping-list", "items": [...] }
  ```
- Same share mechanism (native share / clipboard).

### Import Shopping List
- Import button on Shopping List page.
- Same paste-JSON flow; merges by name.

---

## Section 6: Norwegian Language / Settings Page

### Settings Page
- New fourth tab in `BottomNav` with ⚙ icon, label "Settings" / "Innstillinger".
- Contains a language toggle: `English | Norsk`.
- Language preference stored in localStorage under key `grocery_lang`.

### Translation System
- `src/i18n.ts` exports:
  - `type Lang = 'en' | 'no'`
  - `translations: Record<Lang, Record<string, string>>`
  - `useTranslation()` hook returning `t(key: string): string`
- All visible UI strings across all pages wrapped in `t()`.
- No external i18n library; plain object lookup.
- ~80–100 strings covering all pages.

---

## Files Affected

| File | Changes |
|------|---------|
| `src/types.ts` | Add `subRecipes` to `Recipe` |
| `src/logic.ts` | Add ml conversions, `countMissing`, `expandIngredients`, circular guard |
| `src/store.ts` | Add `loadLang`/`saveLang` helpers |
| `src/i18n.ts` | New file: translations + `useTranslation` hook |
| `src/pages/RecipesPage.tsx` | Search, sort, missing count, sub-recipe flow, shuffle, share/import |
| `src/pages/InventoryPage.tsx` | "Remove" text, translations |
| `src/pages/ShoppingListPage.tsx` | Share/import, translations |
| `src/pages/SettingsPage.tsx` | New file: language toggle |
| `src/components/BottomNav.tsx` | Add Settings tab |
| `src/App.tsx` | Add Settings route/tab |
