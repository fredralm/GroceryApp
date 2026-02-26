import { v4 as uuid } from 'uuid'
import type { InventoryItem, RecipeIngredient, ShoppingListItem } from './types'

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
