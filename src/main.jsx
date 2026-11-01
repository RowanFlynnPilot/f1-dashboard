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

const rootEl = document.getElementById('root')
const tree = (raw, renderAt) => (
  <React.StrictMode>
    <RootBoundary>
      <App initialRaw={raw} renderAt={renderAt} />
    </RootBoundary>
  </React.StrictMode>
)
const mount = raw => ReactDOM.createRoot(rootEl).render(tree(raw, null))

// The build pre-renders the Overview into the page (scripts/prerender.mjs). It
// stays on screen while the bundle loads; once data.json (preloaded by
// index.html) is in hand React hydrates it — adopting the existing elements
// rather than replacing them — rendering first at the build's clock and in UTC
// so the HTML matches, then switching to live time. Deep links to other sheets
// get the loading shell instead (index.html's inline check) and mount normally.
if (rootEl.dataset.prerendered) {
  fetch(import.meta.env.BASE_URL + 'data.json')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then(
      raw => ReactDOM.hydrateRoot(rootEl, tree(raw, Number(rootEl.dataset.renderAt) || null), {
        // a mismatch (say, data.json changed under a cached page) makes React
        // re-render from scratch; worth a note, not an error
        onRecoverableError: e => console.warn('Pre-rendered page re-rendered:', e?.message || e),
      }),
      () => mount(null),
    )
} else {
  mount(null)
}

// Offline support: cache the shell + last-fetched data (production only — a SW
// in dev would serve stale modules and fight HMR).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
