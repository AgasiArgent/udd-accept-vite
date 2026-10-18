import { test as base } from '@playwright/test'

// Every test imports { test, expect } from here.
// The bypass secret is added only to requests whose host equals UDD_PREVIEW_HOST.
const { UDD_PREVIEW_HOST: host, UDD_PREVIEW_BYPASS: secret } = process.env
export const test = base.extend({
  context: async ({ context }, provide) => {
    if (host && secret) {
      await context.route(
        (u) => u.host === host,
        (r) => r.continue({ headers: { ...r.request().headers(), 'x-vercel-protection-bypass': secret } }),
      )
    }
    await provide(context)
  },
})
export { expect } from '@playwright/test'
