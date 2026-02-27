# Recipe Inventory Awareness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show ingredient availability in recipe views, add ingredient selection checkboxes, and make "Add to shopping list" smart about what's already in inventory.

**Architecture:** Three pure functions added to `src/logic.ts` (fully testable in isolation), then wired into `src/pages/RecipesPage.tsx` across two logical commits. No new types or store changes needed.

**Tech Stack:** React 18, TypeScript, Vitest. No component tests — all logic is pure functions.

**Note:** This project has no git repo. Tasks are grouped into two logical commits for clarity but no git commands are needed.

---

### Task 1: `checkIngredient` — inventory status for a single ingredient

**Files:**
- Modify: `src/logic.ts`
- Test: `src/logic.test.ts`

**Step 1: Write the failing tests**

Add to the bottom of `src/logic.test.ts`. First add `checkIngredient` to the import at the top:

```ts
import {
  convertTo,
  addToInventory,
  subtractFromInventory,
  addRecipeToShoppingList,
  suggestIngredients,
  collectAllIngredientNames,
  selectAllItems,
  removeSelectedItems,
  checkIngredient,
} from './logic'
```

Then add these tests at the bottom:

```ts
describe('checkIngredient', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
    { id: '2', name: 'Milk', quantity: 0.5, unit: 'l' },
  ]

  it('returns none when ingredient not in inventory', () => {
    const result = checkIngredient({ name: 'Eggs', quantity: 2, unit: 'stk' }, inventory)
    expect(result).toEqual({ status: 'none', inventoryQty: 0, inventoryUnit: 'stk' })
  })

  it('returns enough when inventory has exactly the needed amount', () => {
    const result = checkIngredient({ name: 'Pasta', quantity: 500, unit: 'g' }, inventory)
    expect(result.status).toBe('enough')
    expect(result.inventoryQty).toBe(500)
    expect(result.inventoryUnit).toBe('g')
  })

  it('returns enough when inventory has more than needed', () => {
    const result = checkIngredient({ name: 'Pasta', quantity: 200, unit: 'g' }, inventory)
    expect(result.status).toBe('enough')
  })

  it('returns partial when inventory has some but not enough', () => {
    const result = checkIngredient({ name: 'Pasta', quantity: 800, unit: 'g' }, inventory)
    expect(result.status).toBe('partial')
  })

  it('returns enough with unit conversion (recipe g, inventory kg)', () => {
    const inv = [{ id: '1', name: 'Pasta', quantity: 1, unit: 'kg' }]
    const result = checkIngredient({ name: 'Pasta', quantity: 500, unit: 'g' }, inv)
    expect(result.status).toBe('enough')
  })

  it('returns partial with unit conversion when shortfall exists', () => {
    const inv = [{ id: '1', name: 'Pasta', quantity: 0.3, unit: 'kg' }]
    const result = checkIngredient({ name: 'Pasta', quantity: 500, unit: 'g' }, inv)
    expect(result.status).toBe('partial')
    expect(result.inventoryQty).toBe(0.3)
    expect(result.inventoryUnit).toBe('kg')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic.test.ts` from `/Users/fredrikalmas/Fredrik/grocery_app`

Expected: FAIL — `checkIngredient is not a function`

**Step 3: Implement `checkIngredient` in `src/logic.ts`**

Add at the bottom of `src/logic.ts`:

```ts
export function checkIngredient(
  ingredient: RecipeIngredient,
  inventory: InventoryItem[]
): { status: 'enough' | 'partial' | 'none'; inventoryQty: number; inventoryUnit: string } {
  const match = inventory.find(
    item => item.name.toLowerCase() === ingredient.name.toLowerCase()
  )
  if (!match) {
    return { status: 'none', inventoryQty: 0, inventoryUnit: ingredient.unit }
  }
  const converted = convertTo(ingredient.quantity, ingredient.unit, match.unit) ?? ingredient.quantity
  const status = match.quantity >= converted ? 'enough' : 'partial'
  return { status, inventoryQty: match.quantity, inventoryUnit: match.unit }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic.test.ts`

Expected: All tests pass (44 existing + 6 new = 50 total)

---

### Task 2: `isRecipeReady` — checks if all ingredients are covered

**Files:**
- Modify: `src/logic.ts`
- Test: `src/logic.test.ts`

**Step 1: Write the failing tests**

Add `isRecipeReady` to the import in `src/logic.test.ts`:

```ts
import {
  // ... existing imports ...
  checkIngredient,
  isRecipeReady,
} from './logic'
```

Add these tests at the bottom of `src/logic.test.ts`:

```ts
describe('isRecipeReady', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
    { id: '2', name: 'Milk', quantity: 1, unit: 'l' },
  ]

  it('returns true when all ingredients are covered', () => {
    const recipe: Recipe = {
      id: 'r1', name: 'Pasta', ingredients: [
        { name: 'Pasta', quantity: 400, unit: 'g' },
        { name: 'Milk', quantity: 0.5, unit: 'l' },
      ]
    }
    expect(isRecipeReady(recipe, inventory)).toBe(true)
  })

  it('returns false when any ingredient is partial', () => {
    const recipe: Recipe = {
      id: 'r1', name: 'Pasta', ingredients: [
        { name: 'Pasta', quantity: 600, unit: 'g' },
        { name: 'Milk', quantity: 0.5, unit: 'l' },
      ]
    }
    expect(isRecipeReady(recipe, inventory)).toBe(false)
  })

  it('returns false when any ingredient is missing', () => {
    const recipe: Recipe = {
      id: 'r1', name: 'Pasta', ingredients: [
        { name: 'Pasta', quantity: 400, unit: 'g' },
        { name: 'Eggs', quantity: 2, unit: 'stk' },
      ]
    }
    expect(isRecipeReady(recipe, inventory)).toBe(false)
  })

  it('returns true for recipe with no ingredients', () => {
    const recipe: Recipe = { id: 'r1', name: 'Empty', ingredients: [] }
    expect(isRecipeReady(recipe, inventory)).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic.test.ts`

Expected: FAIL — `isRecipeReady is not a function`

**Step 3: Implement `isRecipeReady` in `src/logic.ts`**

Add after `checkIngredient`:

```ts
export function isRecipeReady(recipe: Recipe, inventory: InventoryItem[]): boolean {
  return recipe.ingredients.every(
    ing => checkIngredient(ing, inventory).status === 'enough'
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic.test.ts`

Expected: All tests pass (50 existing + 4 new = 54 total)

---

### Task 3: `addMissingToShoppingList` — smart add that skips covered ingredients

**Files:**
- Modify: `src/logic.ts`
- Test: `src/logic.test.ts`

**Step 1: Write the failing tests**

Add `addMissingToShoppingList` to the import in `src/logic.test.ts`:

```ts
import {
  // ... existing imports ...
  isRecipeReady,
  addMissingToShoppingList,
} from './logic'
```

Add these tests at the bottom of `src/logic.test.ts`:

```ts
describe('addMissingToShoppingList', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
    { id: '2', name: 'Milk', quantity: 200, unit: 'ml' },
  ]

  it('skips ingredients already covered by inventory', () => {
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Pasta', quantity: 400, unit: 'g' }],
      inventory
    )
    expect(result).toHaveLength(0)
  })

  it('adds full amount for ingredient not in inventory', () => {
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Eggs', quantity: 3, unit: 'stk' }],
      inventory
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Eggs')
    expect(result[0].quantity).toBe(3)
  })

  it('adds shortfall for partial ingredient (same unit)', () => {
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Pasta', quantity: 800, unit: 'g' }],
      inventory
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pasta')
    expect(result[0].quantity).toBe(300)
    expect(result[0].unit).toBe('g')
  })

  it('adds shortfall for partial ingredient with unit conversion', () => {
    // inventory has 0.5 kg pasta = 500g, recipe needs 700g → shortfall 200g
    const inv = [{ id: '1', name: 'Pasta', quantity: 0.5, unit: 'kg' }]
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Pasta', quantity: 700, unit: 'g' }],
      inv
    )
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBeCloseTo(200)
    expect(result[0].unit).toBe('g')
  })

  it('returns existing list unchanged when all ingredients are covered', () => {
    const existing: ShoppingListItem[] = [
      { id: 'x1', name: 'Butter', quantity: 100, unit: 'g', checked: false }
    ]
    const result = addMissingToShoppingList(
      existing,
      [{ name: 'Pasta', quantity: 300, unit: 'g' }],
      inventory
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Butter')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic.test.ts`

Expected: FAIL — `addMissingToShoppingList is not a function`

**Step 3: Implement `addMissingToShoppingList` in `src/logic.ts`**

Add after `isRecipeReady`:

```ts
export function addMissingToShoppingList(
  list: ShoppingListItem[],
  ingredients: RecipeIngredient[],
  inventory: InventoryItem[]
): ShoppingListItem[] {
  const toAdd: RecipeIngredient[] = []
  for (const ing of ingredients) {
    const { status, inventoryQty, inventoryUnit } = checkIngredient(ing, inventory)
    if (status === 'enough') continue
    if (status === 'none') {
      toAdd.push(ing)
    } else {
      const inventoryInRecipeUnit = convertTo(inventoryQty, inventoryUnit, ing.unit) ?? inventoryQty
      const shortfall = ing.quantity - inventoryInRecipeUnit
      if (shortfall > 0) toAdd.push({ ...ing, quantity: shortfall })
    }
  }
  return addRecipeToShoppingList(list, toAdd)
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic.test.ts`

Expected: All tests pass (54 existing + 5 new = 59 total)

---

### Task 4: RecipesPage UI — inventory indicators + smart add to list (Commit 1)

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

No unit tests — this task is pure UI wiring of already-tested functions.

**Step 1: Update imports**

At the top of `src/pages/RecipesPage.tsx`, update the logic import:

```ts
import { subtractFromInventory, addRecipeToShoppingList, collectAllIngredientNames, checkIngredient, isRecipeReady, addMissingToShoppingList } from '../logic'
```

**Step 2: Capture inventory in component**

In the component body, line 13 currently reads:
```ts
const allNames = collectAllIngredientNames(loadInventory(), recipes)
```

Replace it with two lines:
```ts
const inventory = loadInventory()
const allNames = collectAllIngredientNames(inventory, recipes)
```

**Step 3: Update `handleAddToList`**

Replace the existing `handleAddToList` function:

```ts
function handleAddToList(recipe: Recipe) {
  if (isRecipeReady(recipe, inventory)) {
    showToast('All ingredients already in inventory')
    return
  }
  const list = loadShoppingList()
  saveShoppingList(addMissingToShoppingList(list, recipe.ingredients, inventory))
  showToast(`"${recipe.name}" added to shopping list`)
}
```

**Step 4: Add `✓` indicator to recipe list rows**

In the recipe list `return` (the second `return` block, starting around line 214), find the recipe list item:

```tsx
<div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
  <span className="list-item-name">{recipe.name}</span>
  <span className="list-item-meta">{recipe.ingredients.length} ingredients →</span>
</div>
```

Replace with:

```tsx
<div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
  <span className="list-item-name">{recipe.name}</span>
  <span className="list-item-meta">
    {recipe.ingredients.length} ingredients
    {isRecipeReady(recipe, inventory) && (
      <span style={{ color: '#4caf50', marginLeft: 6 }}>✓</span>
    )}
    {' →'}
  </span>
</div>
```

**Step 5: Add coloured dot and inventory amount to ingredient rows**

In the recipe detail view (first `return` block, starting around line 97), find the ingredient map:

```tsx
{selected.ingredients.map(ing => (
  <div key={ing.name} className="list-item">
    <span className="list-item-name">{ing.name}</span>
    <span className="list-item-meta">{ing.quantity} {ing.unit}</span>
    <button
      className="btn btn-danger"
      style={{ padding: '6px 10px', fontSize: 12 }}
      onClick={() => handleDeleteIngredient(ing.name)}
    >
      Remove
    </button>
  </div>
))}
```

Replace with:

```tsx
{selected.ingredients.map(ing => {
  const check = checkIngredient(ing, inventory)
  const dotColor = check.status === 'enough' ? '#4caf50' : check.status === 'partial' ? '#ff9800' : '#ef5350'
  return (
    <div key={ing.name} className="list-item">
      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span className="list-item-name">{ing.name}</span>
      <span className="list-item-meta">
        {ing.quantity} {ing.unit}
        <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>({check.inventoryQty} {check.inventoryUnit} in inventory)</span>
      </span>
      <button
        className="btn btn-danger"
        style={{ padding: '6px 10px', fontSize: 12 }}
        onClick={() => handleDeleteIngredient(ing.name)}
      >
        Remove
      </button>
    </div>
  )
})}
```

**Step 6: Verify full test suite**

Run: `npx vitest run` from `/Users/fredrikalmas/Fredrik/grocery_app`

Expected: All 59 tests pass.

---

### Task 5: Recipe detail — ingredient checkboxes + select all (Commit 2)

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

No unit tests — pure UI state.

**Step 1: Add `selectedIngredients` state**

In the component, add this state alongside the existing state declarations (after `const [toast, setToast] = useState('')`):

```ts
const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
```

**Step 2: Add handler functions**

Add these functions in the component body (after `handleCookIt`):

```ts
function toggleIngredient(name: string) {
  setSelectedIngredients(prev => {
    const next = new Set(prev)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })
}

function handleSelectAllIngredients() {
  if (selectedIngredients.size === selected?.ingredients.length) {
    setSelectedIngredients(new Set())
  } else {
    setSelectedIngredients(new Set(selected?.ingredients.map(i => i.name) ?? []))
  }
}
```

**Step 3: Update `handleAddToList` to handle selection**

Replace the `handleAddToList` from Task 4 with this version:

```ts
function handleAddToList(recipe: Recipe) {
  const list = loadShoppingList()
  if (selectedIngredients.size > 0) {
    const toAdd = recipe.ingredients.filter(ing => selectedIngredients.has(ing.name))
    saveShoppingList(addRecipeToShoppingList(list, toAdd))
    const count = selectedIngredients.size
    showToast(`Added ${count} ingredient${count > 1 ? 's' : ''} to shopping list`)
    setSelectedIngredients(new Set())
    return
  }
  if (isRecipeReady(recipe, inventory)) {
    showToast('All ingredients already in inventory')
    return
  }
  saveShoppingList(addMissingToShoppingList(list, recipe.ingredients, inventory))
  showToast(`"${recipe.name}" added to shopping list`)
}
```

**Step 4: Clear selection when navigating back**

In the recipe detail view, find the Back button:

```tsx
<button className="btn btn-ghost" onClick={() => setSelected(null)}>← Back</button>
```

Replace with:

```tsx
<button className="btn btn-ghost" onClick={() => { setSelected(null); setSelectedIngredients(new Set()) }}>← Back</button>
```

**Step 5: Add select-all row above ingredient list**

In the recipe detail view, find this block:

```tsx
<div style={{ padding: '8px 0' }}>
  {selected.ingredients.map(ing => {
```

Insert a select-all row between the outer div opening and the map:

```tsx
<div style={{ padding: '8px 0' }}>
  {selected.ingredients.length > 0 && (
    <div style={{ padding: '4px 16px 4px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
      <input
        type="checkbox"
        checked={selectedIngredients.size === selected.ingredients.length}
        ref={el => {
          if (el) el.indeterminate = selectedIngredients.size > 0 && selectedIngredients.size < selected.ingredients.length
        }}
        onChange={handleSelectAllIngredients}
        style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, color: '#666' }}>Select all</span>
    </div>
  )}
  {selected.ingredients.map(ing => {
```

**Step 6: Add checkbox to each ingredient row**

Inside the ingredient map from Task 4, add a checkbox as the first child of each row (before the dot span):

```tsx
{selected.ingredients.map(ing => {
  const check = checkIngredient(ing, inventory)
  const dotColor = check.status === 'enough' ? '#4caf50' : check.status === 'partial' ? '#ff9800' : '#ef5350'
  return (
    <div key={ing.name} className="list-item">
      <input
        type="checkbox"
        checked={selectedIngredients.has(ing.name)}
        onChange={() => toggleIngredient(ing.name)}
        style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span className="list-item-name">{ing.name}</span>
      <span className="list-item-meta">
        {ing.quantity} {ing.unit}
        <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>({check.inventoryQty} {check.inventoryUnit} in inventory)</span>
      </span>
      <button
        className="btn btn-danger"
        style={{ padding: '6px 10px', fontSize: 12 }}
        onClick={() => handleDeleteIngredient(ing.name)}
      >
        Remove
      </button>
    </div>
  )
})}
```

**Step 7: Verify full test suite**

Run: `npx vitest run` from `/Users/fredrikalmas/Fredrik/grocery_app`

Expected: All 59 tests pass.

**Step 8: Verify in preview**

Open `http://localhost:5173/recipes`. Check:
- Recipe list shows green `✓` next to recipes where all ingredients are in inventory
- Opening a recipe shows coloured dots and `(X unit in inventory)` on each ingredient row
- "Add to shopping list" with nothing selected only adds missing/shortfall ingredients; shows "All ingredients already in inventory" if all covered
- Checking individual ingredients then tapping "Add to shopping list" adds full amounts for selected items only
- Select-all checkbox toggles all ingredient checkboxes; re-tapping when all checked deselects all
