# E2E Testing Guide for AccountingFlow

## Overview
This directory contains end-to-end tests for the AccountingFlow application using Playwright.

## Prerequisites
- Node.js installed
- Playwright installed (`@playwright/test` in devDependencies)
- Vite dev server running on `http://localhost:1420`

## Running Tests

### 1. Run all tests (headless mode)
```bash
npm run test:e2e
```

### 2. Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### 3. Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### 4. Debug tests
```bash
npm run test:e2e:debug
```

## Test Suites

### Liability Engine Tests (`liability-engine.spec.ts`)
Tests for Phase 11 liability management features:
- ✅ Liability alert banner display
- ✅ Expandable liability list
- ✅ Navigation to journal from liability items
- ✅ Simulation data loading (2026, 2027, 2028)
- ✅ Runway calculation verification
- ✅ PremiumDatePicker in ReviewLiabilityModal

## Configuration

### Playwright Config (`playwright.config.ts`)
Key settings for AccountingFlow testing:

```typescript
{
  headless: false,           // Show browser during tests
  bypassCSP: true,           // Bypass Content Security Policy
  ignoreHTTPSErrors: true,   // Ignore HTTPS errors in local dev
  userAgent: '...',          // Custom UA to avoid bot detection
  viewport: { width: 1280, height: 720 }
}
```

### Browser Settings
- **Chromium**: Default browser with web security disabled for local testing
- **Firefox/Safari**: Available but commented out (uncomment in config if needed)

## Troubleshooting

### Browser not opening
If the browser doesn't open during tests:
1. Check that `headless: false` is set in `playwright.config.ts`
2. Ensure Playwright browsers are installed: `npx playwright install`

### CSP Errors
If you encounter Content Security Policy errors:
- Verify `bypassCSP: true` is enabled in the config
- Check that the custom user agent is set

### Port Issues
If `localhost:1420` is not accessible:
1. Ensure Tauri dev server is running: `npm run tauri dev`
2. Check that the port is not blocked by firewall
3. Verify `webServer.url` in `playwright.config.ts` matches your dev server

## Writing New Tests

Example test structure:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Your test code here
    const element = page.locator('text=Something');
    await expect(element).toBeVisible();
  });
});
```

## CI/CD Integration
Tests are configured to run in CI environments with:
- Retry on failure (2 retries)
- Sequential execution (no parallel)
- HTML reporter for results

## Resources
- [Playwright Documentation](https://playwright.dev/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)
- [AccountingFlow Phase 11 Plan](../../docs/PHASE_11_PLAN.md)
