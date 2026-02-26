import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadRecipes, saveRecipes, loadInventory, saveInventory, loadShoppingList, saveShoppingList } from '../store'
import { subtractFromInventory, addRecipeToShoppingList } from '../logic'
import type { Recipe, RecipeIngredient } from '../types'

type IngredientForm = { name: string; quantity: string; unit: string }
const emptyIng: IngredientForm = { name: '', quantity: '', unit: '' }

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showIngForm, setShowIngForm] = useState(false)
  const [ingForm, setIngForm] = useState<IngredientForm>(emptyIng)
  const [toast, setToast] = useState('')

  function persistRecipes(updated: Recipe[]) {
    setRecipes(updated)
    saveRecipes(updated)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function openAddRecipe() {
    setEditingRecipe(null)
    setRecipeName('')
    setShowRecipeForm(true)
  }

  function handleSaveRecipe() {
    if (!recipeName.trim()) return
    if (editingRecipe) {
      const updated = recipes.map(r =>
        r.id === editingRecipe.id ? { ...r, name: recipeName.trim() } : r
      )
      persistRecipes(updated)
      setSelected(s => s?.id === editingRecipe.id ? { ...s, name: recipeName.trim() } : s)
    } else {
      const newRecipe: Recipe = { id: uuid(), name: recipeName.trim(), ingredients: [] }
      persistRecipes([...recipes, newRecipe])
      setSelected(newRecipe)
    }
    setShowRecipeForm(false)
  }

  function handleDeleteRecipe(id: string) {
    persistRecipes(recipes.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function handleAddIngredient() {
    if (!selected) return
    const qty = parseFloat(ingForm.quantity)
    if (!ingForm.name.trim() || isNaN(qty) || qty <= 0) return
    const newIng: RecipeIngredient = { name: ingForm.name.trim(), quantity: qty, unit: ingForm.unit.trim() }
    const updated = recipes.map(r =>
      r.id === selected.id ? { ...r, ingredients: [...r.ingredients, newIng] } : r
    )
    persistRecipes(updated)
    setSelected(updated.find(r => r.id === selected.id) ?? null)
    setIngForm(emptyIng)
    setShowIngForm(false)
  }

  function handleDeleteIngredient(ingName: string) {
    if (!selected) return
    const updated = recipes.map(r =>
      r.id === selected.id
        ? { ...r, ingredients: r.ingredients.filter(i => i.name !== ingName) }
        : r
    )
    persistRecipes(updated)
    setSelected(updated.find(r => r.id === selected.id) ?? null)
  }

  function handleAddToList(recipe: Recipe) {
    const list = loadShoppingList()
    saveShoppingList(addRecipeToShoppingList(list, recipe.ingredients))
    showToast(`"${recipe.name}" added to shopping list`)
  }

  function handleCookIt(recipe: Recipe) {
    const inventory = loadInventory()
    saveInventory(subtractFromInventory(inventory, recipe.ingredients))
    showToast(`Cooked "${recipe.name}" — inventory updated`)
  }

  if (selected) {
    return (
      <>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>← Back</button>
          <h1 style={{ fontSize: 17 }}>{selected.name}</h1>
          <button className="btn btn-ghost" onClick={() => {
            setEditingRecipe(selected)
            setRecipeName(selected.name)
            setShowRecipeForm(true)
          }}>Edit</button>
        </div>

        <div style={{ padding: '8px 0' }}>
          {selected.ingredients.map(ing => (
            <div key={ing.name} className="list-item">
              <span className="list-item-name">{ing.name}</span>
              <span className="list-item-meta">{ing.quantity} {ing.unit}</span>
              <button
                className="btn btn-danger"
                style={{ padding: '6px 10px', fontSize: 12 }}
                onClick={() => handleDeleteIngredient(ing.name)}
              >
                Remove
              </button>
            </div>
          ))}

          {selected.ingredients.length === 0 && (
            <p className="empty-state">No ingredients yet.</p>
          )}
        </div>

        <div style={{ padding: '12px 16px' }}>
          <button className="btn btn-ghost" onClick={() => setShowIngForm(true)}>+ Add ingredient</button>
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={() => handleAddToList(selected)}>
            🛒 Add to shopping list
          </button>
          <button className="btn" style={{ background: '#ff9800', color: 'white' }} onClick={() => handleCookIt(selected)}>
            🍳 Cook it
          </button>
          <button className="btn btn-danger" onClick={() => handleDeleteRecipe(selected.id)}>
            Delete recipe
          </button>
        </div>

        {showRecipeForm && (
          <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>Edit Recipe Name</h2>
              <div className="form-field">
                <label>Name</label>
                <input value={recipeName} onChange={e => setRecipeName(e.target.value)} autoFocus />
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowRecipeForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveRecipe}>Save</button>
              </div>
            </div>
          </div>
        )}

        {showIngForm && (
          <div className="modal-overlay" onClick={() => setShowIngForm(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>Add Ingredient</h2>
              <div className="form-field">
                <label>Name</label>
                <input
                  value={ingForm.name}
                  onChange={e => setIngForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ground beef"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={ingForm.quantity}
                    onChange={e => setIngForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  <input
                    value={ingForm.unit}
                    onChange={e => setIngForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. g"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowIngForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddIngredient}>Add</button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#323232', color: 'white', padding: '10px 20px',
            borderRadius: 8, fontSize: 14, zIndex: 200, whiteSpace: 'nowrap',
          }}>
            {toast}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1>Recipes</h1>
        <button className="btn btn-primary" onClick={openAddRecipe}>+ Add</button>
      </div>

      {recipes.length === 0 && (
        <p className="empty-state">No recipes yet. Add your first recipe.</p>
      )}

      {recipes.map(recipe => (
        <div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
          <span className="list-item-name">{recipe.name}</span>
          <span className="list-item-meta">{recipe.ingredients.length} ingredients →</span>
        </div>
      ))}

      {showRecipeForm && (
        <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>New Recipe</h2>
            <div className="form-field">
              <label>Recipe name</label>
              <input
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                placeholder="e.g. Bolognese"
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowRecipeForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRecipe}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
