import { test, expect } from '@playwright/test';

test.describe('Constitutional Journal Numbering', () => {
    test('should generate compliant journal numbers and atomic sequences', async ({ page }) => {
        // 1. Initialize
        console.log('Visiting Dashboard...');
        await page.goto('http://localhost:1420');

        // Clear State
        console.log('Clearing local storage...');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('last_active_tab', 'dashboard');
        });
        await page.reload();
        await page.waitForTimeout(1000); // Wait for hydration

        // 2. Trigger Simulation
        page.on('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        console.log('Clicking Phase 1 Scenario button...');
        const seedBtn = page.getByRole('button', { name: 'Phase 1 시나리오' });
        await expect(seedBtn).toBeVisible();
        await seedBtn.click();

        // 3. Wait for processing
        await page.waitForTimeout(3000);

        // 4. Navigate to Journal
        console.log('Navigating to Journal page...');
        // Handle strict mode violation by picking first visible
        await page.locator('text=분개 전표 (Journal)').first().click();

        // 5. Verify Journal Entries
        console.log('Verifying Journal Entries...');
        await page.waitForSelector('table tbody tr');

        // Fetch data from LocalStorage
        const ledger = await page.evaluate(() => {
            const data = localStorage.getItem('accounting_ledger');
            return data ? JSON.parse(data) : [];
        });

        console.log(`Total Ledger Size: ${ledger.length}`);
        expect(ledger.length).toBeGreaterThan(0);

        // Checking Feb 2023 (likely to have data)
        const sampleMonth = ledger[0].date.substring(0, 7) || '2023-01';
        const targetEntries = ledger.filter((e: any) => e.date.startsWith(sampleMonth));
        targetEntries.sort((a: any, b: any) => a.sequenceNumber - b.sequenceNumber);

        console.log(`Checking entries for month: ${sampleMonth} (Count: ${targetEntries.length})`);

        // VALIDATIONS
        expect(targetEntries.length).toBeGreaterThan(0);
        const first = targetEntries[0];
        const second = targetEntries[1];

        console.log('First Entry:', first);

        // Regex Check: JE-YYYYMM-NNNN
        const expectedPrefix = `JE-${sampleMonth.replace('-', '')}-`;
        expect(first.journalNumber).toContain(expectedPrefix);
        expect(first.journalNumber).toMatch(/\d{4}$/); // ends with 4 digits
        expect(first.sequenceNumber).toBe(1);

        if (second) {
            expect(second.journalNumber).toContain(expectedPrefix);
            expect(second.sequenceNumber).toBe(2);
        }

        console.log('✅ TEST PASSED: Numbers are sequential and correctly formatted.');
    });
});
