import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SongList } from './components/SongList'
import { SongView } from './components/SongView'
import { Settings } from './components/Settings'
import { PlaylistView } from './components/PlaylistView'
import { SplashScreen } from './components/SplashScreen'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <Routes>
        <Route path="/" element={<SongList />} />
        <Route path="/song/:id" element={<SongView />} />
        <Route path="/playlist/:id" element={<PlaylistView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  )
}
