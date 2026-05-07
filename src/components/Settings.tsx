import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sun, Moon, ZoomOut, ZoomIn } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useFontSize } from '../hooks/useFontSize'
import { useChordNotation } from '../hooks/useChordNotation'
import { clearCache } from '../api/cacheStore'

export function Settings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { fontSize, increase, decrease } = useFontSize()
  const { notation, toggle: toggleNotation } = useChordNotation()

  const handleClearCache = () => {
    if (!confirm('Cancellare la cache locale?')) return
    clearCache()
    location.reload()
  }

  return (
    <div className="settings">
      <header className="settings__header">
        <button className="icon-btn icon-btn--accent" onClick={() => navigate(-1)} aria-label="Torna indietro">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings__title">Impostazioni</h1>
      </header>

      <main className="settings__body">
        <section className="settings__section">
          <h2 className="settings__section-title">Tema</h2>
          <div className="settings__row">
            <span className="settings__row-label">{theme === 'dark' ? 'Scuro' : 'Chiaro'}</span>
            <button className="icon-btn" onClick={toggleTheme} aria-label="Cambia tema">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </section>

        <section className="settings__section">
          <h2 className="settings__section-title">Notazione accordi</h2>
          <div className="settings__row">
            <span className="settings__row-label">
              {notation === 'italian' ? 'Italiana (Do Re Mi…)' : 'Internazionale (C D E…)'}
            </span>
            <button className="settings__notation-btn" onClick={toggleNotation} aria-label="Cambia notazione accordi">
              {notation === 'italian' ? 'IT' : 'EN'}
            </button>
          </div>
        </section>

        <section className="settings__section">
          <h2 className="settings__section-title">Dimensione testo canzoni</h2>
          <div className="settings__row">
            <span className="settings__row-label">Anteprima testo</span>
            <div className="settings__font-controls">
              <button
                className="settings__font-btn"
                onClick={decrease}
                disabled={fontSize <= 12}
                aria-label="Riduci dimensione testo"
              >
                <ZoomOut size={16} />
              </button>
              <span className="settings__font-value">{fontSize} px</span>
              <button
                className="settings__font-btn"
                onClick={increase}
                disabled={fontSize >= 26}
                aria-label="Aumenta dimensione testo"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <p className="settings__preview" style={{ fontSize: `${fontSize}px` }}>
            [Am]Testo di <span style={{ color: 'var(--chord)', fontWeight: 700 }}>esempio</span> con accordi
          </p>
        </section>

        <section className="settings__section">
          <h2 className="settings__section-title">Cache</h2>
          <div className="settings__row">
            <span className="settings__row-label">Cancella cache locale</span>
            <button className="icon-btn" onClick={handleClearCache} aria-label="Cancella cache">
              <ZoomOut size={20} />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
