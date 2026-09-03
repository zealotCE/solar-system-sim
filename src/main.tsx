import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root')!
root.replaceChildren()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
