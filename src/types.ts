export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
}

export interface SubRecipeRef {
  recipeId: string
  multiplier: number
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  subRecipes?: SubRecipeRef[]
}

export interface ShoppingListItem {
  id: string
  name: string
  quantity: number | null  // null for freeform items like "Toilet paper"
  unit: string | null
  checked: boolean
}
