# Grocery App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React PWA for managing home grocery inventory, saving recipes, and generating shopping lists — installable on iPhone, works offline, all data stored in localStorage.

**Architecture:** Three screens (Inventory, Recipes, Shopping List) connected by a bottom tab navigation bar. Business logic lives in pure utility functions (easy to test). React components consume a set of custom hooks that read/write to localStorage.

**Tech Stack:** React 18, TypeScript, Vite, vite-plugin-pwa, React Router v6, Vitest + React Testing Library

---

## Task 1: Scaffold the Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Create the Vite React TypeScript project**

Run from `/Users/fredrikalmas/Fredrik/grocery_app`:
```bash
npm create vite@latest . -- --template react-ts
```
Answer "y" if asked to confirm writing to the directory.

**Step 2: Install dependencies**

```bash
npm install react-router-dom
npm install -D vite-plugin-pwa vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

**Step 3: Configure vite.config.ts**

Replace the contents of `vite.config.ts` with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Grocery App',
        short_name: 'Grocery',
        description: 'Manage your grocery inventory and recipes',
        theme_color: '#4caf50',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

**Step 4: Create test setup file**

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

**Step 5: Add placeholder icons**

PWA requires icon files. Create two placeholder PNG files (can be replaced with real icons later):
```bash
mkdir -p public
# Create a simple green square as placeholder icon
node -e "
const { createCanvas } = require('canvas');
" 2>/dev/null || true
```

Instead, just create empty placeholder files for now — the app will work without real icons in development:
```bash
touch public/icon-192.png public/icon-512.png
```

**Step 6: Verify the dev server starts**

```bash
npm run dev
```
Expected: Vite starts on `http://localhost:5173` with no errors.

**Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold React + Vite PWA project"
```

---

## Task 2: Data Types and localStorage Utilities

**Files:**
- Create: `src/types.ts`
- Create: `src/store.ts`
- Create: `src/store.test.ts`

**Step 1: Write the types**

Create `src/types.ts`:
```ts
export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
}

export interface ShoppingListItem {
  id: string
  name: string
  quantity: number | null  // null for freeform items like "Toilet paper"
  unit: string | null
  checked: boolean
}
```

**Step 2: Write failing tests for store utilities**

Create `src/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadInventory, saveInventory,
  loadRecipes, saveRecipes,
  loadShoppingList, saveShoppingList,
} from './store'

beforeEach(() => {
  localStorage.clear()
})

describe('inventory storage', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadInventory()).toEqual([])
  })

  it('saves and loads inventory', () => {
    const items = [{ id: '1', name: 'Pasta', quantity: 500, unit: 'g' }]
    saveInventory(items)
    expect(loadInventory()).toEqual(items)
  })
})

describe('recipes storage', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadRecipes()).toEqual([])
  })

  it('saves and loads recipes', () => {
    const recipes = [{ id: '1', name: 'Bolognese', ingredients: [] }]
    saveRecipes(recipes)
    expect(loadRecipes()).toEqual(recipes)
  })
})

describe('shopping list storage', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadShoppingList()).toEqual([])
  })

  it('saves and loads shopping list', () => {
    const items = [{ id: '1', name: 'Milk', quantity: 1, unit: 'L', checked: false }]
    saveShoppingList(items)
    expect(loadShoppingList()).toEqual(items)
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
npx vitest run src/store.test.ts
```
Expected: FAIL — `store` module not found.

**Step 4: Implement the store**

Create `src/store.ts`:
```ts
import type { InventoryItem, Recipe, ShoppingListItem } from './types'

const KEYS = {
  inventory: 'grocery_inventory',
  recipes: 'grocery_recipes',
  shoppingList: 'grocery_shopping_list',
}

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export const loadInventory = (): InventoryItem[] => load(KEYS.inventory)
export const saveInventory = (items: InventoryItem[]): void => save(KEYS.inventory, items)

export const loadRecipes = (): Recipe[] => load(KEYS.recipes)
export const saveRecipes = (recipes: Recipe[]): void => save(KEYS.recipes, recipes)

export const loadShoppingList = (): ShoppingListItem[] => load(KEYS.shoppingList)
export const saveShoppingList = (items: ShoppingListItem[]): void => save(KEYS.shoppingList, items)
```

**Step 5: Run tests to verify they pass**

```bash
npx vitest run src/store.test.ts
```
Expected: PASS — all 6 tests green.

**Step 6: Commit**

```bash
git add src/types.ts src/store.ts src/store.test.ts
git commit -m "feat: add data types and localStorage utilities"
```

---

## Task 3: Business Logic

**Files:**
- Create: `src/logic.ts`
- Create: `src/logic.test.ts`

**Step 1: Write failing tests**

Create `src/logic.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  addToInventory,
  subtractFromInventory,
  addRecipeToShoppingList,
} from './logic'
import type { InventoryItem, RecipeIngredient, ShoppingListItem } from './types'

describe('addToInventory', () => {
  it('adds a new item when name does not exist', () => {
    const inventory: InventoryItem[] = []
    const result = addToInventory(inventory, { name: 'Pasta', quantity: 500, unit: 'g' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pasta')
    expect(result[0].quantity).toBe(500)
  })

  it('increases quantity when item already exists (case-insensitive match)', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 200, unit: 'g' }
    ]
    const result = addToInventory(inventory, { name: 'pasta', quantity: 300, unit: 'g' })
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(500)
  })
})

describe('subtractFromInventory', () => {
  it('reduces quantity of matching items', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 500, unit: 'g' }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Pasta', quantity: 300, unit: 'g' }]
    const result = subtractFromInventory(inventory, ingredients)
    expect(result[0].quantity).toBe(200)
  })

  it('removes item when quantity reaches zero or below', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 300, unit: 'g' }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Pasta', quantity: 300, unit: 'g' }]
    const result = subtractFromInventory(inventory, ingredients)
    expect(result).toHaveLength(0)
  })

  it('ignores ingredients not in inventory', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 500, unit: 'g' }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Tomatoes', quantity: 2, unit: 'pcs' }]
    const result = subtractFromInventory(inventory, ingredients)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(500)
  })
})

describe('addRecipeToShoppingList', () => {
  it('adds recipe ingredients to an empty shopping list', () => {
    const list: ShoppingListItem[] = []
    const ingredients: RecipeIngredient[] = [
      { name: 'Pasta', quantity: 400, unit: 'g' }
    ]
    const result = addRecipeToShoppingList(list, ingredients)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pasta')
    expect(result[0].quantity).toBe(400)
    expect(result[0].checked).toBe(false)
  })

  it('merges quantities for duplicate ingredient names', () => {
    const list: ShoppingListItem[] = [
      { id: '1', name: 'Pasta', quantity: 200, unit: 'g', checked: false }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'pasta', quantity: 300, unit: 'g' }]
    const result = addRecipeToShoppingList(list, ingredients)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(500)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic.test.ts
```
Expected: FAIL — `logic` module not found.

**Step 3: Implement the logic**

Create `src/logic.ts`:
```ts
import { v4 as uuid } from 'uuid'
import type { InventoryItem, RecipeIngredient, ShoppingListItem } from './types'

// Install uuid first: npm install uuid && npm install -D @types/uuid

export function addToInventory(
  inventory: InventoryItem[],
  incoming: { name: string; quantity: number; unit: string }
): InventoryItem[] {
  const match = inventory.find(
    item => item.name.toLowerCase() === incoming.name.toLowerCase()
  )
  if (match) {
    return inventory.map(item =>
      item.id === match.id ? { ...item, quantity: item.quantity + incoming.quantity } : item
    )
  }
  return [...inventory, { id: uuid(), ...incoming }]
}

export function subtractFromInventory(
  inventory: InventoryItem[],
  ingredients: RecipeIngredient[]
): InventoryItem[] {
  const updated = inventory.map(item => {
    const ingredient = ingredients.find(
      ing => ing.name.toLowerCase() === item.name.toLowerCase()
    )
    if (!ingredient) return item
    return { ...item, quantity: item.quantity - ingredient.quantity }
  })
  return updated.filter(item => item.quantity > 0)
}

export function addRecipeToShoppingList(
  list: ShoppingListItem[],
  ingredients: RecipeIngredient[]
): ShoppingListItem[] {
  let result = [...list]
  for (const ing of ingredients) {
    const match = result.find(
      item => item.name.toLowerCase() === ing.name.toLowerCase()
    )
    if (match) {
      result = result.map(item =>
        item.id === match.id
          ? { ...item, quantity: (item.quantity ?? 0) + ing.quantity }
          : item
      )
    } else {
      result.push({ id: uuid(), name: ing.name, quantity: ing.quantity, unit: ing.unit, checked: false })
    }
  }
  return result
}
```

**Step 4: Install uuid**

```bash
npm install uuid
npm install -D @types/uuid
```

**Step 5: Run tests to verify they pass**

```bash
npx vitest run src/logic.test.ts
```
Expected: PASS — all 7 tests green.

**Step 6: Run all tests**

```bash
npx vitest run
```
Expected: PASS — all tests green.

**Step 7: Commit**

```bash
git add src/logic.ts src/logic.test.ts package.json package-lock.json
git commit -m "feat: add core business logic with tests"
```

---

## Task 4: App Shell and Navigation

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/pages/InventoryPage.tsx`
- Create: `src/pages/RecipesPage.tsx`
- Create: `src/pages/ShoppingListPage.tsx`
- Create: `src/components/BottomNav.tsx`
- Create: `src/index.css` (replace existing)

**Step 1: Set up routing in main.tsx**

Replace `src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**Step 2: Set up routes in App.tsx**

Replace `src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import InventoryPage from './pages/InventoryPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingListPage from './pages/ShoppingListPage'

export default function App() {
  return (
    <div className="app">
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
```

**Step 3: Create BottomNav component**

Create `src/components/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🥫</span>
        <span className="nav-label">Inventory</span>
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">📖</span>
        <span className="nav-label">Recipes</span>
      </NavLink>
      <NavLink to="/shopping" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🛒</span>
        <span className="nav-label">Shopping</span>
      </NavLink>
    </nav>
  )
}
```

**Step 4: Create placeholder pages**

Create `src/pages/InventoryPage.tsx`:
```tsx
export default function InventoryPage() {
  return <h1>Inventory</h1>
}
```

Create `src/pages/RecipesPage.tsx`:
```tsx
export default function RecipesPage() {
  return <h1>Recipes</h1>
}
```

Create `src/pages/ShoppingListPage.tsx`:
```tsx
export default function ShoppingListPage() {
  return <h1>Shopping List</h1>
}
```

**Step 5: Add base styles**

Replace `src/index.css`:
```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --green: #4caf50;
  --green-dark: #388e3c;
  --bg: #f5f5f5;
  --white: #ffffff;
  --text: #212121;
  --text-secondary: #757575;
  --border: #e0e0e0;
  --nav-height: 64px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--white);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: var(--nav-height);
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: var(--nav-height);
  background: var(--white);
  border-top: 1px solid var(--border);
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav a {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 11px;
}

.bottom-nav a.active {
  color: var(--green-dark);
}

.nav-icon { font-size: 22px; }

/* Shared page styles */
.page-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--white);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background: var(--green);
  color: white;
}

.btn-primary:active { background: var(--green-dark); }

.btn-ghost {
  background: transparent;
  color: var(--green-dark);
}

.btn-danger {
  background: #ef5350;
  color: white;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
  background: var(--white);
}

.list-item-name {
  flex: 1;
  font-size: 16px;
}

.list-item-meta {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Forms */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.modal-sheet {
  background: var(--white);
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 16px 16px 0 0;
  padding: 24px 16px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.modal-sheet h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

.form-field {
  margin-bottom: 12px;
}

.form-field label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.form-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  background: var(--bg);
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-row .form-field { flex: 1; }

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.form-actions .btn { flex: 1; }

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-secondary);
}
```

**Step 6: Verify app renders**

```bash
npm run dev
```
Open `http://localhost:5173` in browser. You should see a page with "Inventory" heading and a bottom nav bar with three tabs. Tapping tabs should navigate between placeholder pages.

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: add app shell with bottom navigation and routing"
```

---

## Task 5: Inventory Screen

**Files:**
- Modify: `src/pages/InventoryPage.tsx`

**Step 1: Implement the Inventory page**

Replace `src/pages/InventoryPage.tsx`:
```tsx
import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadInventory, saveInventory } from '../store'
import { addToInventory } from '../logic'
import type { InventoryItem } from '../types'

type FormState = { name: string; quantity: string; unit: string }
const emptyForm: FormState = { name: '', quantity: '', unit: '' }

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(loadInventory)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  function persist(updated: InventoryItem[]) {
    setItems(updated)
    saveInventory(updated)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit })
    setShowForm(true)
  }

  function handleSave() {
    const qty = parseFloat(form.quantity)
    if (!form.name.trim() || isNaN(qty) || qty <= 0) return

    if (editing) {
      persist(items.map(i =>
        i.id === editing.id ? { ...i, name: form.name.trim(), quantity: qty, unit: form.unit.trim() } : i
      ))
    } else {
      persist(addToInventory(items, { name: form.name.trim(), quantity: qty, unit: form.unit.trim() }))
    }
    setShowForm(false)
  }

  function handleDelete(id: string) {
    persist(items.filter(i => i.id !== id))
  }

  return (
    <>
      <div className="page-header">
        <h1>Inventory</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add</button>
      </div>

      {items.length === 0 && (
        <p className="empty-state">No items yet. Add what you have at home.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="list-item" onClick={() => openEdit(item)}>
          <span className="list-item-name">{item.name}</span>
          <span className="list-item-meta">{item.quantity} {item.unit}</span>
          <button
            className="btn btn-danger"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
          >
            Delete
          </button>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Item' : 'Add Item'}</h2>
            <div className="form-field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Pasta"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Quantity</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="form-field">
                <label>Unit</label>
                <input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. g"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Step 2: Verify in browser**

```bash
npm run dev
```
Navigate to Inventory tab. You should be able to add items, see them listed, tap to edit, and delete them. Refresh the page — items should persist.

**Step 3: Commit**

```bash
git add src/pages/InventoryPage.tsx
git commit -m "feat: implement inventory screen"
```

---

## Task 6: Recipes Screen

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

**Step 1: Implement the Recipes page**

Replace `src/pages/RecipesPage.tsx`:
```tsx
import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadRecipes, saveRecipes, loadInventory, saveInventory, loadShoppingList, saveShoppingList } from '../store'
import { subtractFromInventory, addRecipeToShoppingList } from '../logic'
import type { Recipe, RecipeIngredient } from '../types'

type IngredientForm = { name: string; quantity: string; unit: string }
const emptyIng: IngredientForm = { name: '', quantity: '', unit: '' }

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showIngForm, setShowIngForm] = useState(false)
  const [ingForm, setIngForm] = useState<IngredientForm>(emptyIng)
  const [toast, setToast] = useState('')

  function persistRecipes(updated: Recipe[]) {
    setRecipes(updated)
    saveRecipes(updated)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function openAddRecipe() {
    setEditingRecipe(null)
    setRecipeName('')
    setShowRecipeForm(true)
  }

  function handleSaveRecipe() {
    if (!recipeName.trim()) return
    if (editingRecipe) {
      persistRecipes(recipes.map(r =>
        r.id === editingRecipe.id ? { ...r, name: recipeName.trim() } : r
      ))
      setSelected(r => r?.id === editingRecipe.id ? { ...r, name: recipeName.trim() } : r)
    } else {
      const newRecipe: Recipe = { id: uuid(), name: recipeName.trim(), ingredients: [] }
      persistRecipes([...recipes, newRecipe])
      setSelected(newRecipe)
    }
    setShowRecipeForm(false)
  }

  function handleDeleteRecipe(id: string) {
    persistRecipes(recipes.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function handleAddIngredient() {
    if (!selected) return
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

  function handleDeleteIngredient(ingName: string) {
    if (!selected) return
    const updated = recipes.map(r =>
      r.id === selected.id
        ? { ...r, ingredients: r.ingredients.filter(i => i.name !== ingName) }
        : r
    )
    persistRecipes(updated)
    setSelected(updated.find(r => r.id === selected.id) ?? null)
  }

  function handleAddToList(recipe: Recipe) {
    const list = loadShoppingList()
    saveShoppingList(addRecipeToShoppingList(list, recipe.ingredients))
    showToast(`"${recipe.name}" added to shopping list`)
  }

  function handleCookIt(recipe: Recipe) {
    const inventory = loadInventory()
    saveInventory(subtractFromInventory(inventory, recipe.ingredients))
    showToast(`Cooked "${recipe.name}" — inventory updated`)
  }

  if (selected) {
    return (
      <>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>← Back</button>
          <h1 style={{ fontSize: 17 }}>{selected.name}</h1>
          <button className="btn btn-ghost" onClick={() => {
            setEditingRecipe(selected)
            setRecipeName(selected.name)
            setShowRecipeForm(true)
          }}>Edit</button>
        </div>

        <div style={{ padding: '8px 0' }}>
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

          {selected.ingredients.length === 0 && (
            <p className="empty-state">No ingredients yet.</p>
          )}
        </div>

        <div style={{ padding: '12px 16px' }}>
          <button className="btn btn-ghost" onClick={() => setShowIngForm(true)}>+ Add ingredient</button>
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={() => handleAddToList(selected)}>
            🛒 Add to shopping list
          </button>
          <button className="btn" style={{ background: '#ff9800', color: 'white' }} onClick={() => handleCookIt(selected)}>
            🍳 Cook it
          </button>
          <button className="btn btn-danger" onClick={() => handleDeleteRecipe(selected.id)}>
            Delete recipe
          </button>
        </div>

        {showRecipeForm && (
          <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>Edit Recipe Name</h2>
              <div className="form-field">
                <label>Name</label>
                <input value={recipeName} onChange={e => setRecipeName(e.target.value)} autoFocus />
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowRecipeForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveRecipe}>Save</button>
              </div>
            </div>
          </div>
        )}

        {showIngForm && (
          <div className="modal-overlay" onClick={() => setShowIngForm(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>Add Ingredient</h2>
              <div className="form-field">
                <label>Name</label>
                <input
                  value={ingForm.name}
                  onChange={e => setIngForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ground beef"
                  autoFocus
                />
              </div>
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
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowIngForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddIngredient}>Add</button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#323232', color: 'white', padding: '10px 20px',
            borderRadius: 8, fontSize: 14, zIndex: 200,
          }}>
            {toast}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1>Recipes</h1>
        <button className="btn btn-primary" onClick={openAddRecipe}>+ Add</button>
      </div>

      {recipes.length === 0 && (
        <p className="empty-state">No recipes yet. Add your first recipe.</p>
      )}

      {recipes.map(recipe => (
        <div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
          <span className="list-item-name">{recipe.name}</span>
          <span className="list-item-meta">{recipe.ingredients.length} ingredients →</span>
        </div>
      ))}

      {showRecipeForm && (
        <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>New Recipe</h2>
            <div className="form-field">
              <label>Recipe name</label>
              <input
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                placeholder="e.g. Bolognese"
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowRecipeForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRecipe}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Step 2: Verify in browser**

Navigate to Recipes. Add a recipe, tap it, add ingredients. Verify "Add to shopping list" shows a toast, and "Cook it" reduces inventory (check Inventory tab after).

**Step 3: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: implement recipes screen with cook-it and add-to-list"
```

---

## Task 7: Shopping List Screen

**Files:**
- Modify: `src/pages/ShoppingListPage.tsx`

**Step 1: Implement the Shopping List page**

Replace `src/pages/ShoppingListPage.tsx`:
```tsx
import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadShoppingList, saveShoppingList, loadInventory, saveInventory } from '../store'
import { addToInventory } from '../logic'
import type { ShoppingListItem } from '../types'

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>(loadShoppingList)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '' })

  function persist(updated: ShoppingListItem[]) {
    setItems(updated)
    saveShoppingList(updated)
  }

  function toggle(id: string) {
    persist(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function handleBuySelected() {
    const checked = items.filter(i => i.checked)
    if (checked.length === 0) return

    let inventory = loadInventory()
    for (const item of checked) {
      if (item.quantity !== null && item.unit !== null) {
        inventory = addToInventory(inventory, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })
      }
    }
    saveInventory(inventory)
    persist(items.filter(i => !i.checked))
  }

  function handleAddItem() {
    if (!form.name.trim()) return
    const qty = form.quantity ? parseFloat(form.quantity) : null
    const unit = form.unit.trim() || null
    const newItem: ShoppingListItem = {
      id: uuid(),
      name: form.name.trim(),
      quantity: qty,
      unit,
      checked: false,
    }
    persist([...items, newItem])
    setForm({ name: '', quantity: '', unit: '' })
    setShowForm(false)
  }

  function handleDelete(id: string) {
    persist(items.filter(i => i.id !== id))
  }

  const checkedCount = items.filter(i => i.checked).length

  return (
    <>
      <div className="page-header">
        <h1>Shopping List</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add</button>
      </div>

      {items.length === 0 && (
        <p className="empty-state">Your list is empty. Add items or use "Add to list" from a recipe.</p>
      )}

      {items.map(item => (
        <div
          key={item.id}
          className="list-item"
          style={{ opacity: item.checked ? 0.5 : 1 }}
        >
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => toggle(item.id)}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
          <span
            className="list-item-name"
            style={{ textDecoration: item.checked ? 'line-through' : 'none' }}
          >
            {item.name}
          </span>
          {item.quantity !== null && (
            <span className="list-item-meta">{item.quantity} {item.unit}</span>
          )}
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 12, color: '#ef5350' }}
            onClick={() => handleDelete(item.id)}
          >
            ✕
          </button>
        </div>
      ))}

      {checkedCount > 0 && (
        <div style={{ padding: 16 }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleBuySelected}>
            ✓ Buy selected ({checkedCount})
          </button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>Add Item</h2>
            <div className="form-field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Toilet paper"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Quantity (optional)</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Unit (optional)</label>
                <input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. pcs"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddItem}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Step 2: Verify full flow in browser**

1. Add a recipe with ingredients → tap "Add to shopping list" → navigate to Shopping List tab — items should be there
2. Check off items → tap "Buy selected" → navigate to Inventory — items should be added
3. Add a freeform item (no quantity) — should appear in list and be deletable
4. Refresh the page — list should persist

**Step 3: Commit**

```bash
git add src/pages/ShoppingListPage.tsx
git commit -m "feat: implement shopping list screen"
```

---

## Task 8: PWA Icons and Final Build

**Files:**
- Create: `public/icon-192.png`, `public/icon-512.png` (real icons)

**Step 1: Generate simple icons**

The easiest approach for a personal app is to use a favicon generator or create a simple colored square. Run this script to generate basic green square icons:

```bash
node -e "
const fs = require('fs');
// Write a minimal valid PNG (1x1 green pixel) as placeholder
// For real icons, use a tool like https://favicon.io or Canva
console.log('Replace public/icon-192.png and public/icon-512.png with real 192x192 and 512x512 PNG images for best results on iPhone');
"
```

For now the app will work. To get a proper icon on iPhone home screen, replace `public/icon-192.png` and `public/icon-512.png` with real PNG images of those dimensions. A simple colored square with a grocery emoji works well.

**Step 2: Build for production**

```bash
npm run build
```
Expected: `dist/` folder created with no errors.

**Step 3: Preview the production build**

```bash
npm run preview
```
Open `http://localhost:4173` in Safari on iPhone (must be on the same network). Tap the Share button → "Add to Home Screen". The app should install and work offline.

**Step 4: Run all tests one final time**

```bash
npx vitest run
```
Expected: All tests pass.

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete grocery PWA v1"
```

---

## Summary

| Screen | Key actions |
|--------|-------------|
| Inventory | Add / edit / delete items with name, quantity, unit |
| Recipes | Add recipes + ingredients, "Add to list", "Cook it" |
| Shopping List | Checklist from recipes + manual items, "Buy selected" adds to inventory |

**To install on iPhone:** Build with `npm run build`, serve with `npm run preview` or deploy to any static host (Netlify, Vercel, GitHub Pages), open in Safari, tap Share → Add to Home Screen.
