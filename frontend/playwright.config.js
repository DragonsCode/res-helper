import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = path.dirname(fileURLToPath(import.meta.url))
const backend = path.resolve(frontend, '../backend')
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath, args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'uv run --frozen alembic upgrade head && uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8001',
      cwd: backend,
      url: 'http://127.0.0.1:8001/api/health',
      env: {
        DATABASE_URL: 'sqlite:///./.data/e2e.db',
        ALLOWED_ORIGINS: '["http://127.0.0.1:5174"]',
        UV_CACHE_DIR: path.resolve(backend, '.data/uv-cache'),
        DEMO_ENABLED: 'true',
        ENVIRONMENT: 'development',
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174',
      cwd: frontend,
      url: 'http://127.0.0.1:5174',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:8001' },
      reuseExistingServer: false,
    },
  ],
})
