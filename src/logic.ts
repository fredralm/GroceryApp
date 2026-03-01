import { v4 as uuid } from 'uuid'
import type { InventoryItem, Recipe, RecipeIngredient, ShoppingListItem } from './types'

// Conversion table: [fromUnit, toUnit] -> multiplier
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

export function convertTo(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = fromUnit.toLowerCase().trim()
  const to = toUnit.toLowerCase().trim()
  if (from === to) return quantity
  const multiplier = CONVERSIONS[`${from}->${to}`]
  return multiplier !== undefined ? quantity * multiplier : null
}

export function addToInventory(
  inventory: InventoryItem[],
  incoming: { name: string; quantity: number; unit: string }
): InventoryItem[] {
  const match = inventory.find(
    item => item.name.toLowerCase() === incoming.name.toLowerCase()
  )
  if (match) {
    const converted = convertTo(incoming.quantity, incoming.unit, match.unit)
    const addAmount = converted ?? incoming.quantity
    return inventory.map(item =>
      item.id === match.id ? { ...item, quantity: item.quantity + addAmount } : item
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
    const converted = convertTo(ingredient.quantity, ingredient.unit, item.unit)
    const subtractAmount = converted ?? ingredient.quantity
    return { ...item, quantity: item.quantity - subtractAmount }
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
      const existingQty = match.quantity ?? 0
      const existingUnit = match.unit ?? ing.unit
      const converted = convertTo(ing.quantity, ing.unit, existingUnit)
      const addAmount = converted ?? ing.quantity
      result = result.map(item =>
        item.id === match.id
          ? { ...item, quantity: existingQty + addAmount }
          : item
      )
    } else {
      result.push({ id: uuid(), name: ing.name, quantity: ing.quantity, unit: ing.unit, checked: false })
    }
  }
  return result
}

export function suggestIngredients(query: string, allNames: string[]): string[] {
  const q = query.trim()
  if (!q) return []
  const lower = q.toLowerCase()
  return allNames.filter(name =>
    name !== q &&
    name.toLowerCase().includes(lower)
  )
}

export function collectAllIngredientNames(inventory: InventoryItem[], recipes: Recipe[]): string[] {
  const names = new Set<string>()
  inventory.forEach(item => names.add(item.name))
  recipes.forEach(recipe => recipe.ingredients.forEach(ing => names.add(ing.name)))
  return Array.from(names).sort()
}

export function selectAllItems(items: ShoppingListItem[]): ShoppingListItem[] {
  const allChecked = items.every(i => i.checked)
  return items.map(i => ({ ...i, checked: !allChecked }))
}

export function removeSelectedItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.filter(i => !i.checked)
}

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
  const converted = convertTo(ingredient.quantity, ingredient.unit, match.unit)
  if (converted === null) {
    return { status: 'none', inventoryQty: match.quantity, inventoryUnit: match.unit }
  }
  const status = match.quantity >= converted ? 'enough' : 'partial'
  return { status, inventoryQty: match.quantity, inventoryUnit: match.unit }
}

export function isRecipeReady(recipe: Recipe, inventory: InventoryItem[]): boolean {
  return recipe.ingredients.every(
    ing => checkIngredient(ing, inventory).status === 'enough'
  )
}

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
