import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import './lib/globalTranslationRuntime.js'
import './styles.css'
import { initializeCloudSync } from './lib/cloudSync.js'
import { LanguageProvider } from './lib/I18nContext.jsx'

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

initializeCloudSync().finally(renderApp)
