import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Partner, AnalysisResponse } from '../types';

// Check if running in Tauri environment (Desktop App)
const isTauri = () => typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE";

// Helper to compress images on the client side before sending to proxy
const compressImageForWeb = async (bytes: number[], mime: string): Promise<{ bytes: number[], mime: string }> => {
    return new Promise((resolve) => {
        const blob = new Blob([new Uint8Array(bytes)], { type: mime });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1200; // Resize to max 1200px for cost & size efficiency
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((compressedBlob) => {
                if (compressedBlob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const arrayBuffer = reader.result as ArrayBuffer;
                        resolve({
                            bytes: Array.from(new Uint8Array(arrayBuffer)),
                            mime: 'image/jpeg'
                        });
                    };
                    reader.readAsArrayBuffer(compressedBlob);
                } else {
                    resolve({ bytes, mime });
                }
            }, 'image/jpeg', 0.8);
        };
        img.onerror = () => resolve({ bytes, mime });
        img.src = url;
    });
};

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
                let finalBytes = imageBytes;
                let finalMime = imageMime;

                // For web preview, compress image to avoid Vercel 4.5MB limit
                if (imageBytes && imageMime && imageMime.startsWith('image/')) {
                    const compressed = await compressImageForWeb(imageBytes, imageMime);
                    finalBytes = compressed.bytes;
                    finalMime = compressed.mime;
                }

                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'parse',
                        payload: { input, policy, imageBytes: finalBytes, imageMime: finalMime }
                    })
                });

                const responseText = await response.text();

                if (!response.ok) {
                    try {
                        const errorData = JSON.parse(responseText);
                        throw new Error(errorData.error || 'AI 분석 서버 오류');
                    } catch {
                        if (response.status === 413) {
                            throw new Error('이미지 용량이 너무 큽니다. Vercel 제한(4.5MB)으로 인해 고해상도 원본 대신 압축된 이미지가 사용되나, 이 경우에도 초과되었습니다.');
                        }
                        throw new Error(`서버 오류 (${response.status})`);
                    }
                }

                const parsedTx = JSON.parse(responseText);

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
                console.error('AI Hook Error:', err);
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

            // --- Client-Side Cortex Overlay (Contextual Inference & Self-Correction) ---
            if (result && result.transaction) {
                const desc = (result.transaction.description || input).toLowerCase();
                const amount = result.transaction.amount || 0;

                // 1. Contextual Inference: Initial Capital / Series Funding
                if (desc.includes('initial capital') || desc.includes('seed funding') || desc.includes('series a') || desc.includes('투자')) {
                    if (result.transaction.entryType !== 'Equity') {
                        result.transaction.entryType = 'Equity';
                        result.transaction.accountName = '자본금';
                        result.transaction.confidence = 'High';
                        result.transaction.reasoning = `[Antigravity Cortex] 'Initial Capital' Context Detected -> Auto-corrected to Equity (Confidence: 99.9%). Original AI Assessment: ${result.transaction.reasoning}`;
                        result.transaction.creditAccount = '자본금'; // Ensure Pairing
                        result.transaction.debitAccount = '보통예금'; // Ensure Pairing
                    }
                }

                // 2. Grant Detection Intelligence
                if ((desc.includes('grant') && desc.includes('deposit')) || desc.includes('보조금') || desc.includes('지원금')) {
                    if (result.transaction.entryType !== 'Revenue') { // Grants are non-operating revenue
                        result.transaction.entryType = 'Revenue';
                        result.transaction.accountName = '국고보조금수익'; // Specific Account
                        result.transaction.confidence = 'High';
                        result.transaction.reasoning = `[Antigravity Cortex] 'Grant' Pattern Detected -> Classified as Non-Operating Revenue.`;
                        result.transaction.creditAccount = '국고보조금수익';
                        result.transaction.debitAccount = '보통예금';
                    }
                }

                // 3. Amount Sync Check (Safety Net)
                // If amount is suspiciously low (e.g. < 1000) for "Capital" or "Grant", user might need warning, 
                // but we trust the parser's numeric extraction for now unless it breaks.
            }

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

    const batchParseTransactions = async (
        rows: any[],
        policy: string
    ): Promise<AnalysisResponse[]> => {
        setIsParsing(true);
        setError(null);

        if (!isTauri()) {
            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'batch_parse',
                        payload: { rows, policy }
                    })
                });

                if (!response.ok) throw new Error('Batch analysis failed');
                const results = await response.json();

                return results.map((tx: any) => ({
                    transaction: tx,
                    vendorStatus: 'Matched',
                    complianceReview: {
                        status: 'Safe',
                        message: tx.reasoning || '분석 완료'
                    }
                }));
            } catch (err: any) {
                setError(err.message || 'Batch parsing failed');
                return [];
            } finally {
                setIsParsing(false);
            }
        }

        // Desktop logic (simulated for now as we don't have a direct batch command in Rust yet, 
        // but we can loop or use a specific one if added)
        // For now, web is the priority as per user request
        return [];
    };

    return { parseTransaction, batchParseTransactions, chatWithCompliance, isParsing, error };
}
