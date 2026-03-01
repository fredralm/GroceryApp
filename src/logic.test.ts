import { describe, it, expect } from 'vitest'
import {
  convertTo, addToInventory, subtractFromInventory, addRecipeToShoppingList,
  suggestIngredients, collectAllIngredientNames, selectAllItems, removeSelectedItems,
  checkIngredient, isRecipeReady, addMissingToShoppingList,
  expandIngredients, countMissing, hasCircularRef,
} from './logic'
import type { InventoryItem, Recipe, RecipeIngredient, ShoppingListItem } from './types'

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

describe('suggestIngredients', () => {
  const names = ['Lettmelk', 'Gulrot', 'Gulerøtter', 'Pasta', 'Parmesan']

  it('matches substring anywhere in the name (case-insensitive)', () => {
    expect(suggestIngredients('melk', names)).toEqual(['Lettmelk'])
  })

  it('matches prefix', () => {
    const result = suggestIngredients('Gul', names)
    expect(result).toContain('Gulrot')
    expect(result).toContain('Gulerøtter')
  })

  it('is case-insensitive', () => {
    expect(suggestIngredients('PASTA', names)).toEqual(['Pasta'])
  })

  it('returns empty array for empty query', () => {
    expect(suggestIngredients('', names)).toEqual([])
  })

  it('returns empty array when no match found', () => {
    expect(suggestIngredients('xyz', names)).toEqual([])
  })

  it('does not suggest exact match (already typed)', () => {
    expect(suggestIngredients('Pasta', names)).toEqual([])
  })
})

describe('collectAllIngredientNames', () => {
  it('collects names from inventory and recipes without duplicates', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
      { id: '2', name: 'Milk', quantity: 1, unit: 'l' },
    ]
    const recipes: Recipe[] = [
      { id: 'r1', name: 'Bolognese', ingredients: [
        { name: 'Pasta', quantity: 400, unit: 'g' },
        { name: 'Ground beef', quantity: 300, unit: 'g' },
      ]},
    ]
    const result = collectAllIngredientNames(inventory, recipes)
    expect(result).toContain('Pasta')
    expect(result).toContain('Milk')
    expect(result).toContain('Ground beef')
    // No duplicates
    expect(result.filter(n => n === 'Pasta')).toHaveLength(1)
  })

  it('returns sorted list', () => {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
      { id: '2', name: 'Apple', quantity: 3, unit: 'pcs' },
    ]
    const result = collectAllIngredientNames(inventory, [])
    expect(result).toEqual(['Apple', 'Pasta'])
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

describe('checkIngredient', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
    { id: '2', name: 'Milk', quantity: 0.5, unit: 'l' },
  ]

  it('returns none when ingredient not in inventory', () => {
    const result = checkIngredient({ name: 'Eggs', quantity: 2, unit: 'stk' }, inventory)
    expect(result).toEqual({ status: 'none', inventoryQty: 0, inventoryUnit: 'stk' })
  })

  it('returns enough when inventory has exactly the needed amount', () => {
    const result = checkIngredient({ name: 'Pasta', quantity: 500, unit: 'g' }, inventory)
    expect(result.status).toBe('enough')
    expect(result.inventoryQty).toBe(500)
    expect(result.inventoryUnit).toBe('g')
  })

  it('returns enough when inventory has more than needed', () => {
    const result = checkIngredient({ name: 'Pasta', quantity: 200, unit: 'g' }, inventory)
    expect(result.status).toBe('enough')
    expect(result.inventoryQty).toBe(500)
    expect(result.inventoryUnit).toBe('g')
  })

  it('returns partial when inventory has some but not enough', () => {
    const result = checkIngredient({ name: 'Pasta', quantity: 800, unit: 'g' }, inventory)
    expect(result.status).toBe('partial')
    expect(result.inventoryQty).toBe(500)
    expect(result.inventoryUnit).toBe('g')
  })

  it('returns enough with unit conversion (recipe g, inventory kg)', () => {
    const inv = [{ id: '1', name: 'Pasta', quantity: 1, unit: 'kg' }]
    const result = checkIngredient({ name: 'Pasta', quantity: 500, unit: 'g' }, inv)
    expect(result.status).toBe('enough')
  })

  it('returns partial with unit conversion when shortfall exists', () => {
    const inv = [{ id: '1', name: 'Pasta', quantity: 0.3, unit: 'kg' }]
    const result = checkIngredient({ name: 'Pasta', quantity: 500, unit: 'g' }, inv)
    expect(result.status).toBe('partial')
    expect(result.inventoryQty).toBe(0.3)
    expect(result.inventoryUnit).toBe('kg')
  })

  it('returns none when units are incompatible', () => {
    const inv = [{ id: '1', name: 'Milk', quantity: 1, unit: 'l' }]
    const result = checkIngredient({ name: 'Milk', quantity: 500, unit: 'g' }, inv)
    expect(result.status).toBe('none')
  })

  it('matches ingredient name case-insensitively', () => {
    const inv = [{ id: '1', name: 'PASTA', quantity: 600, unit: 'g' }]
    const result = checkIngredient({ name: 'pasta', quantity: 400, unit: 'g' }, inv)
    expect(result.status).toBe('enough')
  })
})

describe('isRecipeReady', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
    { id: '2', name: 'Milk', quantity: 1, unit: 'l' },
  ]

  it('returns true when all ingredients are covered', () => {
    const recipe: Recipe = {
      id: 'r1', name: 'Pasta', ingredients: [
        { name: 'Pasta', quantity: 400, unit: 'g' },
        { name: 'Milk', quantity: 0.5, unit: 'l' },
      ]
    }
    expect(isRecipeReady(recipe, inventory)).toBe(true)
  })

  it('returns false when any ingredient is partial', () => {
    const recipe: Recipe = {
      id: 'r1', name: 'Pasta', ingredients: [
        { name: 'Pasta', quantity: 600, unit: 'g' },
        { name: 'Milk', quantity: 0.5, unit: 'l' },
      ]
    }
    expect(isRecipeReady(recipe, inventory)).toBe(false)
  })

  it('returns false when any ingredient is missing', () => {
    const recipe: Recipe = {
      id: 'r1', name: 'Pasta', ingredients: [
        { name: 'Pasta', quantity: 400, unit: 'g' },
        { name: 'Eggs', quantity: 2, unit: 'stk' },
      ]
    }
    expect(isRecipeReady(recipe, inventory)).toBe(false)
  })

  it('returns true for recipe with no ingredients', () => {
    const recipe: Recipe = { id: 'r1', name: 'Empty', ingredients: [] }
    expect(isRecipeReady(recipe, inventory)).toBe(true)
  })
})

describe('addMissingToShoppingList', () => {
  const inventory: InventoryItem[] = [
    { id: '1', name: 'Pasta', quantity: 500, unit: 'g' },
  ]

  it('skips ingredients already covered by inventory', () => {
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Pasta', quantity: 400, unit: 'g' }],
      inventory
    )
    expect(result).toHaveLength(0)
  })

  it('adds full amount for ingredient not in inventory', () => {
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Eggs', quantity: 3, unit: 'stk' }],
      inventory
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Eggs')
    expect(result[0].quantity).toBe(3)
    expect(result[0].unit).toBe('stk')
  })

  it('adds shortfall for partial ingredient (same unit)', () => {
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Pasta', quantity: 800, unit: 'g' }],
      inventory
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pasta')
    expect(result[0].quantity).toBe(300)
    expect(result[0].unit).toBe('g')
  })

  it('adds shortfall for partial ingredient with unit conversion', () => {
    // 0.5 kg inventory = 500g, recipe needs 700g → shortfall 200g
    const inv = [{ id: '1', name: 'Pasta', quantity: 0.5, unit: 'kg' }]
    const result = addMissingToShoppingList(
      [],
      [{ name: 'Pasta', quantity: 700, unit: 'g' }],
      inv
    )
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBeCloseTo(200)
    expect(result[0].unit).toBe('g')
  })

  it('returns existing list unchanged when all ingredients are covered', () => {
    const existing: ShoppingListItem[] = [
      { id: 'x1', name: 'Butter', quantity: 100, unit: 'g', checked: false }
    ]
    const result = addMissingToShoppingList(
      existing,
      [{ name: 'Pasta', quantity: 300, unit: 'g' }],
      inventory
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Butter')
  })
})

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
    expect(beef?.quantity).toBeCloseTo(150)
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

  it('returns false when no cycle exists', () => {
    expect(hasCircularRef('b', 'a', [a, b])).toBe(false)
  })

  it('returns true when candidate is same as parent', () => {
    expect(hasCircularRef('a', 'a', [a, b])).toBe(true)
  })

  it('returns true when adding would create a transitive cycle', () => {
    const bWithA: Recipe = { id: 'b', name: 'B', ingredients: [], subRecipes: [{ recipeId: 'a', multiplier: 1 }] }
    expect(hasCircularRef('b', 'a', [a, bWithA])).toBe(true)
  })
})
