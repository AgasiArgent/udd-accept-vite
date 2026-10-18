import type { Request, Response } from 'express'
import { reporterLine, renderIssue } from './issueBody.js'
import type { Payload } from './issueBody.js'
// @ts-expect-error status.mjs is the kit's plain-JS helper, copied verbatim
import { statusFromIssue } from './status.mjs'

export const MAX_BODY_BYTES = 3 * 1024 * 1024
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000
const CACHE_MS = 60 * 1000

// shortcut: in-memory counters; on serverless each instance counts alone, so the real limit is
// looser than 10/hour. Swap for a shared store (Upstash/KV) if abuse shows up.
const hits = new Map<string, number[]>()

function overLimit(user: string): boolean {
  const now = Date.now()
  const recent = (hits.get(user) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(user, recent)
    return true
  }
  hits.set(user, [...recent, now])
  return false
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max

/** Returns the report limited to the fields the widget sends, or null. The screenshot and any `user` field are dropped. */
function parseReport(body: unknown): Payload | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const ctx = b.context as Record<string, unknown> | undefined
  if (!str(b.comment, 4000) || !(b.comment as string).trim() || !str(b.createdAt, 100)) return null
  if (!ctx || typeof ctx !== 'object' || !str(ctx.url, 2000)) return null
  const t = b.target as Record<string, unknown> | undefined
  const target =
    t && str(t.selector, 2000) && str(t.tagName, 50)
      ? { selector: t.selector as string, tagName: t.tagName as string, text: str(t.text, 200) ? (t.text as string) : undefined }
      : undefined
  const vp = ctx.viewport as Record<string, unknown> | undefined
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => str(x, 500)).slice(0, 20) : undefined
  const failed = Array.isArray(ctx.failedRequests)
    ? ctx.failedRequests
        .filter(
          (r): r is { method: string; url: string; status: number } =>
            !!r && str(r.method, 20) && str(r.url, 2000) && typeof r.status === 'number',
        )
        .slice(0, 20)
    : undefined
  return {
    comment: b.comment as string,
    createdAt: b.createdAt as string,
    target,
    context: {
      url: ctx.url as string,
      viewport:
        vp && typeof vp.width === 'number' && typeof vp.height === 'number'
          ? { width: vp.width, height: vp.height }
          : undefined,
      userAgent: str(ctx.userAgent, 500) ? (ctx.userAgent as string) : undefined,
      consoleErrors: strings(ctx.consoleErrors),
      failedRequests: failed,
    },
  }
}

function github(path: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const token = process.env.UDD_GITHUB_TOKEN
  const repo = process.env.UDD_GITHUB_REPO ?? 'AgasiArgent/udd-accept-vite'
  if (!token) return Promise.reject(new Error('UDD_GITHUB_TOKEN is not set'))
  return fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'udd-accept-vite',
    },
  })
}

/** POST /api/feedback. Body parsing (3 MB limit) is done by the caller; `user` is the session email. */
export async function postFeedback(req: Request, res: Response, user: string) {
  const report = parseReport(req.body)
  if (!report) {
    res.status(400).json({ error: 'Invalid report.' })
    return
  }
  if (overLimit(user)) {
    res.status(429).json({ error: 'Too many reports. Try again later.' })
    return
  }
  try {
    const created = await github('/issues', { method: 'POST', body: JSON.stringify(renderIssue(report, user)) })
    if (!created.ok) throw new Error(`GitHub answered ${created.status}`)
    const { number } = (await created.json()) as { number: number }
    cache.delete(user)
    res.status(201).json({ id: String(number) })
  } catch (err) {
    console.error('feedback: could not create the issue', err)
    // No database: a report cannot be kept for a retry, so it is lost when GitHub is down.
    res.status(502).json({ error: 'Feedback could not be saved right now. Please try again.' })
  }
}

interface Row { id: number; title: string; status: string; statusKey: string; createdAt: string }
const cache = new Map<string, { at: number; rows: Row[] }>()

/** GET /api/feedback: the signed-in user's own reports with a status. Without a database the issues are the store. */
export async function listFeedback(res: Response, user: string) {
  const hit = cache.get(user)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    res.json({ reports: hit.rows })
    return
  }
  try {
    const r = await github('/issues?labels=feedback&state=all&per_page=100&sort=created&direction=desc')
    if (!r.ok) throw new Error(`GitHub answered ${r.status}`)
    const issues = (await r.json()) as {
      number: number; title: string; body: string | null; state: string; state_reason: string | null
      created_at: string; labels: { name: string }[]; pull_request?: unknown
    }[]
    const mine = reporterLine(user)
    const rows = issues
      .filter((i) => !i.pull_request && (i.body ?? '').split('\n').includes(mine))
      .map((i) => {
        const s = statusFromIssue({ labels: i.labels.map((l) => l.name), state: i.state, stateReason: i.state_reason })
        return { id: i.number, title: i.title.replace(/^\[feedback\]\s*/, ''), status: s.text, statusKey: s.key, createdAt: i.created_at }
      })
    cache.set(user, { at: Date.now(), rows })
    res.json({ reports: rows })
  } catch (err) {
    console.error('feedback: could not list issues', err)
    res.status(502).json({ error: 'Reports are unavailable right now.' })
  }
}
