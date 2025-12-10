import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'yarn run build && yarn run preview',
    port: 4173,
  },
  testDir: 'e2e',
})
