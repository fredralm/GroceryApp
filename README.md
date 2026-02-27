# Grocery App

A Progressive Web App for managing groceries. Track what you have at home, store your recipes, and build smart shopping lists that skip ingredients already in your inventory.

## Features

**Inventory** — Add items with quantities and units (e.g. 500 g pasta, 1 l milk). Supports unit conversion when merging items (kg ↔ g, l ↔ dl ↔ cl).

**Recipes** — Create recipes with ingredients. Each ingredient shows a colour-coded availability indicator based on your current inventory (green = enough, orange = partial, red = none). "Cook It" deducts used ingredients from inventory.

**Shopping list** — Add items manually or pull missing ingredients straight from a recipe. "Buy selected" moves checked items into inventory. Supports select-all and bulk remove.

## Tech stack

- React 19 + TypeScript
- Vite + vite-plugin-pwa (installable, works offline)
- React Router for client-side navigation
- localStorage for persistence (no backend)
- Vitest for unit tests

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build     # type-check + production bundle
npm run preview   # serve the production build locally
npx vitest run    # run tests
```

**Deploying** — `npm run build` outputs a static site to `dist/`. Upload that folder to any static host (Netlify, Vercel, GitHub Pages, etc.). No server-side configuration needed; the app runs entirely in the browser.

## Project structure

```
src/
├── types.ts          # Core types (InventoryItem, Recipe, ShoppingListItem, …)
├── store.ts          # localStorage read/write helpers
├── logic.ts          # Pure business logic (unit conversion, inventory checks, …)
├── logic.test.ts     # Unit tests
├── components/
│   ├── AutocompleteInput.tsx
│   └── BottomNav.tsx
└── pages/
    ├── InventoryPage.tsx
    ├── RecipesPage.tsx
    └── ShoppingListPage.tsx
```
