import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Tell the load watchdog in index.html that the bundle executed, so it can
// distinguish "still downloading" from "genuinely broken".
window.__ZARA_APP_STARTED__ = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
