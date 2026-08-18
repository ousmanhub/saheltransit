import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/store'
import { AuthProvider } from './lib/auth'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </AuthProvider>
  </BrowserRouter>,
)
