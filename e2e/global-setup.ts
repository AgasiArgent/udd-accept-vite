import { request } from '@playwright/test'
import type { FullConfig } from '@playwright/test'

// Signs the test account in through the app's own login route and saves the session cookie.
// The Vercel bypass header goes only to the preview host, and only on this context, never to other hosts.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const email = process.env.UDD_TEST_USER_EMAIL
  const password = process.env.UDD_TEST_USER_PASSWORD
  if (!email || !password) throw new Error('UDD_TEST_USER_EMAIL and UDD_TEST_USER_PASSWORD must be set')

  const { UDD_PREVIEW_HOST: previewHost, UDD_PREVIEW_BYPASS: bypass } = process.env
  const headers: Record<string, string> =
    previewHost && bypass && new URL(baseURL).host === previewHost ? { 'x-vercel-protection-bypass': bypass } : {}

  const api = await request.newContext({ baseURL, extraHTTPHeaders: headers })
  const res = await api.post('/api/login', { data: { email, password } })
  if (!res.ok()) throw new Error(`test account sign-in failed: HTTP ${res.status()}`)
  await api.storageState({ path: 'e2e/.auth/state.json' })
  await api.dispose()
}
