import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import InventoryPage from './pages/InventoryPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingListPage from './pages/ShoppingListPage'

export default function App() {
  return (
    <div className="app">
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
