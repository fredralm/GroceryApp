import { NavLink } from 'react-router-dom'
import { useTranslation } from '../i18n'

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="bottom-nav">
      <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🥫</span>
        <span className="nav-label">{t('nav.inventory')}</span>
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">📖</span>
        <span className="nav-label">{t('nav.recipes')}</span>
      </NavLink>
      <NavLink to="/shopping" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🛒</span>
        <span className="nav-label">{t('nav.shopping')}</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">{t('nav.settings')}</span>
      </NavLink>
    </nav>
  )
}
