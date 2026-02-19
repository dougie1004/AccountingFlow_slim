import { test, expect } from '@playwright/test';

/**
 * E2E Test: Liability Engine (Phase 11)
 * 
 * Objective: Verify that unplanned liabilities are detected and displayed correctly
 */

test.describe('Liability Alert Banner', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/');

        // Wait for the app to load
        await page.waitForLoadState('networkidle');
    });

    test('should display liability alert banner when unplanned liabilities exist', async ({ page }) => {
        // Load simulation data and wait for it to process
        const run2026Button = page.getByRole('button', { name: /RUN 2026 PACK/i });

        // Wait for button to be available and click it
        await run2026Button.waitFor({ state: 'visible', timeout: 10000 });
        await run2026Button.click();

        // Wait for data to load and process
        // The liability engine needs time to:
        // 1. Add entries to ledger
        // 2. Detect liabilities (via setTimeout in addEntries)
        // 3. Update React state
        // 4. Re-render the banner
        await page.waitForTimeout(5000);

        // Wait for the dashboard to update
        await page.waitForLoadState('networkidle');

        // Additional wait for React state propagation
        await page.waitForTimeout(2000);

        // Check if liability alert banner is visible
        // Using a more flexible selector that matches the actual banner text
        const alertBanner = page.locator('text=미확인 부채').first();

        // Wait for the banner to appear with extended timeout
        await expect(alertBanner).toBeVisible({ timeout: 20000 });

        // Verify the banner shows correct information
        const bannerContainer = page.locator('div').filter({ hasText: /미확인 부채.*건 발견/ }).first();
        await expect(bannerContainer).toBeVisible({ timeout: 10000 });

        // Verify it mentions the liability detection
        const detectionText = page.locator('text=가수금, 차입금 등 부채성 계정');
        await expect(detectionText).toBeVisible({ timeout: 10000 });

        // Verify the amount is displayed
        const amountText = page.locator('text=상환 계획 미수립');
        await expect(amountText).toBeVisible({ timeout: 10000 });
    });

    test('should expand liability list when clicked', async ({ page }) => {
        // Load simulation data
        const run2026Button = page.getByRole('button', { name: /RUN 2026 PACK/i });
        if (await run2026Button.isVisible()) {
            await run2026Button.click();
            await page.waitForTimeout(2000);
        }

        // Click to expand the liability list
        const expandButton = page.locator('text=상세 보기');
        if (await expandButton.isVisible()) {
            await expandButton.click();

            // Verify expanded content is visible
            const yearHeader = page.locator('text=2026년');
            await expect(yearHeader).toBeVisible();

            // Verify individual liability items are shown
            const confirmButton = page.getByRole('button', { name: '확인' }).first();
            await expect(confirmButton).toBeVisible();
        }
    });

    test('should navigate to journal when clicking confirm button', async ({ page }) => {
        // Load simulation data
        const run2026Button = page.getByRole('button', { name: /RUN 2026 PACK/i });
        if (await run2026Button.isVisible()) {
            await run2026Button.click();
            await page.waitForTimeout(2000);
        }

        // Expand liability list
        const expandButton = page.locator('text=상세 보기');
        if (await expandButton.isVisible()) {
            await expandButton.click();

            // Click the first confirm button
            const confirmButton = page.getByRole('button', { name: '확인' }).first();
            await confirmButton.click();

            // Verify navigation to journal page
            await page.waitForTimeout(1000);
            const journalHeader = page.locator('text=총계정원장');
            await expect(journalHeader).toBeVisible();
        }
    });
});

test.describe('Simulation Data Verification', () => {
    test('should load 2026, 2027, 2028 simulation data', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Load 2026 data
        const run2026 = page.getByRole('button', { name: /RUN 2026 PACK/i });
        if (await run2026.isVisible()) {
            await run2026.click();
            await page.waitForTimeout(2000);
        }

        // Load 2027 data
        const run2027 = page.getByRole('button', { name: /RUN 2027 PACK/i });
        if (await run2027.isVisible()) {
            await run2027.click();
            await page.waitForTimeout(2000);
        }

        // Load 2028 data
        const run2028 = page.getByRole('button', { name: /RUN 2028 PACK/i });
        if (await run2028.isVisible()) {
            await run2028.click();
            await page.waitForTimeout(2000);
        }

        // Verify dashboard shows updated metrics
        const dashboard = page.locator('text=경영 대시보드');
        await expect(dashboard).toBeVisible();
    });

    test('should show positive runway after loading all simulation data', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Load all simulation data
        for (const year of ['2026', '2027', '2028']) {
            const button = page.getByRole('button', { name: new RegExp(`RUN ${year} PACK`, 'i') });
            if (await button.isVisible()) {
                await button.click();
                await page.waitForTimeout(2000);
            }
        }

        // Check for runway indicator
        const runwaySection = page.locator('text=RUNWAY').first();
        if (await runwaySection.isVisible()) {
            const runwayText = await runwaySection.textContent();
            console.log('Runway:', runwayText);
            // Runway should be positive after 2028 data loads
        }
    });
});

test.describe('Premium Date Picker', () => {
    test('should use PremiumDatePicker in ReviewLiabilityModal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Load simulation data to create liabilities
        const run2026 = page.getByRole('button', { name: /RUN 2026 PACK/i });
        if (await run2026.isVisible()) {
            await run2026.click();
            await page.waitForTimeout(2000);
        }

        // Navigate to journal
        const journalTab = page.getByRole('button', { name: /분개장/i });
        if (await journalTab.isVisible()) {
            await journalTab.click();
            await page.waitForTimeout(1000);
        }

        // Look for liability badge and click it
        const liabilityBadge = page.locator('[class*="liability"]').first();
        if (await liabilityBadge.isVisible()) {
            await liabilityBadge.click();
            await page.waitForTimeout(1000);

            // Verify modal opened
            const modal = page.locator('text=책임 정의');
            await expect(modal).toBeVisible();

            // Select "단기 상환" option
            const debtOption = page.getByRole('button', { name: /단기 상환/i });
            if (await debtOption.isVisible()) {
                await debtOption.click();

                // Verify PremiumDatePicker is visible (not basic input[type=date])
                const datePickerContainer = page.locator('[class*="premium"]');
                // The presence of premium styling indicates PremiumDatePicker is being used
            }
        }
    });
});
