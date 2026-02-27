import { describe, it, expect } from 'vitest'
import {
  convertTo, addToInventory, subtractFromInventory, addRecipeToShoppingList,
  selectAllItems, removeSelectedItems,
} from './logic'
import type { InventoryItem, RecipeIngredient, ShoppingListItem } from './types'

describe('convertTo', () => {
  it('converts kg to g', () => {
    expect(convertTo(1, 'kg', 'g')).toBe(1000)
  })
  it('converts g to kg', () => {
    expect(convertTo(1000, 'g', 'kg')).toBe(1)
  })
  it('converts l to dl', () => {
    expect(convertTo(1, 'l', 'dl')).toBe(10)
  })
  it('converts dl to l', () => {
    expect(convertTo(10, 'dl', 'l')).toBe(1)
  })
  it('converts cl to dl', () => {
    expect(convertTo(10, 'cl', 'dl')).toBe(1)
  })
  it('converts dl to cl', () => {
    expect(convertTo(1, 'dl', 'cl')).toBe(10)
  })
  it('returns same quantity for identical units', () => {
    expect(convertTo(500, 'g', 'g')).toBe(500)
  })
  it('returns null for incompatible units', () => {
    expect(convertTo(1, 'kg', 'l')).toBeNull()
  })
  it('is case-insensitive', () => {
    expect(convertTo(1, 'KG', 'G')).toBe(1000)
  })
})

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

  it('merges kg into g inventory item', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Flour', quantity: 500, unit: 'g' }
    ]
    const result = addToInventory(inventory, { name: 'Flour', quantity: 1, unit: 'kg' })
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(1500)
    expect(result[0].unit).toBe('g')
  })

  it('merges dl into l inventory item', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Milk', quantity: 1, unit: 'l' }
    ]
    const result = addToInventory(inventory, { name: 'Milk', quantity: 5, unit: 'dl' })
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBeCloseTo(1.5)
    expect(result[0].unit).toBe('l')
  })

  it('merges cl into dl inventory item', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Cream', quantity: 2, unit: 'dl' }
    ]
    const result = addToInventory(inventory, { name: 'Cream', quantity: 10, unit: 'cl' })
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBeCloseTo(3)
    expect(result[0].unit).toBe('dl')
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

  it('subtracts kg from g inventory item', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Flour', quantity: 1000, unit: 'g' }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Flour', quantity: 0.5, unit: 'kg' }]
    const result = subtractFromInventory(inventory, ingredients)
    expect(result[0].quantity).toBe(500)
    expect(result[0].unit).toBe('g')
  })

  it('subtracts dl from l inventory item', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Milk', quantity: 1, unit: 'l' }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Milk', quantity: 5, unit: 'dl' }]
    const result = subtractFromInventory(inventory, ingredients)
    expect(result[0].quantity).toBeCloseTo(0.5)
    expect(result[0].unit).toBe('l')
  })

  it('subtracts cl from dl inventory item', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Cream', quantity: 5, unit: 'dl' }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Cream', quantity: 10, unit: 'cl' }]
    const result = subtractFromInventory(inventory, ingredients)
    expect(result[0].quantity).toBeCloseTo(4)
    expect(result[0].unit).toBe('dl')
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

  it('merges kg ingredient into g shopping list item', () => {
    const list: ShoppingListItem[] = [
      { id: '1', name: 'Flour', quantity: 500, unit: 'g', checked: false }
    ]
    const ingredients: RecipeIngredient[] = [{ name: 'Flour', quantity: 1, unit: 'kg' }]
    const result = addRecipeToShoppingList(list, ingredients)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(1500)
    expect(result[0].unit).toBe('g')
  })
})

// --- selectAllItems ---

describe('selectAllItems', () => {
  const items: ShoppingListItem[] = [
    { id: '1', name: 'Milk', quantity: 1, unit: 'l', checked: false },
    { id: '2', name: 'Eggs', quantity: 6, unit: 'stk', checked: false },
    { id: '3', name: 'Bread', quantity: 1, unit: 'stk', checked: false },
  ]

  it('returns empty array for empty input', () => {
    expect(selectAllItems([])).toEqual([])
  })

  it('selects all when none are checked', () => {
    const result = selectAllItems(items)
    expect(result.every(i => i.checked)).toBe(true)
  })

  it('selects all when some are checked', () => {
    const partial = items.map((i, idx) => ({ ...i, checked: idx === 0 }))
    const result = selectAllItems(partial)
    expect(result.every(i => i.checked)).toBe(true)
    expect(result).toHaveLength(3)
  })

  it('deselects all when all are checked', () => {
    const allChecked = items.map(i => ({ ...i, checked: true }))
    const result = selectAllItems(allChecked)
    expect(result.every(i => i.checked)).toBe(false)
  })
})

// --- removeSelectedItems ---

describe('removeSelectedItems', () => {
  const items: ShoppingListItem[] = [
    { id: '1', name: 'Milk', quantity: 1, unit: 'l', checked: true },
    { id: '2', name: 'Eggs', quantity: 6, unit: 'stk', checked: false },
    { id: '3', name: 'Bread', quantity: 1, unit: 'stk', checked: true },
  ]

  it('returns empty array for empty input', () => {
    expect(removeSelectedItems([])).toEqual([])
  })

  it('removes only checked items', () => {
    const result = removeSelectedItems(items)
    expect(result.map(i => i.id)).toEqual(['2'])
  })

  it('returns all items unchanged when none are checked', () => {
    const none = items.map(i => ({ ...i, checked: false }))
    const result = removeSelectedItems(none)
    expect(result).toHaveLength(3)
  })
})
