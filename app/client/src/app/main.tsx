import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.scss'
import { App } from './App'
import { setupModuleLoadErrorHandlers } from '../shared/lib/moduleLoadErrorHandlers'

setupModuleLoadErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
