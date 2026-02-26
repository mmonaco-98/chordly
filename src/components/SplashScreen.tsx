import { useState, useEffect } from 'react'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2000)
    const t2 = setTimeout(onDone, 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div className={`splash${fading ? ' splash--fade' : ''}`}>
      <img src="/icons/icon.svg" alt="Chordly" className="splash__logo" />
      <span className="splash__name">Chordly</span>
    </div>
  )
}
