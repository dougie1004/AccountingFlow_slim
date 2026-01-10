import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Partner, AnalysisResponse } from '../types';

// Check if running in Tauri environment (Desktop App)
const isTauri = () => typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE";

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

        if (!isTauri()) {
            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'parse',
                        payload: { input, policy, imageBytes, imageMime }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'AI 분석 서버 오류');
                }

                const parsedTx = await response.json();

                const result: AnalysisResponse = {
                    transaction: {
                        ...parsedTx,
                        entryType: parsedTx.entryType
                    },
                    vendorStatus: 'Matched',
                    complianceReview: {
                        status: 'Safe',
                        message: parsedTx.reasoning || '분석이 완료되었습니다.'
                    }
                };

                return result;
            } catch (err: any) {
                setError(err.message || 'AI 분석 중 오류가 발생했습니다.');
                return null;
            } finally {
                setIsParsing(false);
            }
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
            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'chat',
                        payload: { userMessage, currentTx, policy }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '상담 서버 오류');
                }

                const result = await response.json();
                return result;
            } catch (err: any) {
                setError(err.message || '상담 중 오류가 발생했습니다.');
                return null;
            } finally {
                setIsParsing(false);
            }
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
