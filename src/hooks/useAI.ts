import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Partner, AnalysisResponse } from '../types';
import { simulateAIParsing } from '../utils/mockDataGenerator';

// Check if running in Tauri environment (Desktop App)
const isTauri = () => typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

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

        // Web/Vercel Simulation Mode: Triggered only when NOT in the desktop app
        if (!isTauri()) {
            console.warn('Web Preview Mode: Simulating analysis...');
            return new Promise((resolve) => {
                setTimeout(() => {
                    const mockTx = simulateAIParsing({
                        description: input,
                        date: new Date().toISOString().split('T')[0]
                    });

                    const response: AnalysisResponse = {
                        transaction: {
                            ...mockTx,
                            entryType: mockTx.type,
                            accountName: mockTx.debitAccount, // Mapping for UI display
                            confidence: 'High',
                            reasoning: 'Web Preview: This simulation demonstrates the UI flow. Install the Desktop App for real Gemini AI analysis with Korean OCR support.'
                        },
                        vendorStatus: 'Matched',
                        complianceReview: {
                            status: 'Safe',
                            message: 'Web Preview Advisory: In the desktop version, this would be analyzed against full Korean tax laws and local accounting standards.'
                        }
                    };
                    setIsParsing(false);
                    resolve(response);
                }, 1500);
            });
        }

        // --- Original Desktop Logic (Unmodified) ---
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
            return null;
        } finally {
            setIsParsing(false);
        }
    };

    const chatWithCompliance = async (
        userMessage: string,
        currentTx: any,
        policy: string
    ): Promise<AnalysisResponse | null> => {
        setIsParsing(true);
        setError(null);

        if (!isTauri()) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const response: AnalysisResponse = {
                        transaction: currentTx,
                        vendorStatus: 'Matched',
                        complianceReview: {
                            status: 'Safe',
                            message: `[Web Preview] You asked: "${userMessage}". In the desktop app, the Compliance AI would provide specific tax advice based on your ledger history.`
                        }
                    };
                    setIsParsing(false);
                    resolve(response);
                }, 1000);
            });
        }

        try {
            const result = await invoke<AnalysisResponse>('chat_with_compliance', {
                userMessage,
                currentTx,
                policy
            });
            return result;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setError(errMsg);
            return null;
        } finally {
            setIsParsing(false);
        }
    };

    return { parseTransaction, chatWithCompliance, isParsing, error };
}
