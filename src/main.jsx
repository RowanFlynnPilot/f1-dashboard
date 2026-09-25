import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Last line of defence: an error outside the per-tab boundaries (the header,
// the data transform) shows a reload prompt instead of a blank page.
class RootBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('Dashboard failed to render:', error) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="bench" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 }}>
        <div style={{ textAlign: 'center', color: '#E6ECF1', maxWidth: 440 }}>
          <div className="head" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>The season sheets didn't open</div>
          <p className="num" style={{ fontSize: 12, color: '#93A1AF', margin: '0 0 16px' }}>{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => window.location.reload()} className="head" style={{ padding: '8px 18px', borderRadius: 2, border: '1px solid #9DB3CF', background: 'transparent', color: '#E6ECF1', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Reload</button>
        </div>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootBoundary>
      <App />
    </RootBoundary>
  </React.StrictMode>,
)

// Offline support: cache the shell + last-fetched data (production only — a SW
// in dev would serve stale modules and fight HMR).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
