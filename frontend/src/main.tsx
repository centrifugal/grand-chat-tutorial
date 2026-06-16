import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// We intentionally don't wrap the app in <React.StrictMode>. In development
// StrictMode double-invokes effects, which would open the Centrifugo connection
// twice and replay the real-time message queue – noise we don't want while
// learning. Feel free to enable it in your own app.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
