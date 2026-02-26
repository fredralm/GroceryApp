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
