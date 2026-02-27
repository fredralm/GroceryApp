import { v4 as uuid } from 'uuid'
import type { InventoryItem, RecipeIngredient, ShoppingListItem } from './types'

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

export function selectAllItems(items: ShoppingListItem[]): ShoppingListItem[] {
  const allChecked = items.every(i => i.checked)
  return items.map(i => ({ ...i, checked: !allChecked }))
}

export function removeSelectedItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.filter(i => !i.checked)
}
