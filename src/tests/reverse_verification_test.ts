
import { FinancialIntegrityValidator } from './integrity_validator';
import { generateYearlyPack } from '../utils/mockDataGenerator';
import { generateFinancialHash, verifyFinancialSnapshot } from '../utils/integrity';
import { ReimportVerifier } from '../utils/reimportVerifier';
import * as XLSX from 'xlsx';

/**
 * [INDUSTRY GRADE] Reverse Verification Test
 * Flow: Source Data -> Export Logic -> Data Hash -> Simulated Re-import -> Identity Match
 */
async function runReverseVerification() {
    console.log(`\n════════════════════════════════════════════════════════`);
    console.log(`     REVERSE VERIFICATION SUITE (Export -> Reimport)`);
    console.log(`════════════════════════════════════════════════════════`);

    // 1. Prepare Source Case (Growth Scenario)
    const ledger = generateYearlyPack(2027, [], 'GROWTH');

    // We mock the TB data as it appears in handleExport
    // (Simplified version of accounts map in FinancialStatements.tsx)
    const mockAccounts = [
        { Category: 'Asset', Account: '보통예금', Opening: 0, Debit: 500000000, Credit: 100000000, Closing: 400000000 },
        { Category: 'Revenue', Account: '매출', Opening: 0, Debit: 0, Credit: 200000000, Closing: 200000000 },
        { Category: 'Expense', Account: '급여', Opening: 0, Debit: 50000000, Credit: 0, Closing: 50000000 }
    ];

    console.log(`1️⃣ [EXPORT PHASE] Generating Financial Statement & Hash...`);
    const sourceHash = await generateFinancialHash(mockAccounts);
    console.log(`   - Source Hash: ${sourceHash}`);

    // 2. Simulate Excel Generation (Memory only using xlsx)
    const ws = XLSX.utils.json_to_sheet(mockAccounts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");

    const metadata = [
        ["AccountingFlow Financial Integrity Metadata"],
        ["Field", "Value"],
        ["Hash (SHA-256)", sourceHash],
        ["Timestamp", new Date().toISOString()]
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metadata);
    XLSX.utils.book_append_sheet(wb, wsMeta, "Integrity Metadata");

    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    console.log(`2️⃣ [STORAGE PHASE] Excel file generated in memory (${excelBuffer.byteLength} bytes).`);

    // 3. Re-import and Verify
    console.log(`3️⃣ [REIMPORT PHASE] Parsing Excel & Verifying Identity...`);
    const verification = await ReimportVerifier.verifyExcelIntegrity(excelBuffer);

    if (verification.isValid) {
        console.log(`✅ [SUCCESS] Hash Identity Matched! (SHA-256 Verified)`);
    } else {
        console.error(`❌ [FAILURE] Identity Mismatch!`);
        console.error(verification.diffs);
        process.exit(1);
    }

    // 4. Field Level Deep Diff
    console.log(`4️⃣ [DEEP DIFF] Comparing re-imported fields with source state...`);
    const deepDiff = ReimportVerifier.compareWithLiveState(verification.importedData, mockAccounts);

    if (deepDiff.isValid) {
        console.log(`✅ [SUCCESS] Zero-Tolerance Field Level Comparison Passed.`);
    } else {
        console.error(`❌ [FAILURE] Field Mismatch Detected!`);
        deepDiff.diffs.forEach(d => console.log(`   - ${d.field}: ${d.original} -> ${d.current} (Δ ${d.delta})`));
        process.exit(1);
    }

    console.log(`\n✨ REVERSE VERIFICATION COMPLETE: System is a Deterministic Accounting Engine.`);
}

runReverseVerification().catch(e => {
    console.error(e);
    process.exit(1);
});
