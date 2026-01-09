import { invoke } from '@tauri-apps/api/core';
import { ParsedTransaction } from '../types';

/**
 * Mass AI Processing Hook
 * Processes large batches of transactions using parallel AI engine
 */
export const useMassProcessor = () => {
    const processMassBatch = async (
        transactions: ParsedTransaction[],
        policy: string = "Default Accounting Policy: Accrual Basis, SME Asset Threshold 1M KRW"
    ): Promise<ParsedTransaction[]> => {
        try {
            const result = await invoke<ParsedTransaction[]>('process_mass_ai_batch', {
                transactions,
                policy
            });
            return result;
        } catch (error) {
            console.error('Mass AI Processing Error:', error);
            throw error;
        }
    };

    return { processMassBatch };
};
