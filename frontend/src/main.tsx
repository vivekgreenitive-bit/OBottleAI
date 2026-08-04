import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { SystemProvider } from './context/SystemState'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SystemProvider>
      <App />
    </SystemProvider>
  </React.StrictMode>,
)
