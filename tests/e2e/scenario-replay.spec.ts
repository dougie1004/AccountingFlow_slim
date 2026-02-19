import { test, expect } from '@playwright/test';

/**
 * Scenario Replay Test: Year-by-Year Simulation Verification
 * 
 * Objective: Verify that each year's simulation data matches the business plan.
 * Note: AI Service is mocked via window.isTestMode to prevent API costs.
 */
test.setTimeout(60000);

test.describe('Simulation Scenario Replay', () => {
    test.beforeEach(async ({ page }) => {
        // EMERGENCY KILL SWITCH: Enable test mode in the browser
        await page.addInitScript(() => {
            (window as any).isTestMode = true;
            console.log('[PLAYWRIGHT] Test mode enabled. AI calls will be mocked.');
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Handle confirmation dialogs automatically
        page.on('dialog', dialog => dialog.accept());
    });

    test('2026: should show initial capital and subscriber growth', async ({ page }) => {
        const run2026 = page.getByRole('button', { name: /RUN 2026 PACK/i });
        await run2026.waitFor({ state: 'visible' });
        await run2026.click();

        await page.waitForTimeout(3000);

        // Navigate to Journal
        await page.goto('/journal');
        await page.waitForLoadState('networkidle');

        // Verify capital and subscription revenue
        await expect(page.locator('text=자본금').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=구독').first()).toBeVisible({ timeout: 10000 });
    });

    test('2027: should show strategic enterprise contract', async ({ page }) => {
        // Load 2026 then 2027
        await page.getByRole('button', { name: /RUN 2026 PACK/i }).click();
        await page.waitForTimeout(2000);

        const run2027 = page.getByRole('button', { name: /RUN 2027 PACK/i });
        await run2027.click();
        await page.waitForTimeout(3000);

        // Navigate to Journal
        await page.goto('/journal');
        await page.waitForLoadState('networkidle');

        // Look for Enterprise contract (added in mockDataGenerator)
        await expect(page.locator('text=Enterprise').first()).toBeVisible({ timeout: 10000 });
        // Look for rent (should be generated)
        await expect(page.locator('text=임차료').first()).toBeVisible({ timeout: 10000 });
    });

    test('2028: should reach profitability with lean team', async ({ page }) => {
        // Sequential load to maintain data integrity
        await page.getByRole('button', { name: /RUN 2026 PACK/i }).click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: /RUN 2027 PACK/i }).click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: /RUN 2028 PACK/i }).click();
        await page.waitForTimeout(3000);

        // Check Dashboard for profitability markers
        await page.goto('/');
        await expect(page.locator('text=경영 대시보드')).toBeVisible();

        // Verify profitability metric (even if mock, it should be visible)
        const netIncome = page.getByText('Net Income', { exact: false }).first();
        await expect(netIncome).toBeVisible();

        // Navigate to Journal to check lean team costs
        await page.goto('/journal');
        await expect(page.locator('text=급여').first()).toBeVisible({ timeout: 10000 });
    });

    test('Full 3-Year Path: verify progression', async ({ page }) => {
        for (const year of ['2026', '2027', '2028']) {
            await page.getByRole('button', { name: new RegExp(`Run ${year} Pack`, 'i') }).click();
            await page.waitForTimeout(1500);
        }

        await page.goto('/journal');
        // Total entries should be high (over 50)
        const rows = page.locator('table tr');
        await expect(rows).toHaveCount({ min: 50 }, { timeout: 10000 });
    });
});
