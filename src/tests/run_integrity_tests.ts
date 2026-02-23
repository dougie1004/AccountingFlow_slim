
import { generateYearlyPack, generateThreeYearSimulation } from '../utils/mockDataGenerator';
import { FinancialIntegrityValidator } from './integrity_validator';
import { calculateFinancials } from '../bridge/StrategicBridge';
import * as fs from 'fs';
import * as path from 'path';

const BASELINE_DIR = path.join(process.cwd(), 'src', 'tests', 'baselines');
if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });

async function runScenarioTest(name: string, scenarioId: any, years: number[] = [2026, 2027]) {
    console.log(`\n🚀 Testing Scenario: ${name} (${scenarioId})`);

    // 1. Generate Data
    let ledger: any[] = [];
    let history: any[] = [];
    for (const year of years) {
        const pack = generateYearlyPack(year, history, scenarioId);
        ledger.push(...pack);
        history.push(...pack);
    }

    // 2. Layer 1: Trial Balance Integrity
    const l1 = FinancialIntegrityValidator.validateTrialBalance(ledger);
    if (!l1.isValid) {
        console.error(`❌ [L1 ERROR] ${l1.errors.join(', ')}`);
        process.exit(1);
    }
    console.log(`✅ [L1] Trial Balance Balanced (Precision Check passed)`);

    // 3. Layer 2: Statement Consistency
    const l2 = FinancialIntegrityValidator.validateStatements(ledger);
    if (!l2.isValid) {
        console.error(`❌ [L2 ERROR] ${l2.errors.join(', ')}`);
        process.exit(1);
    }
    console.log(`✅ [L2] Statement Identity & Linkage Verified (Error Margin: 0)`);

    // 4. Layer 3: Structural & Monthly Zero Drift Validation (Phase 4.5)
    // Checks "Opening + Movements = Closing" continuously across all months
    const l3 = FinancialIntegrityValidator.validateMonthlyZeroDrift(ledger);
    if (!l3.isValid) {
        console.error(`❌ [L3 ERROR] ${l3.errors.join(', ')}`);
        process.exit(1);
    }
    console.log(`✅ [L3] Monthly Zero Drift & Structural Integrity Verified (No Cumulation Leaks)`);

    // 5. Strategic Metrics Check
    const fin = calculateFinancials(ledger);
    console.log(`   - Net Income: ${fin.netIncome.toLocaleString()} KRW`);
    console.log(`   - Total Assets: ${fin.totalAssets.toLocaleString()} KRW`);

    // 6. [EVOLUTION] Structural Golden Baseline (Not just results, but internal distribution)
    const baselinePath = path.join(BASELINE_DIR, `${scenarioId}_baseline.json`);

    // Calculate Structural Fingerprint: Balance per Account category
    const accountDistribution: Record<string, number> = {};
    ledger.forEach(e => {
        accountDistribution[e.debitAccount] = (accountDistribution[e.debitAccount] || 0) + (e.amount || 0);
        accountDistribution[e.creditAccount] = (accountDistribution[e.creditAccount] || 0) - (e.amount || 0);
    });

    const currentSnapshot = {
        metrics: {
            revenue: fin.revenue,
            expenses: fin.expenses,
            netIncome: fin.netIncome,
            totalAssets: fin.totalAssets,
            totalLiabilities: fin.totalLiabilities
        },
        structure: {
            transactionCount: ledger.length,
            accountDistribution
        }
    };

    if (!fs.existsSync(baselinePath)) {
        console.log(`📝 [GOLDEN] Baseline not found. Saving structural snapshot as Golden Baseline.`);
        fs.writeFileSync(baselinePath, JSON.stringify(currentSnapshot, null, 2));
    } else {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const comparison = FinancialIntegrityValidator.compareWithBaseline(currentSnapshot, baseline);
        if (!comparison.isValid) {
            console.error(`❌ [GOLDEN ERROR] Structural Mismatch detected! (Engine Logic or Data shifted)`);
            comparison.errors.forEach(e => console.error(`   - ${e}`));
            process.exit(1);
        } else {
            console.log(`✅ [GOLDEN] Structural Match Verified (Internal Logic Identical)`);
        }
    }
}

async function start() {
    console.log(`\n════════════════════════════════════════════════════════`);
    console.log(`     FINANCIAL INTEGRITY AUTOMATION SUITE (v1.0)`);
    console.log(`════════════════════════════════════════════════════════`);

    try {
        await runScenarioTest("Hyper Growth Mode", "GROWTH");
        await runScenarioTest("Survival Burn Mode", "SURVIVAL");
        await runScenarioTest("Standard Operations", "STANDARD");
        await runScenarioTest("Death Valley Test", "DEATH_VALLEY");

        console.log(`\n✨ ALL INTEGRITY TESTS PASSED. FINANCIAL CONSTITUTION SECURED.`);
    } catch (err) {
        console.error(`\n💥 FATAL SYSTEM ERROR DURING INTEGRITY CHECK:`, err);
        process.exit(1);
    }
}

start();
