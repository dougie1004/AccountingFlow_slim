import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Partner, AnalysisResponse } from '../types';

export function useAI() {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseTransaction = async (
        input: string,
        policy: string,
        partners: Partner[],
        tenantId: string,
        tier: string,
        imageBytes?: number[],
        imageMime?: string
    ): Promise<AnalysisResponse | null> => {
        setIsParsing(true);
        setError(null);
        try {
            const result = await invoke<AnalysisResponse>('parse_transaction', {
                input,
                imageBytes: imageBytes || null,
                imageMime: imageMime || null,
                policy,
                partners,
                tenantId,
                tier
            });
            return result;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setError(errMsg);
            console.error('AI Parsing Error:', errMsg);
            return null;
        } finally {
            setIsParsing(false);
        }
    };

    return { parseTransaction, isParsing, error };
}
