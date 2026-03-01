import { Routes, Route, Navigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { LangProvider } from './i18n'
import BottomNav from './components/BottomNav'
import InventoryPage from './pages/InventoryPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingListPage from './pages/ShoppingListPage'
import SettingsPage from './pages/SettingsPage'

function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      background: '#4caf50', color: 'white', padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 14, fontWeight: 500,
    }}>
      <span>New version available</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: 'white', color: '#4caf50', border: 'none',
          borderRadius: 6, padding: '6px 14px', fontWeight: 600,
          cursor: 'pointer', fontSize: 13,
        }}
      >
        Update
      </button>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <UpdateBanner />
      <div className="app">
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </LangProvider>
  )
}
