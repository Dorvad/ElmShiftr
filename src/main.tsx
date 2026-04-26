import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import favicon from './assets/favicon.png'
import { LoadingAnimation } from './components/ui'

function BootstrapApp() {
  const [startingUp, setStartingUp] = useState(true)

  useEffect(() => {
    const link = document.querySelector("link[rel='icon']") ?? document.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('type', 'image/png')
    link.setAttribute('href', favicon)
    if (!link.parentElement) document.head.appendChild(link)

    const timer = window.setTimeout(() => setStartingUp(false), 900)
    return () => window.clearTimeout(timer)
  }, [])

  if (startingUp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-parchment">
        <LoadingAnimation size="lg" />
        <p className="text-sm text-ink-500">ElmShiftr נטען...</p>
      </div>
    )
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BootstrapApp />
  </React.StrictMode>
)
