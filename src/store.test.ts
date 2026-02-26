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
