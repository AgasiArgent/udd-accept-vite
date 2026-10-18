import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Cart from './Cart.tsx'
import Login from './Login.tsx'
import MyFeedback from './MyFeedback.tsx'

type Auth = 'loading' | 'in' | 'out'

export default function App() {
  const [auth, setAuth] = useState<Auth>('loading')

  useEffect(() => {
    fetch('/api/me').then((r) => setAuth(r.ok ? 'in' : 'out'), () => setAuth('out'))
  }, [])

  // The feedback widget is only for a signed-in user. It cannot be unmounted, so sign-out reloads the page.
  useEffect(() => {
    if (auth !== 'in' || document.querySelector('script[data-udd-widget]')) return
    const s = document.createElement('script')
    s.src = '/widget.js'
    s.dataset.endpoint = '/api/feedback'
    s.dataset.uddWidget = ''
    document.body.append(s)
  }, [auth])

  if (auth === 'loading') return <p className="wrap">Loading...</p>
  return (
    <Routes>
      <Route path="/login" element={auth === 'in' ? <Navigate to="/" /> : <Login onSignedIn={() => setAuth('in')} />} />
      <Route path="/" element={auth === 'in' ? <CartPage /> : <Navigate to="/login" />} />
      <Route path="/feedback" element={auth === 'in' ? <MyFeedback /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function CartPage() {
  async function signOut() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.assign('/login')
  }
  return (
    <main className="wrap">
      <header className="bar">
        <h1>Shopping cart</h1>
        <Link to="/feedback">My feedback</Link>
        <button onClick={signOut}>Sign out</button>
      </header>
      <Cart />
    </main>
  )
}
