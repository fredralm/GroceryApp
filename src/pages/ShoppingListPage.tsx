import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadShoppingList, saveShoppingList, loadInventory, saveInventory } from '../store'
import { addToInventory, collectAllIngredientNames, selectAllItems, removeSelectedItems } from '../logic'
import { loadRecipes } from '../store'
import AutocompleteInput from '../components/AutocompleteInput'
import type { ShoppingListItem } from '../types'
import { useTranslation } from '../i18n'

export default function ShoppingListPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<ShoppingListItem[]>(loadShoppingList)
  const allNames = collectAllIngredientNames(loadInventory(), loadRecipes())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '' })
  const [showShare, setShowShare] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [toast, setToast] = useState('')

  function persist(updated: ShoppingListItem[]) {
    setItems(updated)
    saveShoppingList(updated)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function toggle(id: string) {
    persist(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function handleBuySelected() {
    const checked = items.filter(i => i.checked)
    if (checked.length === 0) return

    let inventory = loadInventory()
    for (const item of checked) {
      if (item.quantity !== null && item.unit !== null) {
        inventory = addToInventory(inventory, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })
      }
    }
    saveInventory(inventory)
    persist(items.filter(i => !i.checked))
  }

  function handleAddItem() {
    if (!form.name.trim()) return
    const qty = form.quantity ? parseFloat(form.quantity) : null
    const unit = form.unit.trim() || null
    const newItem: ShoppingListItem = {
      id: uuid(),
      name: form.name.trim(),
      quantity: qty,
      unit,
      checked: false,
    }
    persist([...items, newItem])
    setForm({ name: '', quantity: '', unit: '' })
    setShowForm(false)
  }

  function handleDelete(id: string) {
    persist(items.filter(i => i.id !== id))
  }

  function handleSelectAll() {
    persist(selectAllItems(items))
  }

  function handleRemoveSelected() {
    persist(removeSelectedItems(items))
  }

  async function handleShare() {
    const json = JSON.stringify({ type: 'grocery-shopping-list', version: 1, items }, null, 2)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Shopping List', text: json })
      } else {
        await navigator.clipboard.writeText(json)
        showToast('Copied to clipboard')
      }
    } catch {
      // user cancelled
    }
    setShowShare(false)
  }

  function handleImport() {
    try {
      const data = JSON.parse(importText)
      if (data.type !== 'grocery-shopping-list' || !Array.isArray(data.items)) {
        showToast('Invalid shopping list data')
        return
      }
      const importedItems: ShoppingListItem[] = data.items
      const existingNames = new Set(items.map(i => i.name.toLowerCase()))
      const toAdd = importedItems
        .filter(i => !existingNames.has(i.name.toLowerCase()))
        .map(i => ({ ...i, id: uuid(), checked: false }))
      if (toAdd.length === 0) {
        showToast('All items already in list')
        return
      }
      persist([...items, ...toAdd])
      showToast(`Imported ${toAdd.length} item(s)`)
      setShowImport(false)
      setImportText('')
    } catch {
      showToast('Invalid shopping list data')
    }
  }

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header">
        <input
          type="checkbox"
          checked={items.length > 0 && checkedCount === items.length}
          ref={el => {
            if (el) el.indeterminate = checkedCount > 0 && checkedCount < items.length
          }}
          onChange={handleSelectAll}
          disabled={items.length === 0}
          style={{ width: 20, height: 20, cursor: items.length === 0 ? 'default' : 'pointer', flexShrink: 0 }}
        />
        <h1>{t('shopping.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setShowImport(true); setImportText('') }}>{t('shopping.import')}</button>
          <button className="btn btn-ghost" onClick={() => setShowShare(true)}>{t('shopping.share')}</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>{t('shopping.add')}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 && (
          <p className="empty-state">{t('shopping.empty')}</p>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className="list-item"
            style={{ opacity: item.checked ? 0.5 : 1 }}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggle(item.id)}
              style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
            />
            <span
              className="list-item-name"
              style={{ textDecoration: item.checked ? 'line-through' : 'none' }}
            >
              {item.name}
            </span>
            {item.quantity !== null && (
              <span className="list-item-meta">{item.quantity} {item.unit}</span>
            )}
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: 16, color: '#ef5350' }}
              onClick={() => handleDelete(item.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {checkedCount > 0 && (
        <div style={{ padding: 16, display: 'flex', gap: 8, flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleBuySelected}>
            {t('shopping.buySelected', { n: checkedCount })}
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleRemoveSelected}>
            {t('shopping.removeSelected', { n: checkedCount })}
          </button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{t('shopping.addItem')}</h2>
            <div className="form-field">
              <label>{t('shopping.name')}</label>
              <AutocompleteInput
                value={form.name}
                onChange={name => setForm(f => ({ ...f, name }))}
                suggestions={allNames}
                placeholder={t('shopping.namePlaceholder')}
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>{t('shopping.quantityOptional')}</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>{t('shopping.unitOptional')}</label>
                <input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder={t('shopping.unitPlaceholder')}
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>{t('shopping.cancel')}</button>
              <button className="btn btn-primary" onClick={handleAddItem}>{t('shopping.addBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{t('shopping.shareTitle')}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Exports all {items.length} item{items.length !== 1 ? 's' : ''} as JSON.
            </p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowShare(false)}>{t('shopping.cancel')}</button>
              <button className="btn btn-primary" onClick={handleShare}>{t('shopping.share')}</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{t('shopping.importTitle')}</h2>
            <div className="form-field">
              <label>Paste JSON</label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={8}
                placeholder={t('shopping.importPlaceholder')}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowImport(false)}>{t('shopping.cancel')}</button>
              <button className="btn btn-primary" onClick={handleImport}>{t('shopping.importConfirm')}</button>
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
