import { useState, useRef, useEffect } from 'react'
import { suggestIngredients } from '../logic'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  autoFocus?: boolean
}

export default function AutocompleteInput({ value, onChange, suggestions, placeholder, autoFocus }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = suggestIngredients(value, suggestions)

  useEffect(() => {
    setOpen(matches.length > 0)
  }, [value, matches.length])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: open ? '8px 8px 0 0' : '8px', fontSize: 16, background: 'var(--bg)', boxSizing: 'border-box' }}
        onFocus={() => { if (matches.length > 0) setOpen(true) }}
      />
      {open && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          margin: 0,
          padding: 0,
          listStyle: 'none',
          zIndex: 50,
          maxHeight: 180,
          overflowY: 'auto',
        }}>
          {matches.map(name => (
            <li
              key={name}
              onMouseDown={e => { e.preventDefault(); handleSelect(name) }}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 16, borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
