import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🥫</span>
        <span className="nav-label">Inventory</span>
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">📖</span>
        <span className="nav-label">Recipes</span>
      </NavLink>
      <NavLink to="/shopping" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🛒</span>
        <span className="nav-label">Shopping</span>
      </NavLink>
    </nav>
  )
}
