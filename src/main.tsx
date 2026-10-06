import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initSongsStore } from './api/songsStore'
import '@fontsource-variable/inter'
import './index.css'

document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })

// Se IndexedDB resta appeso (bug noto su alcuni iOS) l'app deve comunque partire.
const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500))

void Promise.race([initSongsStore(), timeout]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
