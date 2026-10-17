import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Cart from './Cart.tsx'
import Login from './Login.tsx'

type Auth = 'loading' | 'in' | 'out'

export default function App() {
  const [auth, setAuth] = useState<Auth>('loading')

  useEffect(() => {
    fetch('/api/me').then((r) => setAuth(r.ok ? 'in' : 'out'), () => setAuth('out'))
  }, [])

  if (auth === 'loading') return <p className="wrap">Loading...</p>
  return (
    <Routes>
      <Route path="/login" element={auth === 'in' ? <Navigate to="/" /> : <Login onSignedIn={() => setAuth('in')} />} />
      <Route path="/" element={auth === 'in' ? <CartPage onSignedOut={() => setAuth('out')} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function CartPage({ onSignedOut }: { onSignedOut: () => void }) {
  const navigate = useNavigate()
  async function signOut() {
    await fetch('/api/logout', { method: 'POST' })
    onSignedOut()
    navigate('/login')
  }
  return (
    <main className="wrap">
      <header className="bar">
        <h1>Shopping cart</h1>
        <button onClick={signOut}>Sign out</button>
      </header>
      <Cart />
    </main>
  )
}
