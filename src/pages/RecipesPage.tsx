import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadRecipes, saveRecipes, loadInventory, saveInventory, loadShoppingList, saveShoppingList } from '../store'
import { subtractFromInventory, addRecipeToShoppingList, collectAllIngredientNames, checkIngredient, isRecipeReady, addMissingToShoppingList, countMissing, expandIngredients, hasCircularRef } from '../logic'
import AutocompleteInput from '../components/AutocompleteInput'
import type { Recipe, RecipeIngredient, SubRecipeRef } from '../types'

type IngredientForm = { name: string; quantity: string; unit: string }
const emptyIng: IngredientForm = { name: '', quantity: '', unit: '' }

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const inventory = loadInventory()
  const allNames = collectAllIngredientNames(inventory, recipes)
  const otherRecipeNames = recipes
    .filter(r => r.id !== selected?.id)
    .map(r => r.name)
  const allSuggestions = [...new Set([...allNames, ...otherRecipeNames])].sort()
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showIngForm, setShowIngForm] = useState(false)
  const [ingForm, setIngForm] = useState<IngredientForm>(emptyIng)
  const [editingIng, setEditingIng] = useState<RecipeIngredient | null>(null)
  const [isSubRecipeMode, setIsSubRecipeMode] = useState(false)
  const [editingSubRef, setEditingSubRef] = useState<SubRecipeRef | null>(null)
  const [toast, setToast] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [showCookWarning, setShowCookWarning] = useState(false)
  const [cookWarningConfirmed, setCookWarningConfirmed] = useState(false)
  const [search, setSearch] = useState('')
  const [showShuffle, setShowShuffle] = useState(false)
  const [shuffleReadyOnly, setShuffleReadyOnly] = useState(false)
  const [shufflePick, setShufflePick] = useState<Recipe | null>(null)

  function pickRandom(readyOnly = shuffleReadyOnly) {
    const pool = readyOnly
      ? recipes.filter(r => isRecipeReady(r, inventory, recipes))
      : recipes
    if (pool.length === 0) {
      setShufflePick(null)
      return
    }
    setShufflePick(pool[Math.floor(Math.random() * pool.length)])
  }

  function openShuffle() {
    setShowShuffle(true)
    pickRandom(shuffleReadyOnly)
  }

  const sortedFilteredRecipes = recipes
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .map(r => ({ recipe: r, missing: countMissing(r, inventory, recipes) }))
    .sort((a, b) => a.missing - b.missing)

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

  function openEditIngredient(ing: RecipeIngredient) {
    setEditingIng(ing)
    setIngForm({ name: ing.name, quantity: String(ing.quantity), unit: ing.unit })
    setShowIngForm(true)
  }

  function handleEditIngredient() {
    if (!selected || !editingIng) return
    const qty = parseFloat(ingForm.quantity)
    if (!ingForm.name.trim() || isNaN(qty) || qty <= 0) return
    const updatedIng: RecipeIngredient = { name: ingForm.name.trim(), quantity: qty, unit: ingForm.unit.trim() }
    const updated = recipes.map(r =>
      r.id === selected.id
        ? { ...r, ingredients: r.ingredients.map(i => i.name === editingIng.name ? updatedIng : i) }
        : r
    )
    persistRecipes(updated)
    setSelected(updated.find(r => r.id === selected.id) ?? null)
    setIngForm(emptyIng)
    setEditingIng(null)
    setShowIngForm(false)
  }

  function handleIngNameChange(name: string) {
    setIngForm(f => ({ ...f, name }))
    const matched = recipes.find(
      r => r.id !== selected?.id && r.name.toLowerCase() === name.toLowerCase()
    )
    setIsSubRecipeMode(!!matched)
  }

  function handleSaveIngForm() {
    if (!selected) return

    // Editing an existing sub-recipe multiplier
    if (editingSubRef) {
      const multiplier = parseFloat(ingForm.quantity)
      if (isNaN(multiplier) || multiplier <= 0) return
      const updated = recipes.map(r =>
        r.id === selected.id
          ? { ...r, subRecipes: (r.subRecipes ?? []).map(s =>
              s.recipeId === editingSubRef.recipeId ? { ...s, multiplier } : s
            )}
          : r
      )
      persistRecipes(updated)
      setSelected(updated.find(r => r.id === selected.id) ?? null)
      setEditingSubRef(null)
      setIsSubRecipeMode(false)
      setIngForm(emptyIng)
      setShowIngForm(false)
      return
    }

    // Adding/editing a sub-recipe reference
    if (isSubRecipeMode) {
      const subRecipe = recipes.find(
        r => r.id !== selected.id && r.name.toLowerCase() === ingForm.name.toLowerCase()
      )
      if (!subRecipe) return
      const multiplier = parseFloat(ingForm.quantity)
      if (isNaN(multiplier) || multiplier <= 0) return
      if (hasCircularRef(selected.id, subRecipe.id, recipes)) {
        showToast('Cannot add: would create a circular reference')
        return
      }
      const updated = recipes.map(r =>
        r.id === selected.id
          ? { ...r, subRecipes: [...(r.subRecipes ?? []), { recipeId: subRecipe.id, multiplier }] }
          : r
      )
      persistRecipes(updated)
      setSelected(updated.find(r => r.id === selected.id) ?? null)
      setIngForm(emptyIng)
      setIsSubRecipeMode(false)
      setShowIngForm(false)
      return
    }

    // Editing a regular ingredient
    if (editingIng) {
      handleEditIngredient()
      return
    }

    // Adding a regular ingredient
    handleAddIngredient()
  }

  function handleAddToList(recipe: Recipe) {
    const list = loadShoppingList()
    const expanded = expandIngredients(recipe, recipes)
    if (selectedIngredients.size > 0) {
      const toAdd = expanded.filter(ing => selectedIngredients.has(ing.name))
      saveShoppingList(addRecipeToShoppingList(list, toAdd))
      const count = selectedIngredients.size
      showToast(`Added ${count} ingredient${count > 1 ? 's' : ''} to shopping list`)
      setSelectedIngredients(new Set())
      return
    }
    if (isRecipeReady(recipe, inventory, recipes)) {
      showToast('All ingredients already in inventory')
      return
    }
    saveShoppingList(addMissingToShoppingList(list, expanded, inventory))
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
    if (!isRecipeReady(recipe, inventory, recipes)) {
      setCookWarningConfirmed(false)
      setShowCookWarning(true)
      return
    }
    cookRecipe(recipe)
  }

  function cookRecipe(recipe: Recipe) {
    const inv = loadInventory()
    const expanded = expandIngredients(recipe, recipes)
    saveInventory(subtractFromInventory(inv, expanded))
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
              <div key={ing.name} className="list-item" onClick={() => openEditIngredient(ing)} style={{ cursor: 'pointer' }}>
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
                  onClick={e => { e.stopPropagation(); handleDeleteIngredient(ing.name) }}
                >
                  Remove
                </button>
              </div>
            )
          })}

          {(selected.subRecipes ?? []).map(sub => {
            const subRecipe = recipes.find(r => r.id === sub.recipeId)
            if (!subRecipe) return null
            const subMissing = countMissing(subRecipe, inventory, recipes)
            return (
              <div
                key={sub.recipeId}
                className="list-item"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setEditingSubRef(sub)
                  setEditingIng(null)
                  setIngForm({ name: subRecipe.name, quantity: String(sub.multiplier), unit: '' })
                  setIsSubRecipeMode(true)
                  setShowIngForm(true)
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                <span className="list-item-name" style={{ fontStyle: 'italic' }}>
                  {sub.multiplier}× {subRecipe.name}
                </span>
                <span className="list-item-meta">
                  {subMissing === 0
                    ? <span style={{ color: '#4caf50' }}>✓</span>
                    : <span style={{ color: '#ef5350' }}>{subMissing} missing</span>
                  }
                </span>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={e => {
                    e.stopPropagation()
                    const updated = recipes.map(r =>
                      r.id === selected.id
                        ? { ...r, subRecipes: (r.subRecipes ?? []).filter(s => s.recipeId !== sub.recipeId) }
                        : r
                    )
                    persistRecipes(updated)
                    setSelected(updated.find(r => r.id === selected.id) ?? null)
                  }}
                >
                  Remove
                </button>
              </div>
            )
          })}

          {selected.ingredients.length === 0 && (selected.subRecipes ?? []).length === 0 && (
            <p className="empty-state">No ingredients yet.</p>
          )}

          <div style={{ padding: '12px 16px' }}>
            <button className="btn btn-ghost" onClick={() => {
              setEditingIng(null)
              setEditingSubRef(null)
              setIsSubRecipeMode(false)
              setIngForm(emptyIng)
              setShowIngForm(true)
            }}>+ Add ingredient</button>
          </div>
        </div>

        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={() => handleAddToList(selected)}>
            🛒 Add to shopping list
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{ flex: 1, background: '#ff9800', color: 'white', opacity: isRecipeReady(selected, inventory, recipes) ? 1 : 0.5 }}
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
          <div className="modal-overlay" onClick={() => { setShowIngForm(false); setEditingIng(null); setEditingSubRef(null); setIsSubRecipeMode(false); setIngForm(emptyIng) }}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>{editingSubRef ? 'Edit Multiplier' : editingIng ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
              <div className="form-field">
                <label>Name</label>
                <AutocompleteInput
                  value={ingForm.name}
                  onChange={handleIngNameChange}
                  suggestions={allSuggestions}
                  placeholder="e.g. Ground beef"
                  autoFocus
                />
              </div>
              {isSubRecipeMode ? (
                <div className="form-field">
                  <label>Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={ingForm.quantity}
                    onChange={e => setIngForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g. 0.5"
                  />
                </div>
              ) : (
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
              )}
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => { setShowIngForm(false); setEditingIng(null); setEditingSubRef(null); setIsSubRecipeMode(false); setIngForm(emptyIng) }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveIngForm}>
                  {editingSubRef || editingIng ? 'Save' : 'Add'}
                </button>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={openShuffle}>🎲</button>
          <button className="btn btn-primary" onClick={openAddRecipe}>+ Add</button>
        </div>
      </div>

      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search recipes…"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {recipes.length === 0 && (
          <p className="empty-state">No recipes yet. Add your first recipe.</p>
        )}

        {sortedFilteredRecipes.map(({ recipe, missing }) => (
          <div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
            <span className="list-item-name">{recipe.name}</span>
            <span className="list-item-meta">
              {recipe.ingredients.length + (recipe.subRecipes?.length ?? 0)} ingredients
              {missing === 0
                ? <span style={{ color: '#4caf50', marginLeft: 6 }}>✓</span>
                : <span style={{ color: '#ef5350', marginLeft: 6 }}>{missing} missing</span>
              }
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

      {showShuffle && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
          onClick={() => setShowShuffle(false)}
        >
          <div
            className="modal-sheet"
            style={{ borderRadius: 16, width: '100%', margin: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <h2>Meal Suggestion</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn ${!shuffleReadyOnly ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => { setShuffleReadyOnly(false); pickRandom(false) }}
              >
                Any recipe
              </button>
              <button
                className={`btn ${shuffleReadyOnly ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => { setShuffleReadyOnly(true); pickRandom(true) }}
              >
                Only recipes I can cook now
              </button>
            </div>

            {shufflePick ? (
              <p style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '16px 0' }}>
                {shufflePick.name}
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0' }}>
                No recipes match this filter.
              </p>
            )}

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => pickRandom()}>🎲 Shuffle again</button>
              {shufflePick && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowShuffle(false)
                    setSelected(shufflePick)
                  }}
                >
                  Open recipe
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
