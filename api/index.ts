import { createHmac, timingSafeEqual } from 'node:crypto'
import express from 'express'
import type { Request, Response } from 'express'
import { listFeedback, MAX_BODY_BYTES, postFeedback } from './_lib/feedback.js'

const app = express()
// The feedback route carries a screenshot, so it gets its own 3 MB parser before the default 100 kB one.
app.use('/api/feedback', express.json({ limit: MAX_BODY_BYTES }))
app.use(express.json())

const COOKIE = 'session'
const MAX_AGE_S = 60 * 60 * 24 * 7

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function readSession(req: Request): string | null {
  const raw = req.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot < 0) return null
  const payload = raw.slice(0, dot)
  if (!safeEqual(raw.slice(dot + 1), sign(payload))) return null
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof email === 'string' && exp > Date.now() ? email : null
  } catch {
    return null
  }
}

/** The signed-in email, or null after answering 401. */
function requireSession(req: Request, res: Response): string | null {
  const email = readSession(req)
  if (!email) res.status(401).json({ error: 'Not signed in' })
  return email
}

function setSession(res: Response, email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + MAX_AGE_S * 1000 }),
  ).toString('base64url')
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_S * 1000,
    path: '/',
  })
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const okEmail = process.env.APP_USER_EMAIL
  const okPassword = process.env.APP_USER_PASSWORD
  if (!okEmail || !okPassword || !process.env.SESSION_SECRET) {
    res.status(500).json({ error: 'Server is not configured' })
    return
  }
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !safeEqual(email, okEmail) ||
    !safeEqual(password, okPassword)
  ) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  setSession(res, email)
  res.json({ email })
})

app.post('/api/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ ok: true })
})

app.get('/api/me', (req, res) => {
  const email = requireSession(req, res)
  if (!email) return
  res.json({ email })
})

app.post('/api/feedback', async (req, res) => {
  const email = requireSession(req, res)
  if (!email) return
  await postFeedback(req, res, email)
})

app.get('/api/feedback', async (req, res) => {
  const email = requireSession(req, res)
  if (!email) return
  await listFeedback(res, email)
})

// Body-too-large and malformed-JSON errors from the parsers, as JSON instead of an HTML page.
app.use((err: { status?: number }, _req: Request, res: Response, _next: unknown) => {
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500
  res.status(status).json({ error: status === 413 ? 'Report is larger than 3 MB.' : 'Bad request' })
})

export default app
