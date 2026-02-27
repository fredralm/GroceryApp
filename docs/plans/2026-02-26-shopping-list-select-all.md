# Shopping List Select All Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a select-all checkbox to the Shopping List header and a "Remove selected" button alongside the existing "Buy selected" button.

**Architecture:** Two pure functions added to `src/logic.ts` (testable in isolation), then wired into `src/pages/ShoppingListPage.tsx` as UI state handlers. No new types or store changes needed.

**Tech Stack:** React 18, TypeScript, Vitest, @testing-library/react (tests via vitest only, no component tests needed — logic is pure functions)

**Note:** This project has no git repo. Skip all commit steps.

---

### Task 1: Add pure functions to logic.ts

**Files:**
- Modify: `src/logic.ts`
- Test: `src/logic.test.ts`

**Step 1: Write the failing tests**

Open `src/logic.test.ts` and add these tests at the bottom (after the existing `collectAllIngredientNames` tests):

```ts
// --- selectAllItems ---

describe('selectAllItems', () => {
  const items: ShoppingListItem[] = [
    { id: '1', name: 'Milk', quantity: 1, unit: 'l', checked: false },
    { id: '2', name: 'Eggs', quantity: 6, unit: 'stk', checked: false },
    { id: '3', name: 'Bread', quantity: 1, unit: 'stk', checked: false },
  ]

  test('selects all when none are checked', () => {
    const result = selectAllItems(items)
    expect(result.every(i => i.checked)).toBe(true)
  })

  test('selects all when some are checked', () => {
    const partial = items.map((i, idx) => ({ ...i, checked: idx === 0 }))
    const result = selectAllItems(partial)
    expect(result.every(i => i.checked)).toBe(true)
  })

  test('deselects all when all are checked', () => {
    const allChecked = items.map(i => ({ ...i, checked: true }))
    const result = selectAllItems(allChecked)
    expect(result.every(i => i.checked)).toBe(false)
  })
})

// --- removeSelectedItems ---

describe('removeSelectedItems', () => {
  const items: ShoppingListItem[] = [
    { id: '1', name: 'Milk', quantity: 1, unit: 'l', checked: true },
    { id: '2', name: 'Eggs', quantity: 6, unit: 'stk', checked: false },
    { id: '3', name: 'Bread', quantity: 1, unit: 'stk', checked: true },
  ]

  test('removes only checked items', () => {
    const result = removeSelectedItems(items)
    expect(result.map(i => i.id)).toEqual(['2'])
  })

  test('returns all items unchanged when none are checked', () => {
    const none = items.map(i => ({ ...i, checked: false }))
    const result = removeSelectedItems(none)
    expect(result).toHaveLength(3)
  })
})
```

Also add `selectAllItems` and `removeSelectedItems` to the import at the top of `src/logic.test.ts`:

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
} from './logic'
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic.test.ts`

Expected: FAIL — `selectAllItems is not a function` and `removeSelectedItems is not a function`

**Step 3: Implement the functions in logic.ts**

Open `src/logic.ts` and add these two functions at the bottom of the file:

```ts
export function selectAllItems(items: ShoppingListItem[]): ShoppingListItem[] {
  const allChecked = items.every(i => i.checked)
  return items.map(i => ({ ...i, checked: !allChecked }))
}

export function removeSelectedItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.filter(i => !i.checked)
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic.test.ts`

Expected: All tests PASS (37 existing + 5 new = 42 total)

---

### Task 2: Update ShoppingListPage.tsx UI

**Files:**
- Modify: `src/pages/ShoppingListPage.tsx`

No new unit tests needed — this task is pure UI wiring of already-tested functions.

**Step 1: Import the new functions**

In `src/pages/ShoppingListPage.tsx`, update the logic import line from:

```ts
import { addToInventory, collectAllIngredientNames } from '../logic'
```

to:

```ts
import { addToInventory, collectAllIngredientNames, selectAllItems, removeSelectedItems } from '../logic'
```

**Step 2: Add the handler functions**

Inside the `ShoppingListPage` component, add these two functions alongside the existing handlers (e.g. after `handleDelete`):

```ts
function handleSelectAll() {
  persist(selectAllItems(items))
}

function handleRemoveSelected() {
  persist(removeSelectedItems(items))
}
```

**Step 3: Add the select-all checkbox to the page header**

Replace the existing page header:

```tsx
<div className="page-header">
  <h1>Shopping List</h1>
  <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add</button>
</div>
```

with:

```tsx
<div className="page-header">
  <input
    type="checkbox"
    checked={items.length > 0 && checkedCount === items.length}
    ref={el => {
      if (el) el.indeterminate = checkedCount > 0 && checkedCount < items.length
    }}
    onChange={handleSelectAll}
    disabled={items.length === 0}
    style={{ width: 20, height: 20, cursor: items.length === 0 ? 'default' : 'pointer', flexShrink: 0 }}
  />
  <h1>Shopping List</h1>
  <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add</button>
</div>
```

**Step 4: Update the bottom action bar**

Replace the existing action bar (the `checkedCount > 0` block):

```tsx
{checkedCount > 0 && (
  <div style={{ padding: 16 }}>
    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleBuySelected}>
      ✓ Buy selected ({checkedCount})
    </button>
  </div>
)}
```

with:

```tsx
{checkedCount > 0 && (
  <div style={{ padding: 16, display: 'flex', gap: 8 }}>
    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleBuySelected}>
      ✓ Buy selected ({checkedCount})
    </button>
    <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleRemoveSelected}>
      ✗ Remove selected ({checkedCount})
    </button>
  </div>
)}
```

**Step 5: Verify the full test suite still passes**

Run: `npx vitest run`

Expected: All 42 tests PASS, no errors or warnings.

**Step 6: Verify in preview**

Open the app at `http://localhost:5173/shopping`. Add a few items, check that:
- The header checkbox appears (disabled when list is empty)
- Checking items makes it go indeterminate; checking all makes it go fully checked
- Tapping it when all checked → deselects all
- "Buy selected" (green) and "Remove selected" (red) appear side by side when any item is checked
- "Remove selected" removes checked items without changing inventory
