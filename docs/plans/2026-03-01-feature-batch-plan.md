# Feature Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 10 features to GroceryApp: ml conversions, sub-recipes (live references), recipe search/sort/missing-count, edit ingredient, shuffle suggestion, share/import, Norwegian language, Settings page, inventory "Remove" label.

**Architecture:** All state in localStorage via `store.ts`. Logic is pure functions in `logic.ts` (tested with vitest). UI is React + TypeScript in `src/pages/` and `src/components/`. i18n uses a React context wrapping the whole app with a `t(key)` hook — no external library. Sub-recipes are stored as `{ recipeId, multiplier }[]` on the Recipe type; `expandIngredients()` flattens them recursively for all inventory/cooking operations.

**Tech Stack:** React 19, TypeScript, Vite, React Router v7, vitest, jsdom. Tests run with `npx vitest run`. Dev server: `npm run dev`.

---

## Task 1: ml Unit Conversions

**Files:**
- Modify: `src/logic.ts:5-14` (CONVERSIONS table)
- Modify: `src/logic.test.ts` (add tests at top of `convertTo` describe block)

**Step 1: Write failing tests**

Add to the `convertTo` describe block in `src/logic.test.ts`:

```typescript
it('converts ml to dl', () => {
  expect(convertTo(100, 'ml', 'dl')).toBeCloseTo(1)
})
it('converts dl to ml', () => {
  expect(convertTo(1, 'dl', 'ml')).toBe(100)
})
it('converts ml to l', () => {
  expect(convertTo(1000, 'ml', 'l')).toBeCloseTo(1)
})
it('converts l to ml', () => {
  expect(convertTo(1, 'l', 'ml')).toBe(1000)
})
it('converts ml to cl', () => {
  expect(convertTo(10, 'ml', 'cl')).toBeCloseTo(1)
})
it('converts cl to ml', () => {
  expect(convertTo(1, 'cl', 'ml')).toBe(10)
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic.test.ts
```
Expected: 6 new tests FAIL with "null is not close to 1"

**Step 3: Add conversions to CONVERSIONS table**

In `src/logic.ts`, extend the CONVERSIONS object:

```typescript
const CONVERSIONS: Record<string, number> = {
  'kg->g': 1000,
  'g->kg': 0.001,
  'l->dl': 10,
  'dl->l': 0.1,
  'cl->dl': 0.1,
  'dl->cl': 10,
  'l->cl': 100,
  'cl->l': 0.01,
  'ml->dl': 0.01,
  'dl->ml': 100,
  'ml->l': 0.001,
  'l->ml': 1000,
  'ml->cl': 0.1,
  'cl->ml': 10,
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/logic.test.ts
```
Expected: all PASS

**Step 5: Commit**

```bash
git add src/logic.ts src/logic.test.ts
git commit -m "feat: add ml unit conversions"
```

---

## Task 2: Recipe Type Extension + Logic Functions

**Files:**
- Modify: `src/types.ts`
- Modify: `src/logic.ts` (add 3 new functions at the bottom)
- Modify: `src/logic.test.ts` (add test blocks at bottom)

**Step 1: Extend Recipe type**

In `src/types.ts`, add `subRecipes` to Recipe:

```typescript
export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
}

export interface SubRecipeRef {
  recipeId: string
  multiplier: number
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  subRecipes?: SubRecipeRef[]
}
```

**Step 2: Write failing tests**

Add to `src/logic.test.ts`:

```typescript
import {
  convertTo, addToInventory, subtractFromInventory, addRecipeToShoppingList,
  suggestIngredients, collectAllIngredientNames, selectAllItems, removeSelectedItems,
  checkIngredient, isRecipeReady, addMissingToShoppingList,
  expandIngredients, countMissing, hasCircularRef,
} from './logic'
```

Add these describe blocks at the bottom of `src/logic.test.ts`:

```typescript
describe('expandIngredients', () => {
  const ragu: Recipe = {
    id: 'ragu', name: 'Ragu', ingredients: [
      { name: 'Ground beef', quantity: 300, unit: 'g' },
      { name: 'Tomato', quantity: 2, unit: 'pcs' },
    ]
  }
  const pasta: Recipe = {
    id: 'pasta', name: 'Pasta Bolognese',
    ingredients: [{ name: 'Pasta', quantity: 400, unit: 'g' }],
    subRecipes: [{ recipeId: 'ragu', multiplier: 0.5 }],
  }
  const allRecipes = [ragu, pasta]

  it('returns own ingredients when no subRecipes', () => {
    const result = expandIngredients(ragu, allRecipes)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Ground beef')
  })

  it('appends sub-recipe ingredients scaled by multiplier', () => {
    const result = expandIngredients(pasta, allRecipes)
    expect(result).toHaveLength(3)
    const beef = result.find(i => i.name === 'Ground beef')
    expect(beef?.quantity).toBeCloseTo(150) // 300 * 0.5
  })

  it('handles missing sub-recipe gracefully', () => {
    const broken: Recipe = {
      id: 'broken', name: 'Broken', ingredients: [],
      subRecipes: [{ recipeId: 'nonexistent', multiplier: 1 }],
    }
    expect(expandIngredients(broken, [broken])).toHaveLength(0)
  })

  it('prevents infinite loop on circular reference', () => {
    const a: Recipe = { id: 'a', name: 'A', ingredients: [], subRecipes: [{ recipeId: 'b', multiplier: 1 }] }
    const b: Recipe = { id: 'b', name: 'B', ingredients: [], subRecipes: [{ recipeId: 'a', multiplier: 1 }] }
    expect(() => expandIngredients(a, [a, b])).not.toThrow()
    expect(expandIngredients(a, [a, b])).toHaveLength(0)
  })
})

describe('countMissing', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 400, unit: 'g' },
  ]
  const recipe: Recipe = {
    id: 'r1', name: 'Test', ingredients: [
      { name: 'Pasta', quantity: 400, unit: 'g' },
      { name: 'Eggs', quantity: 2, unit: 'pcs' },
    ]
  }

  it('returns count of ingredients not fully in inventory', () => {
    expect(countMissing(recipe, inventory, [])).toBe(1)
  })

  it('returns 0 when all ingredients are covered', () => {
    const full: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 400, unit: 'g' },
      { id: '2', name: 'Eggs', quantity: 2, unit: 'pcs' },
    ]
    expect(countMissing(recipe, full, [])).toBe(0)
  })

  it('counts missing from expanded sub-recipes', () => {
    const sub: Recipe = { id: 'sub', name: 'Sub', ingredients: [{ name: 'Beef', quantity: 200, unit: 'g' }] }
    const parent: Recipe = {
      id: 'parent', name: 'Parent', ingredients: [],
      subRecipes: [{ recipeId: 'sub', multiplier: 1 }],
    }
    expect(countMissing(parent, inventory, [sub, parent])).toBe(1)
  })
})

describe('hasCircularRef', () => {
  const a: Recipe = { id: 'a', name: 'A', ingredients: [], subRecipes: [{ recipeId: 'b', multiplier: 1 }] }
  const b: Recipe = { id: 'b', name: 'B', ingredients: [] }
  const allRecipes = [a, b]

  it('returns false when no cycle', () => {
    expect(hasCircularRef('b', 'a', allRecipes)).toBe(false)
  })

  it('returns true when candidate is same as parent', () => {
    expect(hasCircularRef('a', 'a', allRecipes)).toBe(true)
  })

  it('returns true when adding would create a cycle', () => {
    // b currently has no subRecipes; adding a as sub of b would create a->b->a cycle
    // hasCircularRef('b', 'a', allRecipes): does a's tree contain 'b'? Yes (a->b)
    expect(hasCircularRef('b', 'a', allRecipes)).toBe(false)
    // Now if we want to add a as sub of b: check hasCircularRef('b', 'a')
    // a has subRecipe b, and b is the parent, so yes circular
    const bWithA: Recipe = { id: 'b', name: 'B', ingredients: [], subRecipes: [{ recipeId: 'a', multiplier: 1 }] }
    expect(hasCircularRef('b', 'a', [a, bWithA])).toBe(true)
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
npx vitest run src/logic.test.ts
```
Expected: new tests FAIL with "not a function"

**Step 4: Add the three functions to logic.ts**

Add at the bottom of `src/logic.ts`:

```typescript
export function expandIngredients(
  recipe: Recipe,
  allRecipes: Recipe[],
  visited: Set<string> = new Set()
): RecipeIngredient[] {
  if (visited.has(recipe.id)) return []
  const nextVisited = new Set(visited)
  nextVisited.add(recipe.id)

  const result: RecipeIngredient[] = [...recipe.ingredients]
  for (const sub of recipe.subRecipes ?? []) {
    const subRecipe = allRecipes.find(r => r.id === sub.recipeId)
    if (!subRecipe) continue
    const subIngredients = expandIngredients(subRecipe, allRecipes, nextVisited)
    for (const ing of subIngredients) {
      result.push({ ...ing, quantity: ing.quantity * sub.multiplier })
    }
  }
  return result
}

export function countMissing(
  recipe: Recipe,
  inventory: InventoryItem[],
  allRecipes: Recipe[]
): number {
  const expanded = expandIngredients(recipe, allRecipes)
  return expanded.filter(ing => checkIngredient(ing, inventory).status !== 'enough').length
}

export function hasCircularRef(
  parentId: string,
  candidateId: string,
  allRecipes: Recipe[]
): boolean {
  if (candidateId === parentId) return true
  const candidate = allRecipes.find(r => r.id === candidateId)
  if (!candidate) return false
  return (candidate.subRecipes ?? []).some(sub =>
    hasCircularRef(parentId, sub.recipeId, allRecipes)
  )
}
```

Also update the `isRecipeReady` function to accept optional `allRecipes` for sub-recipe awareness:

```typescript
export function isRecipeReady(recipe: Recipe, inventory: InventoryItem[], allRecipes?: Recipe[]): boolean {
  const ingredients = allRecipes ? expandIngredients(recipe, allRecipes) : recipe.ingredients
  return ingredients.every(
    ing => checkIngredient(ing, inventory).status === 'enough'
  )
}
```

**Step 5: Run tests to verify they pass**

```bash
npx vitest run src/logic.test.ts
```
Expected: all PASS

**Step 6: Commit**

```bash
git add src/types.ts src/logic.ts src/logic.test.ts
git commit -m "feat: add sub-recipe type, expandIngredients, countMissing, hasCircularRef"
```

---

## Task 3: i18n Infrastructure

**Files:**
- Create: `src/i18n.tsx`
- Modify: `src/store.ts`

**Step 1: Add lang storage to store.ts**

Add at the bottom of `src/store.ts`:

```typescript
export type Lang = 'en' | 'no'

export function loadLang(): Lang {
  const raw = localStorage.getItem('grocery_lang')
  return raw === 'no' ? 'no' : 'en'
}

export function saveLang(lang: Lang): void {
  localStorage.setItem('grocery_lang', lang)
}
```

**Step 2: Create src/i18n.tsx**

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadLang, saveLang, type Lang } from './store'

const translations = {
  en: {
    // Nav
    'nav.inventory': 'Inventory',
    'nav.recipes': 'Recipes',
    'nav.shopping': 'Shopping',
    'nav.settings': 'Settings',

    // Inventory
    'inventory.title': 'Inventory',
    'inventory.add': '+ Add',
    'inventory.empty': 'No items yet. Add what you have at home.',
    'inventory.remove': 'Remove',
    'inventory.editItem': 'Edit Item',
    'inventory.addItem': 'Add Item',
    'inventory.name': 'Name',
    'inventory.quantity': 'Quantity',
    'inventory.unit': 'Unit',
    'inventory.cancel': 'Cancel',
    'inventory.save': 'Save',
    'inventory.namePlaceholder': 'e.g. Pasta',
    'inventory.quantityPlaceholder': 'e.g. 500',
    'inventory.unitPlaceholder': 'e.g. g',

    // Recipes list
    'recipes.title': 'Recipes',
    'recipes.add': '+ Add',
    'recipes.empty': 'No recipes yet. Add your first recipe.',
    'recipes.search': 'Search recipes…',
    'recipes.ingredients': 'ingredients',
    'recipes.missing': 'missing',
    'recipes.newRecipe': 'New Recipe',
    'recipes.recipeName': 'Recipe name',
    'recipes.recipeNamePlaceholder': 'e.g. Bolognese',
    'recipes.create': 'Create',
    'recipes.cancel': 'Cancel',
    'recipes.shuffle': '🎲',

    // Recipe detail
    'recipe.back': '← Back',
    'recipe.edit': 'Edit',
    'recipe.selectAll': 'Select all',
    'recipe.addIngredient': '+ Add ingredient',
    'recipe.addToList': '🛒 Add to shopping list',
    'recipe.cookIt': '🍳 Cook it',
    'recipe.deleteRecipe': 'Delete recipe',
    'recipe.noIngredients': 'No ingredients yet.',
    'recipe.inInventory': 'in inventory',
    'recipe.remove': 'Remove',
    'recipe.editRecipeName': 'Edit Recipe Name',
    'recipe.name': 'Name',
    'recipe.save': 'Save',
    'recipe.cancel': 'Cancel',
    'recipe.addIngredientTitle': 'Add Ingredient',
    'recipe.editIngredientTitle': 'Edit Ingredient',
    'recipe.ingredientName': 'Name',
    'recipe.ingredientNamePlaceholder': 'e.g. Ground beef',
    'recipe.quantity': 'Quantity',
    'recipe.multiplier': 'Multiplier',
    'recipe.multiplierPlaceholder': 'e.g. 0.5',
    'recipe.unit': 'Unit',
    'recipe.unitPlaceholder': 'e.g. g',
    'recipe.add': 'Add',
    'recipe.missingWarningTitle': 'Missing ingredients',
    'recipe.missingWarningBody': 'Some ingredients are missing or insufficient in your inventory. You can still cook with what you have.',
    'recipe.missingWarningCheckbox': "I'll cook with the ingredients I have in inventory",
    'recipe.subRecipeLabel': 'x',
    'recipe.editMultiplierTitle': 'Edit Multiplier',

    // Share/import recipes
    'recipes.shareTitle': 'Share Recipes',
    'recipes.importTitle': 'Import Recipes',
    'recipes.shareBtn': 'Share',
    'recipes.importBtn': 'Import',
    'recipes.importPlaceholder': 'Paste JSON here…',
    'recipes.importConfirm': 'Import',
    'recipes.selectAll': 'Select all',
    'recipes.deselectAll': 'Deselect all',
    'recipes.importSuccess': 'Imported {n} recipe(s)',
    'recipes.importError': 'Invalid recipe data',
    'recipes.copiedToClipboard': 'Copied to clipboard',
    'recipes.noneSelected': 'Select at least one recipe',

    // Shuffle
    'shuffle.title': 'Meal Suggestion',
    'shuffle.filterAny': 'Any recipe',
    'shuffle.filterReady': 'Only recipes I can cook now',
    'shuffle.again': 'Shuffle again',
    'shuffle.open': 'Open recipe',
    'shuffle.none': 'No recipes match this filter.',

    // Shopping list
    'shopping.title': 'Shopping List',
    'shopping.add': '+ Add',
    'shopping.empty': 'Your list is empty. Add items or use "Add to list" from a recipe.',
    'shopping.addItem': 'Add Item',
    'shopping.name': 'Name',
    'shopping.namePlaceholder': 'e.g. Toilet paper',
    'shopping.quantityOptional': 'Quantity (optional)',
    'shopping.unitOptional': 'Unit (optional)',
    'shopping.unitPlaceholder': 'e.g. pcs',
    'shopping.cancel': 'Cancel',
    'shopping.addBtn': 'Add',
    'shopping.buySelected': '✓ Buy selected ({n})',
    'shopping.removeSelected': '✗ Remove selected ({n})',
    'shopping.shareTitle': 'Share Shopping List',
    'shopping.importTitle': 'Import Shopping List',
    'shopping.importPlaceholder': 'Paste JSON here…',
    'shopping.importConfirm': 'Import',
    'shopping.importSuccess': 'Imported {n} item(s)',
    'shopping.importError': 'Invalid shopping list data',
    'shopping.copiedToClipboard': 'Copied to clipboard',
    'shopping.share': 'Share',
    'shopping.import': 'Import',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.english': 'English',
    'settings.norwegian': 'Norsk',
  },
  no: {
    // Nav
    'nav.inventory': 'Ingredienser',
    'nav.recipes': 'Oppskrifter',
    'nav.shopping': 'Handleliste',
    'nav.settings': 'Innstillinger',

    // Inventory
    'inventory.title': 'Ingredienser',
    'inventory.add': '+ Legg til',
    'inventory.empty': 'Ingen varer ennå. Legg til det du har hjemme.',
    'inventory.remove': 'Fjern',
    'inventory.editItem': 'Rediger vare',
    'inventory.addItem': 'Legg til vare',
    'inventory.name': 'Navn',
    'inventory.quantity': 'Mengde',
    'inventory.unit': 'Enhet',
    'inventory.cancel': 'Avbryt',
    'inventory.save': 'Lagre',
    'inventory.namePlaceholder': 'f.eks. Pasta',
    'inventory.quantityPlaceholder': 'f.eks. 500',
    'inventory.unitPlaceholder': 'f.eks. g',

    // Recipes list
    'recipes.title': 'Oppskrifter',
    'recipes.add': '+ Legg til',
    'recipes.empty': 'Ingen oppskrifter ennå. Legg til din første oppskrift.',
    'recipes.search': 'Søk i oppskrifter…',
    'recipes.ingredients': 'ingredienser',
    'recipes.missing': 'mangler',
    'recipes.newRecipe': 'Ny oppskrift',
    'recipes.recipeName': 'Oppskriftsnavn',
    'recipes.recipeNamePlaceholder': 'f.eks. Bolognese',
    'recipes.create': 'Opprett',
    'recipes.cancel': 'Avbryt',
    'recipes.shuffle': '🎲',

    // Recipe detail
    'recipe.back': '← Tilbake',
    'recipe.edit': 'Rediger',
    'recipe.selectAll': 'Velg alle',
    'recipe.addIngredient': '+ Legg til ingrediens',
    'recipe.addToList': '🛒 Legg til handleliste',
    'recipe.cookIt': '🍳 Lag det',
    'recipe.deleteRecipe': 'Slett oppskrift',
    'recipe.noIngredients': 'Ingen ingredienser ennå.',
    'recipe.inInventory': 'på lager',
    'recipe.remove': 'Fjern',
    'recipe.editRecipeName': 'Rediger oppskriftsnavn',
    'recipe.name': 'Navn',
    'recipe.save': 'Lagre',
    'recipe.cancel': 'Avbryt',
    'recipe.addIngredientTitle': 'Legg til ingrediens',
    'recipe.editIngredientTitle': 'Rediger ingrediens',
    'recipe.ingredientName': 'Navn',
    'recipe.ingredientNamePlaceholder': 'f.eks. Kjøttdeig',
    'recipe.quantity': 'Mengde',
    'recipe.multiplier': 'Multipliserer',
    'recipe.multiplierPlaceholder': 'f.eks. 0,5',
    'recipe.unit': 'Enhet',
    'recipe.unitPlaceholder': 'f.eks. g',
    'recipe.add': 'Legg til',
    'recipe.missingWarningTitle': 'Manglende ingredienser',
    'recipe.missingWarningBody': 'Noen ingredienser mangler eller er utilstrekkelige. Du kan fortsatt lage mat med det du har.',
    'recipe.missingWarningCheckbox': 'Jeg lager mat med ingrediensene jeg har på lager',
    'recipe.subRecipeLabel': 'x',
    'recipe.editMultiplierTitle': 'Rediger multiplikator',

    // Share/import recipes
    'recipes.shareTitle': 'Del oppskrifter',
    'recipes.importTitle': 'Importer oppskrifter',
    'recipes.shareBtn': 'Del',
    'recipes.importBtn': 'Importer',
    'recipes.importPlaceholder': 'Lim inn JSON her…',
    'recipes.importConfirm': 'Importer',
    'recipes.selectAll': 'Velg alle',
    'recipes.deselectAll': 'Fjern alle valg',
    'recipes.importSuccess': 'Importerte {n} oppskrift(er)',
    'recipes.importError': 'Ugyldig oppskriftsdata',
    'recipes.copiedToClipboard': 'Kopiert til utklippstavle',
    'recipes.noneSelected': 'Velg minst én oppskrift',

    // Shuffle
    'shuffle.title': 'Middagsforslag',
    'shuffle.filterAny': 'Hvilken som helst',
    'shuffle.filterReady': 'Bare oppskrifter jeg kan lage nå',
    'shuffle.again': 'Bland igjen',
    'shuffle.open': 'Åpne oppskrift',
    'shuffle.none': 'Ingen oppskrifter matcher dette filteret.',

    // Shopping list
    'shopping.title': 'Handleliste',
    'shopping.add': '+ Legg til',
    'shopping.empty': 'Listen er tom. Legg til varer eller bruk "Legg til handleliste" fra en oppskrift.',
    'shopping.addItem': 'Legg til vare',
    'shopping.name': 'Navn',
    'shopping.namePlaceholder': 'f.eks. Toalettpapir',
    'shopping.quantityOptional': 'Mengde (valgfritt)',
    'shopping.unitOptional': 'Enhet (valgfritt)',
    'shopping.unitPlaceholder': 'f.eks. stk',
    'shopping.cancel': 'Avbryt',
    'shopping.addBtn': 'Legg til',
    'shopping.buySelected': '✓ Kjøp valgte ({n})',
    'shopping.removeSelected': '✗ Fjern valgte ({n})',
    'shopping.shareTitle': 'Del handleliste',
    'shopping.importTitle': 'Importer handleliste',
    'shopping.importPlaceholder': 'Lim inn JSON her…',
    'shopping.importConfirm': 'Importer',
    'shopping.importSuccess': 'Importerte {n} vare(r)',
    'shopping.importError': 'Ugyldig handleliste',
    'shopping.copiedToClipboard': 'Kopiert til utklippstavle',
    'shopping.share': 'Del',
    'shopping.import': 'Importer',

    // Settings
    'settings.title': 'Innstillinger',
    'settings.language': 'Språk',
    'settings.english': 'English',
    'settings.norwegian': 'Norsk',
  },
} as const

type TranslationKey = keyof typeof translations.en

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang)

  function setLang(newLang: Lang) {
    saveLang(newLang)
    setLangState(newLang)
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str: string = translations[lang][key] ?? translations.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useTranslation() {
  return useContext(LangContext)
}
```

**Step 3: Wrap App in LangProvider**

In `src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './i18n'
import BottomNav from './components/BottomNav'
import InventoryPage from './pages/InventoryPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingListPage from './pages/ShoppingListPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <LangProvider>
      <div className="app">
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </LangProvider>
  )
}
```

**Step 4: Build to verify no type errors**

```bash
npx tsc --noEmit
```
Expected: No errors (SettingsPage doesn't exist yet — create a stub first if needed)

Stub for `src/pages/SettingsPage.tsx` to unblock TypeScript:
```typescript
export default function SettingsPage() { return <div /> }
```

**Step 5: Commit**

```bash
git add src/i18n.tsx src/store.ts src/App.tsx src/pages/SettingsPage.tsx
git commit -m "feat: add i18n infrastructure with EN/NO translations"
```

---

## Task 4: Settings Page + Bottom Nav

**Files:**
- Modify: `src/pages/SettingsPage.tsx` (replace stub)
- Modify: `src/components/BottomNav.tsx`

**Step 1: Implement SettingsPage**

Replace `src/pages/SettingsPage.tsx`:

```typescript
import { useTranslation } from '../i18n'

export default function SettingsPage() {
  const { lang, setLang, t } = useTranslation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {t('settings.language')}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setLang('en')}
            >
              {t('settings.english')}
            </button>
            <button
              className={`btn ${lang === 'no' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setLang('no')}
            >
              {t('settings.norwegian')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Update BottomNav**

Replace `src/components/BottomNav.tsx`:

```typescript
import { NavLink } from 'react-router-dom'
import { useTranslation } from '../i18n'

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="bottom-nav">
      <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🥫</span>
        <span className="nav-label">{t('nav.inventory')}</span>
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">📖</span>
        <span className="nav-label">{t('nav.recipes')}</span>
      </NavLink>
      <NavLink to="/shopping" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🛒</span>
        <span className="nav-label">{t('nav.shopping')}</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">{t('nav.settings')}</span>
      </NavLink>
    </nav>
  )
}
```

**Step 3: Build to verify**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 4: Commit**

```bash
git add src/pages/SettingsPage.tsx src/components/BottomNav.tsx
git commit -m "feat: add Settings page with language toggle and Settings tab in nav"
```

---

## Task 5: Inventory "Remove" Label

**Files:**
- Modify: `src/pages/InventoryPage.tsx:74`

**Step 1: Change "Delete" to t('inventory.remove')**

In `InventoryPage.tsx`, add the hook and change the button text.

At top of component, add:
```typescript
const { t } = useTranslation()
```

Add import at top of file:
```typescript
import { useTranslation } from '../i18n'
```

Change the button at line ~74:
```typescript
// Before:
Delete
// After:
{t('inventory.remove')}
```

Also update other strings in the file while you're here (see Task 12 for full translation pass — for now at minimum update the Delete button).

**Step 2: Build to verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/pages/InventoryPage.tsx
git commit -m "feat: rename Delete to Remove in inventory"
```

---

## Task 6: Edit Ingredient in Recipe

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

**Step 1: Add editing state**

In RecipesPage, add state for editing an ingredient:

```typescript
const [editingIng, setEditingIng] = useState<RecipeIngredient | null>(null)
```

**Step 2: Add handleEditIngredient function**

```typescript
function handleEditIngredient() {
  if (!selected || !editingIng) return
  const qty = parseFloat(ingForm.quantity)
  if (!ingForm.name.trim() || isNaN(qty) || qty <= 0) return
  const updatedIng: RecipeIngredient = { name: ingForm.name.trim(), quantity: qty, unit: ingForm.unit.trim() }
  const updated = recipes.map(r =>
    r.id === selected.id
      ? { ...r, ingredients: r.ingredients.map(i => i.name === editingIng.name ? updatedIng : i) }
      : r
  )
  persistRecipes(updated)
  setSelected(updated.find(r => r.id === selected.id) ?? null)
  setIngForm(emptyIng)
  setEditingIng(null)
  setShowIngForm(false)
}
```

**Step 3: Add openEditIngredient function**

```typescript
function openEditIngredient(ing: RecipeIngredient) {
  setEditingIng(ing)
  setIngForm({ name: ing.name, quantity: String(ing.quantity), unit: ing.unit })
  setShowIngForm(true)
}
```

**Step 4: Make ingredient rows tappable for edit**

In the ingredient list render, change the `<div key={ing.name} className="list-item">` to be clickable:

```typescript
<div key={ing.name} className="list-item" onClick={() => openEditIngredient(ing)} style={{ cursor: 'pointer' }}>
```

**Step 5: Update the Add Ingredient modal to handle edit mode**

In `showIngForm` modal, conditionally show title and save handler:

```typescript
{showIngForm && (
  <div className="modal-overlay" onClick={() => { setShowIngForm(false); setEditingIng(null) }}>
    <div className="modal-sheet" onClick={e => e.stopPropagation()}>
      <h2>{editingIng ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
      {/* ... form fields unchanged ... */}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={() => { setShowIngForm(false); setEditingIng(null) }}>Cancel</button>
        <button className="btn btn-primary" onClick={editingIng ? handleEditIngredient : handleAddIngredient}>
          {editingIng ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  </div>
)}
```

Also reset `editingIng` when closing the form normally:
- Update the `setShowIngForm(false)` call in "Add ingredient" button to also reset: `setEditingIng(null)`

**Step 6: Build to verify**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: tap to edit ingredient in recipe"
```

---

## Task 7: Recipe List — Search, Sort, Missing Count

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

**Step 1: Add imports and state**

Add to imports at top of RecipesPage:
```typescript
import { countMissing } from '../logic'
```

Add state in the component:
```typescript
const [search, setSearch] = useState('')
```

**Step 2: Compute sorted + filtered recipe list**

Add this derived value (after `const inventory = loadInventory()`):

```typescript
const allRecipes = recipes  // alias for clarity below

const sortedFilteredRecipes = recipes
  .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  .map(r => ({ recipe: r, missing: countMissing(r, inventory, allRecipes) }))
  .sort((a, b) => a.missing - b.missing)
```

**Step 3: Update the recipe list header to include search input**

In the list view (not detail view), below `<div className="page-header">`, add:

```typescript
<div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
  <input
    value={search}
    onChange={e => setSearch(e.target.value)}
    placeholder="Search recipes…"
    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, boxSizing: 'border-box' }}
  />
</div>
```

**Step 4: Render from sortedFilteredRecipes**

Replace the recipes.map() in the list view:

```typescript
{sortedFilteredRecipes.map(({ recipe, missing }) => (
  <div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
    <span className="list-item-name">{recipe.name}</span>
    <span className="list-item-meta">
      {recipe.ingredients.length + (recipe.subRecipes?.length ?? 0)} ingredients
      {missing === 0
        ? <span style={{ color: '#4caf50', marginLeft: 6 }}>✓</span>
        : <span style={{ color: '#ef5350', marginLeft: 6 }}>{missing} missing</span>
      }
      {' →'}
    </span>
  </div>
))}
```

**Step 5: Build to verify**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: recipe search, sort by missing count, show missing count on list"
```

---

## Task 8: Sub-Recipe Flow

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

**Step 1: Add sub-recipe state and helpers**

Add imports:
```typescript
import { expandIngredients, hasCircularRef } from '../logic'
import type { SubRecipeRef } from '../types'
```

Add state:
```typescript
const [isSubRecipeMode, setIsSubRecipeMode] = useState(false)
const [editingSubRef, setEditingSubRef] = useState<SubRecipeRef | null>(null)
```

**Step 2: Update ingredient name suggestions**

Extend suggestions to include other recipe names. Add this derived value:

```typescript
const otherRecipeNames = recipes
  .filter(r => r.id !== selected?.id)
  .map(r => r.name)

const allSuggestions = [...new Set([...allNames, ...otherRecipeNames])].sort()
```

Pass `allSuggestions` to `AutocompleteInput` instead of `allNames`.

**Step 3: Detect sub-recipe mode on name change**

When the ingredient name changes in the form, check if it matches a recipe:

```typescript
function handleIngNameChange(name: string) {
  setIngForm(f => ({ ...f, name }))
  const matchedRecipe = recipes.find(
    r => r.id !== selected?.id && r.name.toLowerCase() === name.toLowerCase()
  )
  setIsSubRecipeMode(!!matchedRecipe)
}
```

Wire this to the `AutocompleteInput onChange`:
```typescript
onChange={handleIngNameChange}
```

**Step 4: Conditionally render multiplier vs quantity/unit**

In the Add Ingredient modal form fields section, replace the quantity/unit row:

```typescript
{isSubRecipeMode ? (
  <div className="form-field">
    <label>Multiplier</label>
    <input
      type="number"
      step="0.1"
      min="0.01"
      value={ingForm.quantity}
      onChange={e => setIngForm(f => ({ ...f, quantity: e.target.value }))}
      placeholder="e.g. 0.5"
    />
  </div>
) : (
  <div className="form-row">
    <div className="form-field">
      <label>Quantity</label>
      <input
        type="number"
        value={ingForm.quantity}
        onChange={e => setIngForm(f => ({ ...f, quantity: e.target.value }))}
      />
    </div>
    <div className="form-field">
      <label>Unit</label>
      <input
        value={ingForm.unit}
        onChange={e => setIngForm(f => ({ ...f, unit: e.target.value }))}
        placeholder="e.g. g"
      />
    </div>
  </div>
)}
```

**Step 5: Add handleAddIngredient logic for sub-recipe mode**

Update `handleAddIngredient` to branch on `isSubRecipeMode`:

```typescript
function handleAddIngredient() {
  if (!selected) return

  if (isSubRecipeMode) {
    const subRecipe = recipes.find(
      r => r.id !== selected.id && r.name.toLowerCase() === ingForm.name.toLowerCase()
    )
    if (!subRecipe) return
    const multiplier = parseFloat(ingForm.quantity)
    if (isNaN(multiplier) || multiplier <= 0) return
    if (hasCircularRef(selected.id, subRecipe.id, recipes)) {
      showToast('Cannot add: would create a circular reference')
      return
    }
    const newSubRef: SubRecipeRef = { recipeId: subRecipe.id, multiplier }
    const updated = recipes.map(r =>
      r.id === selected.id
        ? { ...r, subRecipes: [...(r.subRecipes ?? []), newSubRef] }
        : r
    )
    persistRecipes(updated)
    setSelected(updated.find(r => r.id === selected.id) ?? null)
    setIngForm(emptyIng)
    setIsSubRecipeMode(false)
    setShowIngForm(false)
    return
  }

  // Regular ingredient (existing logic unchanged)
  const qty = parseFloat(ingForm.quantity)
  if (!ingForm.name.trim() || isNaN(qty) || qty <= 0) return
  const newIng: RecipeIngredient = { name: ingForm.name.trim(), quantity: qty, unit: ingForm.unit.trim() }
  const updated = recipes.map(r =>
    r.id === selected.id ? { ...r, ingredients: [...r.ingredients, newIng] } : r
  )
  persistRecipes(updated)
  setSelected(updated.find(r => r.id === selected.id) ?? null)
  setIngForm(emptyIng)
  setShowIngForm(false)
}
```

**Step 6: Display sub-recipes in recipe detail**

After the regular ingredients list (inside `selected.ingredients.map(...)`), add sub-recipe rows:

```typescript
{(selected.subRecipes ?? []).map(sub => {
  const subRecipe = recipes.find(r => r.id === sub.recipeId)
  if (!subRecipe) return null
  const subMissing = countMissing(subRecipe, inventory, recipes)
  return (
    <div key={sub.recipeId} className="list-item" style={{ cursor: 'pointer' }}
      onClick={() => {
        setEditingSubRef(sub)
        setIngForm({ name: subRecipe.name, quantity: String(sub.multiplier), unit: '' })
        setIsSubRecipeMode(true)
        setShowIngForm(true)
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
      <span className="list-item-name" style={{ fontStyle: 'italic' }}>
        {sub.multiplier}× {subRecipe.name}
      </span>
      <span className="list-item-meta">
        {subMissing === 0
          ? <span style={{ color: '#4caf50' }}>✓</span>
          : <span style={{ color: '#ef5350' }}>{subMissing} missing</span>
        }
      </span>
      <button
        className="btn btn-danger"
        style={{ padding: '6px 10px', fontSize: 12 }}
        onClick={e => {
          e.stopPropagation()
          const updated = recipes.map(r =>
            r.id === selected.id
              ? { ...r, subRecipes: (r.subRecipes ?? []).filter(s => s.recipeId !== sub.recipeId) }
              : r
          )
          persistRecipes(updated)
          setSelected(updated.find(r => r.id === selected.id) ?? null)
        }}
      >
        Remove
      </button>
    </div>
  )
})}
```

**Step 7: Handle editing sub-recipe multiplier**

In `handleEditIngredient` (or create `handleEditSubRef`), when `editingSubRef` is set:

```typescript
function handleSaveIngForm() {
  if (editingSubRef) {
    // Editing a sub-recipe multiplier
    const multiplier = parseFloat(ingForm.quantity)
    if (isNaN(multiplier) || multiplier <= 0) return
    const updated = recipes.map(r =>
      r.id === selected!.id
        ? { ...r, subRecipes: (r.subRecipes ?? []).map(s =>
            s.recipeId === editingSubRef.recipeId ? { ...s, multiplier } : s
          )}
        : r
    )
    persistRecipes(updated)
    setSelected(updated.find(r => r.id === selected!.id) ?? null)
    setEditingSubRef(null)
    setIsSubRecipeMode(false)
    setIngForm(emptyIng)
    setShowIngForm(false)
    return
  }
  if (editingIng) {
    handleEditIngredient()
    return
  }
  handleAddIngredient()
}
```

Replace all `onClick={editingIng ? handleEditIngredient : handleAddIngredient}` in the modal with `onClick={handleSaveIngForm}`.

Also update `isRecipeReady` calls in RecipesPage to pass `recipes` as third argument:
```typescript
isRecipeReady(selected, inventory, recipes)
```

And update `subtractFromInventory` in `cookRecipe` to use expanded ingredients:
```typescript
function cookRecipe(recipe: Recipe) {
  const inventory = loadInventory()
  const expanded = expandIngredients(recipe, recipes)
  saveInventory(subtractFromInventory(inventory, expanded))
  showToast(`Cooked "${recipe.name}" — inventory updated`)
  setShowCookWarning(false)
}
```

And update `handleAddToList` to use expanded ingredients:
```typescript
function handleAddToList(recipe: Recipe) {
  const list = loadShoppingList()
  const expanded = expandIngredients(recipe, recipes)
  if (selectedIngredients.size > 0) {
    const toAdd = expanded.filter(ing => selectedIngredients.has(ing.name))
    saveShoppingList(addRecipeToShoppingList(list, toAdd))
    const count = selectedIngredients.size
    showToast(`Added ${count} ingredient${count > 1 ? 's' : ''} to shopping list`)
    setSelectedIngredients(new Set())
    return
  }
  if (isRecipeReady(recipe, inventory, recipes)) {
    showToast('All ingredients already in inventory')
    return
  }
  saveShoppingList(addMissingToShoppingList(list, expanded, inventory))
  showToast(`"${recipe.name}" added to shopping list`)
}
```

**Step 8: Build to verify**

```bash
npx tsc --noEmit
```

**Step 9: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: sub-recipe support with live references and multiplier"
```

---

## Task 9: Shuffle / Meal Suggestion

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

**Step 1: Add shuffle state**

```typescript
const [showShuffle, setShowShuffle] = useState(false)
const [shuffleReadyOnly, setShuffleReadyOnly] = useState(false)
const [shufflePick, setShufflePick] = useState<Recipe | null>(null)
```

**Step 2: Add shuffle logic function**

```typescript
function pickRandom() {
  const pool = shuffleReadyOnly
    ? recipes.filter(r => isRecipeReady(r, inventory, recipes))
    : recipes
  if (pool.length === 0) {
    setShufflePick(null)
    return
  }
  const pick = pool[Math.floor(Math.random() * pool.length)]
  setShufflePick(pick)
}

function openShuffle() {
  setShowShuffle(true)
  pickRandom()
}
```

**Step 3: Add shuffle button to recipe list header**

In the list view `page-header`, add a shuffle button next to the Add button:

```typescript
<div className="page-header">
  <h1>Recipes</h1>
  <div style={{ display: 'flex', gap: 8 }}>
    <button className="btn btn-ghost" onClick={openShuffle}>🎲</button>
    <button className="btn btn-primary" onClick={openAddRecipe}>+ Add</button>
  </div>
</div>
```

**Step 4: Add shuffle modal**

Below the recipe form modal (still in the list view return):

```typescript
{showShuffle && (
  <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
    onClick={() => setShowShuffle(false)}>
    <div className="modal-sheet" style={{ borderRadius: 16, width: '100%', margin: 0 }}
      onClick={e => e.stopPropagation()}>
      <h2>Meal Suggestion</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${!shuffleReadyOnly ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, fontSize: 13 }}
          onClick={() => { setShuffleReadyOnly(false); pickRandom() }}
        >
          Any recipe
        </button>
        <button
          className={`btn ${shuffleReadyOnly ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, fontSize: 13 }}
          onClick={() => { setShuffleReadyOnly(true); pickRandom() }}
        >
          Only ready
        </button>
      </div>

      {shufflePick ? (
        <p style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '16px 0' }}>
          {shufflePick.name}
        </p>
      ) : (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0' }}>
          No recipes match this filter.
        </p>
      )}

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={pickRandom}>🎲 Shuffle again</button>
        {shufflePick && (
          <button className="btn btn-primary" onClick={() => {
            setShowShuffle(false)
            setSelected(shufflePick)
          }}>
            Open recipe
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

Note: `pickRandom` uses `shuffleReadyOnly` from state, so when the toggle buttons call `setShuffleReadyOnly` + `pickRandom()` in sequence, they may not see the updated value. Fix by passing the new value directly:

```typescript
function pickRandom(readyOnly = shuffleReadyOnly) {
  const pool = readyOnly
    ? recipes.filter(r => isRecipeReady(r, inventory, recipes))
    : recipes
  if (pool.length === 0) { setShufflePick(null); return }
  setShufflePick(pool[Math.floor(Math.random() * pool.length)])
}

function openShuffle() {
  setShowShuffle(true)
  pickRandom(shuffleReadyOnly)
}
```

And update toggle buttons:
```typescript
onClick={() => { setShuffleReadyOnly(false); pickRandom(false) }}
onClick={() => { setShuffleReadyOnly(true); pickRandom(true) }}
```

**Step 5: Build to verify**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: shuffle meal suggestion modal with ready-only filter"
```

---

## Task 10: Share & Import Recipes

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

**Step 1: Add share/import state**

```typescript
const [showShare, setShowShare] = useState(false)
const [shareSelected, setShareSelected] = useState<Set<string>>(new Set())
const [showImport, setShowImport] = useState(false)
const [importText, setImportText] = useState('')
```

**Step 2: Add share helper function**

```typescript
async function handleShare() {
  const toExport = recipes.filter(r => shareSelected.has(r.id))
  if (toExport.length === 0) {
    showToast('Select at least one recipe')
    return
  }
  const json = JSON.stringify({ type: 'grocery-recipes', version: 1, recipes: toExport }, null, 2)
  if (navigator.share) {
    await navigator.share({ title: 'Recipes', text: json })
  } else {
    await navigator.clipboard.writeText(json)
    showToast('Copied to clipboard')
  }
  setShowShare(false)
}
```

**Step 3: Add import helper function**

```typescript
function handleImport() {
  try {
    const data = JSON.parse(importText)
    if (data.type !== 'grocery-recipes' || !Array.isArray(data.recipes)) {
      showToast('Invalid recipe data')
      return
    }
    const importedRecipes: Recipe[] = data.recipes
    const existingNames = new Set(recipes.map(r => r.name.toLowerCase()))

    // Build ID remap: old ID -> new ID (for recipes in the import set)
    const idMap: Record<string, string> = {}
    for (const r of importedRecipes) {
      idMap[r.id] = uuid()
    }

    const toAdd: Recipe[] = importedRecipes
      .filter(r => !existingNames.has(r.name.toLowerCase()))
      .map(r => ({
        ...r,
        id: idMap[r.id],
        subRecipes: (r.subRecipes ?? [])
          .filter(s => idMap[s.recipeId]) // only include sub-refs within the import set
          .map(s => ({ ...s, recipeId: idMap[s.recipeId] })),
      }))

    if (toAdd.length === 0) {
      showToast('All recipes already exist')
      return
    }
    persistRecipes([...recipes, ...toAdd])
    showToast(`Imported ${toAdd.length} recipe(s)`)
    setShowImport(false)
    setImportText('')
  } catch {
    showToast('Invalid recipe data')
  }
}
```

**Step 4: Add share/import buttons to recipe list header**

```typescript
<div className="page-header">
  <h1>Recipes</h1>
  <div style={{ display: 'flex', gap: 8 }}>
    <button className="btn btn-ghost" onClick={() => { setShowImport(true); setImportText('') }}>Import</button>
    <button className="btn btn-ghost" onClick={() => { setShowShare(true); setShareSelected(new Set()) }}>Share</button>
    <button className="btn btn-ghost" onClick={openShuffle}>🎲</button>
    <button className="btn btn-primary" onClick={openAddRecipe}>+ Add</button>
  </div>
</div>
```

**Step 5: Add share modal**

```typescript
{showShare && (
  <div className="modal-overlay" onClick={() => setShowShare(false)}>
    <div className="modal-sheet" onClick={e => e.stopPropagation()}>
      <h2>Share Recipes</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={shareSelected.size === recipes.length && recipes.length > 0}
          ref={el => {
            if (el) el.indeterminate = shareSelected.size > 0 && shareSelected.size < recipes.length
          }}
          onChange={() => {
            if (shareSelected.size === recipes.length) setShareSelected(new Set())
            else setShareSelected(new Set(recipes.map(r => r.id)))
          }}
          style={{ width: 20, height: 20, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 14 }}>Select all</span>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {recipes.map(r => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareSelected.has(r.id)}
              onChange={() => {
                setShareSelected(prev => {
                  const next = new Set(prev)
                  if (next.has(r.id)) next.delete(r.id)
                  else next.add(r.id)
                  return next
                })
              }}
              style={{ width: 20, height: 20, flexShrink: 0 }}
            />
            <span style={{ fontSize: 15 }}>{r.name}</span>
          </label>
        ))}
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={() => setShowShare(false)}>Cancel</button>
        <button
          className="btn btn-primary"
          style={{ opacity: shareSelected.size === 0 ? 0.4 : 1 }}
          disabled={shareSelected.size === 0}
          onClick={handleShare}
        >
          Share ({shareSelected.size})
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 6: Add import modal**

```typescript
{showImport && (
  <div className="modal-overlay" onClick={() => setShowImport(false)}>
    <div className="modal-sheet" onClick={e => e.stopPropagation()}>
      <h2>Import Recipes</h2>
      <div className="form-field">
        <label>Paste JSON</label>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          rows={8}
          placeholder="Paste JSON here…"
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
          autoFocus
        />
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={() => setShowImport(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleImport}>Import</button>
      </div>
    </div>
  </div>
)}
```

**Step 7: Build to verify**

```bash
npx tsc --noEmit
```

**Step 8: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: share and import recipes as JSON"
```

---

## Task 11: Share & Import Shopping List

**Files:**
- Modify: `src/pages/ShoppingListPage.tsx`

**Step 1: Add share/import state**

```typescript
const [showShare, setShowShare] = useState(false)
const [showImport, setShowImport] = useState(false)
const [importText, setImportText] = useState('')
```

**Step 2: Add helper functions**

```typescript
function showToast(msg: string) {
  // Reuse existing toast pattern — add toast state:
  // const [toast, setToast] = useState('')
  // function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2000) }
}

async function handleShare() {
  const json = JSON.stringify({ type: 'grocery-shopping-list', version: 1, items }, null, 2)
  if (navigator.share) {
    await navigator.share({ title: 'Shopping List', text: json })
  } else {
    await navigator.clipboard.writeText(json)
    showToast('Copied to clipboard')
  }
  setShowShare(false)
}

function handleImport() {
  try {
    const data = JSON.parse(importText)
    if (data.type !== 'grocery-shopping-list' || !Array.isArray(data.items)) {
      showToast('Invalid shopping list data')
      return
    }
    const importedItems: ShoppingListItem[] = data.items
    const existingNames = new Set(items.map(i => i.name.toLowerCase()))
    const toAdd = importedItems
      .filter(i => !existingNames.has(i.name.toLowerCase()))
      .map(i => ({ ...i, id: uuid(), checked: false }))
    if (toAdd.length === 0) {
      showToast('All items already in list')
      return
    }
    persist([...items, ...toAdd])
    showToast(`Imported ${toAdd.length} item(s)`)
    setShowImport(false)
    setImportText('')
  } catch {
    showToast('Invalid shopping list data')
  }
}
```

Note: Add `toast` state and `showToast` function (same pattern as RecipesPage), and render the toast div at the bottom.

**Step 3: Add Share/Import buttons to page header**

```typescript
<div className="page-header">
  {/* existing checkbox */}
  <h1>Shopping List</h1>
  <div style={{ display: 'flex', gap: 8 }}>
    <button className="btn btn-ghost" onClick={() => { setShowImport(true); setImportText('') }}>Import</button>
    <button className="btn btn-ghost" onClick={() => setShowShare(true)}>Share</button>
    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add</button>
  </div>
</div>
```

**Step 4: Add share and import modals** (same pattern as Task 10 but simplified — no recipe selection, exports all items)

Share modal:
```typescript
{showShare && (
  <div className="modal-overlay" onClick={() => setShowShare(false)}>
    <div className="modal-sheet" onClick={e => e.stopPropagation()}>
      <h2>Share Shopping List</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Exports all {items.length} items as JSON.
      </p>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={() => setShowShare(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleShare}>Share</button>
      </div>
    </div>
  </div>
)}
```

Import modal: same structure as recipe import modal.

**Step 5: Add toast render**

```typescript
{toast && (
  <div style={{
    position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    background: '#323232', color: 'white', padding: '10px 20px',
    borderRadius: 8, fontSize: 14, zIndex: 200, whiteSpace: 'nowrap',
  }}>
    {toast}
  </div>
)}
```

**Step 6: Build to verify**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/pages/ShoppingListPage.tsx
git commit -m "feat: share and import shopping list as JSON"
```

---

## Task 12: Apply Translations to All Pages

**Files:**
- Modify: `src/pages/InventoryPage.tsx`
- Modify: `src/pages/RecipesPage.tsx`
- Modify: `src/pages/ShoppingListPage.tsx`

**Step 1: InventoryPage — wrap all UI strings in t()**

Add `const { t } = useTranslation()` at component top. Replace every hardcoded string:

| Old | New |
|-----|-----|
| `'Inventory'` (h1) | `t('inventory.title')` |
| `'+ Add'` | `t('inventory.add')` |
| `'No items yet...'` | `t('inventory.empty')` |
| `'Delete'` | `t('inventory.remove')` |
| `'Edit Item'` / `'Add Item'` (modal h2) | `t(editing ? 'inventory.editItem' : 'inventory.addItem')` |
| `'Name'` (label) | `t('inventory.name')` |
| `'Quantity'` | `t('inventory.quantity')` |
| `'Unit'` | `t('inventory.unit')` |
| `'Cancel'` | `t('inventory.cancel')` |
| `'Save'` | `t('inventory.save')` |
| `'e.g. Pasta'` | `t('inventory.namePlaceholder')` |
| `'e.g. 500'` | `t('inventory.quantityPlaceholder')` |
| `'e.g. g'` | `t('inventory.unitPlaceholder')` |

**Step 2: RecipesPage — wrap all UI strings in t()**

Add `const { t } = useTranslation()` at component top.

Key replacements (representative — do ALL strings):

| Old | New |
|-----|-----|
| `'Recipes'` (h1) | `t('recipes.title')` |
| `'+ Add'` | `t('recipes.add')` |
| `'No recipes yet...'` | `t('recipes.empty')` |
| `'Search recipes…'` | `t('recipes.search')` |
| `'ingredients'` | `t('recipes.ingredients')` |
| `'missing'` | `t('recipes.missing')` |
| `'← Back'` | `t('recipe.back')` |
| `'Edit'` | `t('recipe.edit')` |
| `'Select all'` | `t('recipe.selectAll')` |
| `'in inventory'` | `t('recipe.inInventory')` |
| `'Remove'` (ing) | `t('recipe.remove')` |
| `'🛒 Add to shopping list'` | `t('recipe.addToList')` |
| `'🍳 Cook it'` | `t('recipe.cookIt')` |
| `'Delete recipe'` | `t('recipe.deleteRecipe')` |
| `'+ Add ingredient'` | `t('recipe.addIngredient')` |
| `'No ingredients yet.'` | `t('recipe.noIngredients')` |
| `'Add Ingredient'` / `'Edit Ingredient'` (modal h2) | `t(editingIng ? 'recipe.editIngredientTitle' : 'recipe.addIngredientTitle')` |
| `'Multiplier'` / `'Quantity'` | `t(isSubRecipeMode ? 'recipe.multiplier' : 'recipe.quantity')` |
| `'Unit'` | `t('recipe.unit')` |
| `'Add'` / `'Save'` (modal btn) | conditional |
| `'Cancel'` | `t('recipe.cancel')` |
| toast strings with recipe name (keep interpolation, translate template) | use `t()` with vars |
| `'New Recipe'` | `t('recipes.newRecipe')` |
| `'Recipe name'` | `t('recipes.recipeName')` |
| `'Create'` | `t('recipes.create')` |
| `'Edit Recipe Name'` | `t('recipe.editRecipeName')` |
| `'Meal Suggestion'` | `t('shuffle.title')` |
| `'Any recipe'` | `t('shuffle.filterAny')` |
| `'Only ready'` | `t('shuffle.filterReady')` |
| `'🎲 Shuffle again'` | `t('shuffle.again')` |
| `'Open recipe'` | `t('shuffle.open')` |
| `'No recipes match...'` | `t('shuffle.none')` |
| `'Share Recipes'` | `t('recipes.shareTitle')` |
| `'Select all'` (share) | `t('recipes.selectAll')` |
| `'Import Recipes'` | `t('recipes.importTitle')` |
| `'Paste JSON here…'` | `t('recipes.importPlaceholder')` |
| `'Import'` (confirm btn) | `t('recipes.importConfirm')` |
| `'Missing ingredients'` (warning title) | `t('recipe.missingWarningTitle')` |
| `'Some ingredients are...'` | `t('recipe.missingWarningBody')` |
| `"I'll cook with..."` | `t('recipe.missingWarningCheckbox')` |

**Step 3: ShoppingListPage — wrap all UI strings in t()**

Similar pass — add `const { t } = useTranslation()`, replace all hardcoded strings using `shopping.*` and `settings.*` keys.

For strings with counts like `Buy selected (${checkedCount})`, use:
```typescript
t('shopping.buySelected', { n: checkedCount })
```

**Step 4: Build to verify**

```bash
npx tsc --noEmit
```
Expected: No type errors. All translation keys are typed via `TranslationKey`.

**Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all PASS (logic tests unaffected by UI changes)

**Step 6: Commit**

```bash
git add src/pages/InventoryPage.tsx src/pages/RecipesPage.tsx src/pages/ShoppingListPage.tsx
git commit -m "feat: apply EN/NO translations to all pages"
```

---

## Final Verification

```bash
npx vitest run && npx tsc --noEmit && npm run build
```
Expected: Tests pass, no type errors, build succeeds.

```bash
git log --oneline -12
```
Should show ~12 commits from this feature batch.
