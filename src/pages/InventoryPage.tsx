import { useState } from 'react'
import { loadInventory, saveInventory } from '../store'
import { addToInventory, collectAllIngredientNames } from '../logic'
import { loadRecipes } from '../store'
import AutocompleteInput from '../components/AutocompleteInput'
import type { InventoryItem } from '../types'
import { useTranslation } from '../i18n'

type FormState = { name: string; quantity: string; unit: string }
const emptyForm: FormState = { name: '', quantity: '', unit: '' }

export default function InventoryPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<InventoryItem[]>(loadInventory)
  const allNames = collectAllIngredientNames(items, loadRecipes())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  function persist(updated: InventoryItem[]) {
    setItems(updated)
    saveInventory(updated)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit })
    setShowForm(true)
  }

  function handleSave() {
    const qty = parseFloat(form.quantity)
    if (!form.name.trim() || isNaN(qty) || qty <= 0) return

    if (editing) {
      persist(items.map(i =>
        i.id === editing.id ? { ...i, name: form.name.trim(), quantity: qty, unit: form.unit.trim() } : i
      ))
    } else {
      persist(addToInventory(items, { name: form.name.trim(), quantity: qty, unit: form.unit.trim() }))
    }
    setShowForm(false)
  }

  function handleDelete(id: string) {
    persist(items.filter(i => i.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header">
        <h1>Inventory</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 && (
          <p className="empty-state">No items yet. Add what you have at home.</p>
        )}

        {items.map(item => (
          <div key={item.id} className="list-item" onClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
            <span className="list-item-name">{item.name}</span>
            <span className="list-item-meta">{item.quantity} {item.unit}</span>
            <button
              className="btn btn-danger"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
            >
              {t('inventory.remove')}
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Item' : 'Add Item'}</h2>
            <div className="form-field">
              <label>Name</label>
              <AutocompleteInput
                value={form.name}
                onChange={name => setForm(f => ({ ...f, name }))}
                suggestions={allNames}
                placeholder="e.g. Pasta"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Quantity</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="form-field">
                <label>Unit</label>
                <input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. g"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
