import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SongList } from './components/SongList'
import { SongView } from './components/SongView'
import { Settings } from './components/Settings'
import { PlaylistView } from './components/PlaylistView'
import { SplashScreen } from './components/SplashScreen'
import { SongEditor } from './components/SongEditor'

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'))

  return (
    <>
      {showSplash && <SplashScreen onDone={() => { sessionStorage.setItem('splashShown', '1'); setShowSplash(false) }} />}
      <Routes>
        <Route path="/" element={<SongList />} />
        <Route path="/song/:id" element={<SongView />} />
        <Route path="/song/new" element={<SongEditor />} />
        <Route path="/song/:id/edit" element={<SongEditor />} />
        <Route path="/playlist/:id" element={<PlaylistView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  )
}
