import { defineConfig, devices, ReporterDescription } from '@playwright/test';
import { env } from './src/core/config/env';

const summary: ReporterDescription = ['./src/core/reporters/failure-summary.reporter.ts'];
const isCI = !!process.env.CI;
const isShard = !!process.env.PW_SHARD; // en CI con shards: cada runner emite "blob" y un job final los une

const reporter: ReporterDescription[] = isShard
  ? [['blob'], ['github']]
  : isCI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'reports/junit.xml' }], summary]
    : [['list'], ['html', { open: 'never' }], summary];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // cada test usa su propia sesión (ver fixtures), por eso es seguro
  workers: isCI ? 2 : undefined,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI, // falla el pipeline si alguien deja un test.only
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter,
  use: {
    baseURL: env.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Solo levanta la app si START_APP=true (por defecto GAD lo levantás vos).
  webServer: env.startApp
    ? {
        command: env.appStartCommand,
        url: `${env.baseUrl}/api/health`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    { name: 'api', testMatch: /.*\.api\.spec\.ts/ },
    { name: 'ui', testMatch: /.*\.ui\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
});
