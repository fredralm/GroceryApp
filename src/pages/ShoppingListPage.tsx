import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadShoppingList, saveShoppingList, loadInventory, saveInventory } from '../store'
import { addToInventory } from '../logic'
import type { ShoppingListItem } from '../types'

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>(loadShoppingList)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '' })

  function persist(updated: ShoppingListItem[]) {
    setItems(updated)
    saveShoppingList(updated)
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

  const checkedCount = items.filter(i => i.checked).length

  return (
    <>
      <div className="page-header">
        <h1>Shopping List</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add</button>
      </div>

      {items.length === 0 && (
        <p className="empty-state">Your list is empty. Add items or use "Add to list" from a recipe.</p>
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

      {checkedCount > 0 && (
        <div style={{ padding: 16 }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleBuySelected}>
            ✓ Buy selected ({checkedCount})
          </button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>Add Item</h2>
            <div className="form-field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Toilet paper"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Quantity (optional)</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Unit (optional)</label>
                <input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. pcs"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddItem}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
