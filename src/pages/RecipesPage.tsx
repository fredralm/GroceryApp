import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadRecipes, saveRecipes, loadInventory, saveInventory, loadShoppingList, saveShoppingList } from '../store'
import { subtractFromInventory, addRecipeToShoppingList, collectAllIngredientNames, checkIngredient, isRecipeReady, addMissingToShoppingList } from '../logic'
import AutocompleteInput from '../components/AutocompleteInput'
import type { Recipe, RecipeIngredient } from '../types'

type IngredientForm = { name: string; quantity: string; unit: string }
const emptyIng: IngredientForm = { name: '', quantity: '', unit: '' }

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes)
  const inventory = loadInventory()
  const allNames = collectAllIngredientNames(inventory, recipes)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showIngForm, setShowIngForm] = useState(false)
  const [ingForm, setIngForm] = useState<IngredientForm>(emptyIng)
  const [toast, setToast] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [showCookWarning, setShowCookWarning] = useState(false)
  const [cookWarningConfirmed, setCookWarningConfirmed] = useState(false)

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
    if (selectedIngredients.size > 0) {
      const toAdd = recipe.ingredients.filter(ing => selectedIngredients.has(ing.name))
      saveShoppingList(addRecipeToShoppingList(list, toAdd))
      const count = selectedIngredients.size
      showToast(`Added ${count} ingredient${count > 1 ? 's' : ''} to shopping list`)
      setSelectedIngredients(new Set())
      return
    }
    if (isRecipeReady(recipe, inventory)) {
      showToast('All ingredients already in inventory')
      return
    }
    saveShoppingList(addMissingToShoppingList(list, recipe.ingredients, inventory))
    showToast(`"${recipe.name}" added to shopping list`)
  }

  function toggleIngredient(name: string) {
    setSelectedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleSelectAllIngredients() {
    if (selectedIngredients.size === selected?.ingredients.length) {
      setSelectedIngredients(new Set())
    } else {
      setSelectedIngredients(new Set(selected?.ingredients.map(i => i.name) ?? []))
    }
  }

  function handleCookIt(recipe: Recipe) {
    const inventory = loadInventory()
    if (!isRecipeReady(recipe, inventory)) {
      setCookWarningConfirmed(false)
      setShowCookWarning(true)
      return
    }
    cookRecipe(recipe)
  }

  function cookRecipe(recipe: Recipe) {
    const inventory = loadInventory()
    saveInventory(subtractFromInventory(inventory, recipe.ingredients))
    showToast(`Cooked "${recipe.name}" — inventory updated`)
    setShowCookWarning(false)
  }

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => { setSelected(null); setSelectedIngredients(new Set()) }}>← Back</button>
          <h1 style={{ fontSize: 17 }}>{selected.name}</h1>
          <button className="btn btn-ghost" onClick={() => {
            setEditingRecipe(selected)
            setRecipeName(selected.name)
            setShowRecipeForm(true)
          }}>Edit</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {selected.ingredients.length > 0 && (
            <div style={{ padding: '4px 16px 4px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={selectedIngredients.size === selected.ingredients.length}
                ref={el => {
                  if (el) el.indeterminate = selectedIngredients.size > 0 && selectedIngredients.size < selected.ingredients.length
                }}
                onChange={handleSelectAllIngredients}
                style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: '#666' }}>Select all</span>
            </div>
          )}
          {selected.ingredients.map(ing => {
            const check = checkIngredient(ing, inventory)
            const dotColor = check.status === 'enough' ? '#4caf50' : check.status === 'partial' ? '#ff9800' : '#ef5350'
            return (
              <div key={ing.name} className="list-item">
                <input
                  type="checkbox"
                  checked={selectedIngredients.has(ing.name)}
                  onChange={() => toggleIngredient(ing.name)}
                  style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <span className="list-item-name">{ing.name}</span>
                <span className="list-item-meta">
                  {ing.quantity} {ing.unit}
                  <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>({check.inventoryQty} {check.inventoryUnit} in inventory)</span>
                </span>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => handleDeleteIngredient(ing.name)}
                >
                  Remove
                </button>
              </div>
            )
          })}

          {selected.ingredients.length === 0 && (
            <p className="empty-state">No ingredients yet.</p>
          )}

          <div style={{ padding: '12px 16px' }}>
            <button className="btn btn-ghost" onClick={() => setShowIngForm(true)}>+ Add ingredient</button>
          </div>
        </div>

        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={() => handleAddToList(selected)}>
            🛒 Add to shopping list
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{ flex: 1, background: '#ff9800', color: 'white', opacity: isRecipeReady(selected, inventory) ? 1 : 0.5 }}
              onClick={() => handleCookIt(selected)}
            >
              🍳 Cook it
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDeleteRecipe(selected.id)}>
              Delete recipe
            </button>
          </div>
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
                <AutocompleteInput
                  value={ingForm.name}
                  onChange={name => setIngForm(f => ({ ...f, name }))}
                  suggestions={allNames}
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

        {showCookWarning && (
          <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center', padding: '0 16px' }} onClick={() => setShowCookWarning(false)}>
            <div className="modal-sheet" style={{ borderRadius: 16, width: '100%', margin: 0 }} onClick={e => e.stopPropagation()}>
              <h2>Missing ingredients</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Some ingredients are missing or insufficient in your inventory. You can still cook with what you have.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={cookWarningConfirmed}
                  onChange={e => setCookWarningConfirmed(e.target.checked)}
                  style={{ width: 20, height: 20, flexShrink: 0 }}
                />
                I'll cook with the ingredients I have in inventory
              </label>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowCookWarning(false)}>Cancel</button>
                <button
                  className="btn"
                  style={{ flex: 1, background: '#ff9800', color: 'white', opacity: cookWarningConfirmed ? 1 : 0.4 }}
                  disabled={!cookWarningConfirmed}
                  onClick={() => cookRecipe(selected)}
                >
                  Cook it
                </button>
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
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header">
        <h1>Recipes</h1>
        <button className="btn btn-primary" onClick={openAddRecipe}>+ Add</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {recipes.length === 0 && (
          <p className="empty-state">No recipes yet. Add your first recipe.</p>
        )}

        {recipes.map(recipe => (
          <div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
            <span className="list-item-name">{recipe.name}</span>
            <span className="list-item-meta">
              {recipe.ingredients.length} ingredients
              {isRecipeReady(recipe, inventory) && (
                <span style={{ color: '#4caf50', marginLeft: 6 }}>✓</span>
              )}
              {' →'}
            </span>
          </div>
        ))}
      </div>

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
    </div>
  )
}
