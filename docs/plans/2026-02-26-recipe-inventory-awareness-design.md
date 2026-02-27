# Recipe Inventory Awareness Design

**Goal:** Show ingredient availability in recipe views, add ingredient selection checkboxes, and make "Add to shopping list" smart about what's already in inventory.

**Scope:** `src/logic.ts`, `src/pages/RecipesPage.tsx`

---

## Commit 1: Inventory awareness — status indicators + recipe list badge

### New logic functions (`src/logic.ts`)

**`checkIngredient(ingredient: RecipeIngredient, inventory: InventoryItem[])`**
Returns `{ status: 'enough' | 'partial' | 'none'; inventoryQty: number; inventoryUnit: string }`.
- Find inventory item by name (case-insensitive)
- If not found: `{ status: 'none', inventoryQty: 0, inventoryUnit: ingredient.unit }`
- Convert recipe quantity to inventory item's unit via `convertTo`
- If inventory qty ≥ converted recipe qty: `enough`
- If inventory qty > 0 but less: `partial`
- inventoryQty/inventoryUnit are the raw inventory values (display as-is)

**`isRecipeReady(recipe: Recipe, inventory: InventoryItem[])`** → `boolean`
Returns true only if every ingredient has status `enough`.

**`addMissingToShoppingList(list, ingredients, inventory)`** → `ShoppingListItem[]`
Like `addRecipeToShoppingList` but:
- `enough` → skip
- `partial` → add shortfall (recipe qty − inventory qty converted to recipe unit)
- `none` → add full amount

### UI: Recipe list page
Each recipe row: show green `✓` after the ingredient count when `isRecipeReady` is true.

### UI: Recipe detail — ingredient rows
Each row: coloured dot on the left (🟢 enough, 🟡 partial, 🔴 none) + grey `(X unit in inventory)` after quantity/unit.

### UI: "Add to shopping list" button
Uses `addMissingToShoppingList` instead of `addRecipeToShoppingList`.
Toast: `"Added to shopping list"` as before, or `"All ingredients already in inventory"` if nothing was added.

---

## Commit 2: Ingredient selection checkboxes

### State
`selectedIngredients: Set<string>` — ingredient names. Starts empty. Cleared when navigating away.

### UI: Select-all row
A small row above the ingredient list (only when recipe has ≥ 1 ingredient) with a checkbox:
- Unchecked: nothing selected (or list empty — disabled)
- Checked: all selected
- Indeterminate: some selected
Same toggle logic as shopping list: all selected → deselect all, else select all.

### UI: Ingredient rows
Checkbox on the left of each row. Toggling adds/removes the ingredient name from `selectedIngredients`.

### "Add to shopping list" behaviour
- `selectedIngredients.size === 0` → `addMissingToShoppingList` (smart, skips covered ingredients)
- `selectedIngredients.size > 0` → `addRecipeToShoppingList` filtered to selected ingredients only (full amounts, ignores inventory)
