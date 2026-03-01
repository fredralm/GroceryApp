import { Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './i18n'
import BottomNav from './components/BottomNav'
import InventoryPage from './pages/InventoryPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingListPage from './pages/ShoppingListPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <LangProvider>
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
