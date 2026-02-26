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
