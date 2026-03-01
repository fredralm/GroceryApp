import { useTranslation } from '../i18n'

export default function SettingsPage() {
  const { lang, setLang, t } = useTranslation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {t('settings.language')}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setLang('en')}
            >
              {t('settings.english')}
            </button>
            <button
              className={`btn ${lang === 'no' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setLang('no')}
            >
              {t('settings.norwegian')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
