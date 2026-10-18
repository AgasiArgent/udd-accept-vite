import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts', // signs in with UDD_TEST_USER_*, saves e2e/.auth/state.json
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    storageState: 'e2e/.auth/state.json',
  },
})
