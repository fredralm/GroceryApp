import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadRecipes, saveRecipes, loadInventory, saveInventory, loadShoppingList, saveShoppingList } from '../store'
import { subtractFromInventory, addRecipeToShoppingList, collectAllIngredientNames, checkIngredient, isRecipeReady, addMissingToShoppingList, countMissing, expandIngredients, hasCircularRef } from '../logic'
import AutocompleteInput from '../components/AutocompleteInput'
import type { Recipe, RecipeIngredient, SubRecipeRef } from '../types'
import { useTranslation } from '../i18n'

type IngredientForm = { name: string; quantity: string; unit: string }
const emptyIng: IngredientForm = { name: '', quantity: '', unit: '' }

export default function RecipesPage() {
  const { t } = useTranslation()
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
  const [showShare, setShowShare] = useState(false)
  const [shareSelected, setShareSelected] = useState<Set<string>>(new Set())
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')

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

  async function handleShare() {
    const toExport = recipes.filter(r => shareSelected.has(r.id))
    if (toExport.length === 0) {
      showToast('Select at least one recipe')
      return
    }
    const json = JSON.stringify({ type: 'grocery-recipes', version: 1, recipes: toExport }, null, 2)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Recipes', text: json })
      } else {
        await navigator.clipboard.writeText(json)
        showToast('Copied to clipboard')
      }
    } catch {
      // user cancelled share or clipboard denied — do nothing
    }
    setShowShare(false)
  }

  function handleImport() {
    try {
      const data = JSON.parse(importText)
      if (data.type !== 'grocery-recipes' || !Array.isArray(data.recipes)) {
        showToast('Invalid recipe data')
        return
      }
      const importedRecipes: Recipe[] = data.recipes
      const existingNames = new Set(recipes.map(r => r.name.toLowerCase()))

      // Remap IDs for recipes in the import set
      const idMap: Record<string, string> = {}
      for (const r of importedRecipes) {
        idMap[r.id] = uuid()
      }

      const toAdd: Recipe[] = importedRecipes
        .filter(r => !existingNames.has(r.name.toLowerCase()))
        .map(r => ({
          ...r,
          id: idMap[r.id],
          subRecipes: (r.subRecipes ?? [])
            .filter(s => idMap[s.recipeId] !== undefined)
            .map(s => ({ ...s, recipeId: idMap[s.recipeId] })),
        }))

      if (toAdd.length === 0) {
        showToast('All recipes already exist')
        return
      }
      persistRecipes([...recipes, ...toAdd])
      showToast(`Imported ${toAdd.length} recipe(s)`)
      setShowImport(false)
      setImportText('')
    } catch {
      showToast('Invalid recipe data')
    }
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
          <button className="btn btn-ghost" onClick={() => { setSelected(null); setSelectedIngredients(new Set()) }}>{t('recipe.back')}</button>
          <h1 style={{ fontSize: 17 }}>{selected.name}</h1>
          <button className="btn btn-ghost" onClick={() => {
            setEditingRecipe(selected)
            setRecipeName(selected.name)
            setShowRecipeForm(true)
          }}>{t('recipe.edit')}</button>
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
              <span style={{ fontSize: 13, color: '#666' }}>{t('recipe.selectAll')}</span>
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
                  <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>({check.inventoryQty} {check.inventoryUnit} {t('recipe.inInventory')})</span>
                </span>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={e => { e.stopPropagation(); handleDeleteIngredient(ing.name) }}
                >
                  {t('recipe.remove')}
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
                  {t('recipe.remove')}
                </button>
              </div>
            )
          })}

          {selected.ingredients.length === 0 && (selected.subRecipes ?? []).length === 0 && (
            <p className="empty-state">{t('recipe.noIngredients')}</p>
          )}

          <div style={{ padding: '12px 16px' }}>
            <button className="btn btn-ghost" onClick={() => {
              setEditingIng(null)
              setEditingSubRef(null)
              setIsSubRecipeMode(false)
              setIngForm(emptyIng)
              setShowIngForm(true)
            }}>{t('recipe.addIngredient')}</button>
          </div>
        </div>

        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={() => handleAddToList(selected)}>
            {t('recipe.addToList')}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{ flex: 1, background: '#ff9800', color: 'white', opacity: isRecipeReady(selected, inventory, recipes) ? 1 : 0.5 }}
              onClick={() => handleCookIt(selected)}
            >
              {t('recipe.cookIt')}
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDeleteRecipe(selected.id)}>
              {t('recipe.deleteRecipe')}
            </button>
          </div>
        </div>

        {showRecipeForm && (
          <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>{t('recipe.editRecipeName')}</h2>
              <div className="form-field">
                <label>{t('recipe.name')}</label>
                <input value={recipeName} onChange={e => setRecipeName(e.target.value)} autoFocus />
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowRecipeForm(false)}>{t('recipe.cancel')}</button>
                <button className="btn btn-primary" onClick={handleSaveRecipe}>{t('recipe.save')}</button>
              </div>
            </div>
          </div>
        )}

        {showIngForm && (
          <div className="modal-overlay" onClick={() => { setShowIngForm(false); setEditingIng(null); setEditingSubRef(null); setIsSubRecipeMode(false); setIngForm(emptyIng) }}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <h2>{editingSubRef ? t('recipe.editMultiplierTitle') : editingIng ? t('recipe.editIngredientTitle') : t('recipe.addIngredientTitle')}</h2>
              <div className="form-field">
                <label>{t('recipe.ingredientName')}</label>
                <AutocompleteInput
                  value={ingForm.name}
                  onChange={handleIngNameChange}
                  suggestions={allSuggestions}
                  placeholder={t('recipe.ingredientNamePlaceholder')}
                  autoFocus
                />
              </div>
              {isSubRecipeMode ? (
                <div className="form-field">
                  <label>{t('recipe.multiplier')}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={ingForm.quantity}
                    onChange={e => setIngForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder={t('recipe.multiplierPlaceholder')}
                  />
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-field">
                    <label>{t('recipe.quantity')}</label>
                    <input
                      type="number"
                      value={ingForm.quantity}
                      onChange={e => setIngForm(f => ({ ...f, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>{t('recipe.unit')}</label>
                    <input
                      value={ingForm.unit}
                      onChange={e => setIngForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder={t('recipe.unitPlaceholder')}
                    />
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => { setShowIngForm(false); setEditingIng(null); setEditingSubRef(null); setIsSubRecipeMode(false); setIngForm(emptyIng) }}>{t('recipe.cancel')}</button>
                <button className="btn btn-primary" onClick={handleSaveIngForm}>
                  {editingSubRef || editingIng ? t('recipe.save') : t('recipe.add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCookWarning && (
          <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center', padding: '0 16px' }} onClick={() => setShowCookWarning(false)}>
            <div className="modal-sheet" style={{ borderRadius: 16, width: '100%', margin: 0 }} onClick={e => e.stopPropagation()}>
              <h2>{t('recipe.missingWarningTitle')}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {t('recipe.missingWarningBody')}
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={cookWarningConfirmed}
                  onChange={e => setCookWarningConfirmed(e.target.checked)}
                  style={{ width: 20, height: 20, flexShrink: 0 }}
                />
                {t('recipe.missingWarningCheckbox')}
              </label>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowCookWarning(false)}>{t('recipe.cancel')}</button>
                <button
                  className="btn"
                  style={{ flex: 1, background: '#ff9800', color: 'white', opacity: cookWarningConfirmed ? 1 : 0.4 }}
                  disabled={!cookWarningConfirmed}
                  onClick={() => cookRecipe(selected)}
                >
                  {t('recipe.cookIt')}
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
        <h1>{t('recipes.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setShowImport(true); setImportText('') }}>{t('recipes.importBtn')}</button>
          <button className="btn btn-ghost" onClick={() => { setShowShare(true); setShareSelected(new Set()) }}>{t('recipes.shareBtn')}</button>
          <button className="btn btn-ghost" onClick={openShuffle}>{t('recipes.shuffle')}</button>
          <button className="btn btn-primary" onClick={openAddRecipe}>{t('recipes.add')}</button>
        </div>
      </div>

      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('recipes.search')}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {recipes.length === 0 && (
          <p className="empty-state">{t('recipes.empty')}</p>
        )}

        {sortedFilteredRecipes.map(({ recipe, missing }) => (
          <div key={recipe.id} className="list-item" onClick={() => setSelected(recipe)} style={{ cursor: 'pointer' }}>
            <span className="list-item-name">{recipe.name}</span>
            <span className="list-item-meta">
              {recipe.ingredients.length + (recipe.subRecipes?.length ?? 0)} {t('recipes.ingredients')}
              {missing === 0
                ? <span style={{ color: '#4caf50', marginLeft: 6 }}>✓</span>
                : <span style={{ color: '#ef5350', marginLeft: 6 }}>{missing} {t('recipes.missing')}</span>
              }
              {' →'}
            </span>
          </div>
        ))}
      </div>

      {showRecipeForm && (
        <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{t('recipes.newRecipe')}</h2>
            <div className="form-field">
              <label>{t('recipes.recipeName')}</label>
              <input
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                placeholder={t('recipes.recipeNamePlaceholder')}
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowRecipeForm(false)}>{t('recipes.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSaveRecipe}>{t('recipes.create')}</button>
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
            <h2>{t('shuffle.title')}</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn ${!shuffleReadyOnly ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => { setShuffleReadyOnly(false); pickRandom(false) }}
              >
                {t('shuffle.filterAny')}
              </button>
              <button
                className={`btn ${shuffleReadyOnly ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => { setShuffleReadyOnly(true); pickRandom(true) }}
              >
                {t('shuffle.filterReady')}
              </button>
            </div>

            {shufflePick ? (
              <p style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '16px 0' }}>
                {shufflePick.name}
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0' }}>
                {t('shuffle.none')}
              </p>
            )}

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => pickRandom()}>{t('shuffle.again')}</button>
              {shufflePick && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowShuffle(false)
                    setSelected(shufflePick)
                  }}
                >
                  {t('shuffle.open')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{t('recipes.shareTitle')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={shareSelected.size === recipes.length && recipes.length > 0}
                ref={el => {
                  if (el) el.indeterminate = shareSelected.size > 0 && shareSelected.size < recipes.length
                }}
                onChange={() => {
                  if (shareSelected.size === recipes.length) setShareSelected(new Set())
                  else setShareSelected(new Set(recipes.map(r => r.id)))
                }}
                style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 14 }}>{t('recipes.selectAll')}</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {recipes.map(r => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={shareSelected.has(r.id)}
                    onChange={() => {
                      setShareSelected(prev => {
                        const next = new Set(prev)
                        if (next.has(r.id)) next.delete(r.id)
                        else next.add(r.id)
                        return next
                      })
                    }}
                    style={{ width: 20, height: 20, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 15 }}>{r.name}</span>
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowShare(false)}>{t('recipes.cancel')}</button>
              <button
                className="btn btn-primary"
                style={{ opacity: shareSelected.size === 0 ? 0.4 : 1 }}
                disabled={shareSelected.size === 0}
                onClick={handleShare}
              >
                Share ({shareSelected.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{t('recipes.importTitle')}</h2>
            <div className="form-field">
              <label>Paste JSON</label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={8}
                placeholder={t('recipes.importPlaceholder')}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowImport(false)}>{t('recipes.cancel')}</button>
              <button className="btn btn-primary" onClick={handleImport}>{t('recipes.importConfirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
