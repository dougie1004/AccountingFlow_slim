import { defineConfig, devices } from '@playwright/test';

// Type declaration for process (Node.js global)
declare const process: { env: { [key: string]: string | undefined } };

/**
 * Playwright Configuration for AccountingFlow (Tauri App)
 * 
 * Purpose: E2E testing for financial simulation and liability management features
 * Environment: Vite dev server (localhost:1420 for Tauri)
 */
export default defineConfig({
    testDir: './tests/e2e',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:1420',

        /* Show browser window during test execution (helpful for debugging) */
        headless: false,

        /* Viewport size */
        viewport: { width: 1280, height: 720 },

        /* Ignore HTTPS errors (for local dev) */
        ignoreHTTPSErrors: true,

        /* Bypass Content Security Policy (needed for financial data testing) */
        bypassCSP: true,

        /* Custom User Agent to avoid bot detection */
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Record video on first retry */
        video: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Maximum time each action can take */
        actionTimeout: 10000,

        /* Maximum time each navigation can take */
        navigationTimeout: 30000,
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Additional Chromium-specific settings
                launchOptions: {
                    args: [
                        '--disable-web-security', // For CORS issues in local dev
                        '--disable-features=IsolateOrigins,site-per-process', // For iframe testing
                    ]
                }
            },
        },

        // Uncomment if you want to test on Firefox/Safari
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:1420',
        reuseExistingServer: !process.env.CI,
        timeout: 120000, // 2 minutes for Vite to start
    },
});
