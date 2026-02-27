# Shopping List Select All Design

**Goal:** Add select-all/deselect-all and a remove-selected action to the Shopping List page.

**Scope:** `src/pages/ShoppingListPage.tsx` only — no new types, no store changes.

---

## Header

The `page-header` row gets a checkbox on the left (before the `<h1>`):
- Unchecked when nothing is selected (or list is empty — disabled)
- Checked when all items are selected
- Indeterminate when some but not all are selected

Tap behaviour: if all items are checked → deselect all. Otherwise → select all.

## Bottom Action Bar

When `checkedCount > 0`, show two buttons side by side:
- **Buy selected (N)** — green (`btn-primary`), existing behaviour: adds checked items to inventory, removes from list
- **Remove selected (N)** — red (`btn-danger`), new: removes checked items from list without touching inventory

## Logic

- `selectAll()`: if all checked, set all `checked: false`; otherwise set all `checked: true`
- `handleRemoveSelected()`: filter out `item.checked === true`

## Tests

- `selectAll` when none checked → all checked
- `selectAll` when some checked → all checked
- `selectAll` when all checked → all unchecked
- `handleRemoveSelected` removes only checked items, leaves unchecked intact
