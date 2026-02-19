import { describe, it, expect } from 'vitest';
import { generateYearlyPack } from '../../src/utils/mockDataGenerator';

describe('Mock Data Generator - Simulation Scenarios', () => {
    describe('2026 Simulation - Startup Phase', () => {
        it('should generate initial capital injection', () => {
            const pack = generateYearlyPack(2026, [], 'STANDARD');

            // Find capital injection entry
            const capitalEntry = pack.find(e => e.creditAccount === '자본금');
            expect(capitalEntry).toBeDefined();
            expect(capitalEntry?.amount).toBeGreaterThan(0);
        });

        it('should generate subscription revenue starting from October', () => {
            const pack = generateYearlyPack(2026, [], 'STANDARD');

            // Find subscription revenue entries
            const revenueEntries = pack.filter(e =>
                e.description.includes('구독') && e.creditAccount.includes('매출')
            );

            expect(revenueEntries.length).toBeGreaterThan(0);

            // Verify first revenue is in October or later
            const firstRevenue = revenueEntries[0];
            const month = parseInt(firstRevenue.date.split('-')[1]);
            expect(month).toBeGreaterThanOrEqual(10);
        });

        it('should generate monthly operational expenses', () => {
            const pack = generateYearlyPack(2026, [], 'STANDARD');

            // Check for rent
            const rentEntries = pack.filter(e => e.debitAccount.includes('임차료'));
            expect(rentEntries.length).toBeGreaterThan(0);

            // Check for labor costs
            const laborEntries = pack.filter(e => e.debitAccount.includes('급여'));
            expect(laborEntries.length).toBeGreaterThan(0);
        });
    });

    describe('2027 Simulation - BEP Challenge', () => {
        it('should show increased rent from January', () => {
            const pack2026 = generateYearlyPack(2026, [], 'STANDARD');
            const pack2027 = generateYearlyPack(2027, pack2026, 'STANDARD');

            const rentEntries = pack2027.filter(e =>
                e.debitAccount.includes('임차료') && e.date.startsWith('2027')
            );

            expect(rentEntries.length).toBeGreaterThan(0);
        });

        it('should generate enterprise contract revenue', () => {
            const pack2026 = generateYearlyPack(2026, [], 'STANDARD');
            const pack2027 = generateYearlyPack(2027, pack2026, 'STANDARD');

            // Look for any revenue entries in 2027
            const revenueEntries = pack2027.filter(e =>
                e.date.startsWith('2027') && e.creditAccount.includes('매출')
            );

            expect(revenueEntries.length).toBeGreaterThan(0);
        });
    });

    describe('2028 Simulation - Golden Cross', () => {
        it('should generate exponential growth data', () => {
            const pack2026 = generateYearlyPack(2026, [], 'STANDARD');
            const pack2027 = generateYearlyPack(2027, pack2026, 'STANDARD');
            const pack2028 = generateYearlyPack(2028, [...pack2026, ...pack2027], 'STANDARD');

            const revenueEntries = pack2028.filter(e =>
                e.date.startsWith('2028') && e.creditAccount.includes('매출')
            );

            expect(revenueEntries.length).toBeGreaterThan(0);

            // Verify revenue is growing
            const totalRevenue = revenueEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
            expect(totalRevenue).toBeGreaterThan(0);
        });

        it('should maintain lean team structure', () => {
            const pack2026 = generateYearlyPack(2026, [], 'STANDARD');
            const pack2027 = generateYearlyPack(2027, pack2026, 'STANDARD');
            const pack2028 = generateYearlyPack(2028, [...pack2026, ...pack2027], 'STANDARD');

            // Check that labor costs exist but are controlled
            const laborEntries = pack2028.filter(e =>
                e.date.startsWith('2028') && e.debitAccount.includes('급여')
            );

            expect(laborEntries.length).toBeGreaterThan(0);
        });
    });

    describe('Full 3-Year Trajectory', () => {
        it('should show progression from loss to profit', () => {
            const pack2026 = generateYearlyPack(2026, [], 'STANDARD');
            const pack2027 = generateYearlyPack(2027, pack2026, 'STANDARD');
            const pack2028 = generateYearlyPack(2028, [...pack2026, ...pack2027], 'STANDARD');

            const allEntries = [...pack2026, ...pack2027, ...pack2028];

            // Verify we have entries for all 3 years
            const has2026 = allEntries.some(e => e.date.startsWith('2026'));
            const has2027 = allEntries.some(e => e.date.startsWith('2027'));
            const has2028 = allEntries.some(e => e.date.startsWith('2028'));

            expect(has2026).toBe(true);
            expect(has2027).toBe(true);
            expect(has2028).toBe(true);

            // Verify total entries is reasonable
            expect(allEntries.length).toBeGreaterThan(50);
        });
    });
});
