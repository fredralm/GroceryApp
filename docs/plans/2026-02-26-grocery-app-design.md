# Grocery App Design

**Date:** 2026-02-26

## Overview

A lightweight PWA (Progressive Web App) for managing a home grocery inventory and cooking from saved recipes. Runs in the browser, installable on iPhone via Safari, works offline, stores all data locally on the device.

## Tech Stack

- **Framework:** React + Vite
- **PWA:** `vite-plugin-pwa` (offline support, installable from Safari)
- **Storage:** `localStorage` (device-only, no backend)
- **Platform:** iPhone (mobile-first design), no App Store required

## Screens

Three screens connected by a bottom tab navigation bar.

### 1. Inventory

A list of all grocery items currently at home. Each item has a name, quantity, and unit (e.g. "Pasta, 500, g").

- Add new items
- Tap an item to edit name, quantity, or unit
- Delete items

### 2. Recipes

A list of saved recipes, each with a name and a list of ingredients (name, quantity, unit).

- Add new recipes manually
- Tap a recipe to view and edit its ingredients
- Each recipe has two action buttons:
  - **"Add to list"** — pushes all recipe ingredients to the Shopping List. Multiple recipes can be added to the list for a single shopping trip.
  - **"Cook it"** — subtracts the recipe's ingredient quantities from the inventory. Items that reach zero are removed.

### 3. Shopping List

A persistent checklist used at the store. Can be populated from recipes or with freeform manual items (e.g. "Toilet paper").

- Add freeform items manually
- Checkboxes on each item
- **"Buy selected"** button — adds checked items' quantities to inventory and removes them from the list

## Data Model

All data stored in `localStorage`.

### Inventory Item
```json
{ "id": "uuid", "name": "Pasta", "quantity": 500, "unit": "g" }
```

### Recipe
```json
{
  "id": "uuid",
  "name": "Bolognese",
  "ingredients": [
    { "name": "Pasta", "quantity": 400, "unit": "g" },
    { "name": "Ground beef", "quantity": 300, "unit": "g" }
  ]
}
```

### Shopping List Item
```json
{ "id": "uuid", "name": "Pasta", "quantity": 400, "unit": "g", "checked": false }
```

Freeform items (e.g. toilet paper) have no quantity/unit — just a name and a checkbox.

## Key Flows

### Shopping trip
1. Go to Recipes → tap "Add to list" on one or more recipes
2. Add any extra freeform items to the Shopping List
3. At the store, open Shopping List → check off items as you find them
4. Tap "Buy selected" → checked items are added to inventory

### Cooking a meal
1. Go to Recipes → tap "Cook it" on the recipe you're making
2. Inventory quantities are reduced accordingly

## Inventory Matching

When "Buy selected" adds items to inventory, items are matched by **name (case-insensitive)**. If a matching item exists, its quantity is increased. If not, a new inventory item is created.

When "Cook it" subtracts from inventory, the same name-matching applies. Items that reach zero or below are removed from inventory.

## Future Considerations (out of scope for v1)

- Import recipes from a URL
- Sync across devices
