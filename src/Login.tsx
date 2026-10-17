import { useState } from 'react'
import type { FormEvent } from 'react'

export default function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    })
    setBusy(false)
    if (res.ok) onSignedIn()
    else setError((await res.json().catch(() => null))?.error ?? 'Sign-in failed')
  }

  return (
    <main className="wrap">
      <h1>Sign in</h1>
      <form onSubmit={submit} className="stack">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        {error && <p role="alert" className="error">{error}</p>}
      </form>
    </main>
  )
}
