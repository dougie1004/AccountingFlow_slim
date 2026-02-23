
import * as XLSX from 'xlsx';
import { generateFinancialHash, verifyFinancialSnapshot, VerificationReport } from './integrity';

/**
 * [STRATEGIC REIMPORT VERIFIER]
 * Orchestrates the "Reverse Verification" of exported financial documents.
 */
export class ReimportVerifier {
    /**
     * Parses an exported Excel file and verifies its internal cryptographic integrity.
     */
    static async verifyExcelIntegrity(buffer: ArrayBuffer): Promise<VerificationReport & { importedData: any[] }> {
        const workbook = XLSX.read(buffer, { type: 'array' });

        // 1. Extract Statement Data
        const statementSheet = workbook.Sheets["Statement"];
        if (!statementSheet) throw new Error("Missing 'Statement' sheet in export.");
        const importedData = XLSX.utils.sheet_to_json(statementSheet);

        // 2. Extract Metadata
        const metaSheet = workbook.Sheets["Integrity Metadata"];
        if (!metaSheet) throw new Error("Missing 'Integrity Metadata' sheet. Verification impossible.");
        const metaRows: any[][] = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });

        // Find Hash value
        const hashRow = metaRows.find(row => row[0] === "Hash (SHA-256)");
        const originalHash = hashRow ? hashRow[1] : null;

        if (!originalHash) throw new Error("Integrity Hash not found in metadata.");

        // 3. Re-calculate Hash
        const currentHash = await generateFinancialHash(importedData);

        const hashMatch = currentHash === originalHash;

        return {
            isValid: hashMatch,
            hashMatch,
            importedData,
            diffs: hashMatch ? [] : [{ field: 'Hash', original: originalHash, current: currentHash, delta: 0 }],
            timestamp: new Date().toISOString(),
            level: 'L3_HASH'
        };
    }

    /**
     * Performs a deep comparison between imported data and current engine state.
     * This is the "Industry Grade" check.
     */
    static compareWithLiveState(importedData: any[], currentState: any[]): VerificationReport {
        return verifyFinancialSnapshot(importedData, currentState);
    }
}
