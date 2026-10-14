import { defineConfig, devices } from '@playwright/test';

if (process.argv.some((arg) => arg === '--project' || arg.startsWith('--project='))) {
  process.env['E2E_ALL_BROWSERS'] = 'true';
}

const isCI = Boolean(process.env['CI']);
const isAllBrowsers = isCI || Boolean(process.env['E2E_ALL_BROWSERS']);

const allProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];

export default defineConfig({
  testDir: './projects/demo/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure' },
  projects: isAllBrowsers ? allProjects : [allProjects[0]],
  webServer: {
    command: 'pnpm exec ng serve demo --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
