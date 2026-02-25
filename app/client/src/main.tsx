import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'
import { setupModuleLoadErrorHandlers } from './shared/lib/moduleLoadErrorHandlers'

setupModuleLoadErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
