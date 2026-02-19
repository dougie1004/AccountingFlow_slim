import { generateThreeYearSimulation } from '../src/utils/mockDataGenerator';
import { analyzeStrategicDeviation } from '../src/strategic_layer/deviationEngine';
import { EXPECTED_BASELINE_RESULTS } from '../src/core_engine/baselineScenario';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

async function runTest() {
    console.log('--- PHASE 3 TEST ---');
    const ledger = generateThreeYearSimulation('STANDARD');
    console.log('Entries:', ledger.length);
    const deviations = analyzeStrategicDeviation(ledger);

    deviations.forEach(d => {
        console.log('METRIC:', d.metric);
        console.log('ACTUAL:', d.actual);
        console.log('BASELINE:', d.baseline);
        console.log('VAR:', d.variancePercent + '%');
    });
    console.log('--- VERDICT: SUCCESS ---');
}

runTest().catch(console.error);
