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
                const prompt = `당신은 숙련된 공인회계사(KICPA)이자 SME 전문 세무 조력자입니다. 사용자의 텍스트 입력과 증빙을 분석하여 '세무 신고'가 가능한 수준의 정교한 전표를 생성하세요.

 핵심 계정과목 가이드라인 (accountName에 반드시 사용):
 [자산] 보통예금, 현금, 외상매출금, 미수금, 선급금, 가지급금, 상품, 원재료, 재고자산, 비품, 차량운반구, 소프트웨어, 임차보증금
 [부채] 미지급금, 예수금, 외상매입금, 단기차입금, 미지급비용
 [자본] 자본금, 미처분이익잉여금
 [수익] 상품매출, 서비스매출, 이자수익
 [비용/판관비] 급여, 복리후생비(식대/경조사), 여비교통비(택시/출장), 통신비(인터넷/폰), 수도광열비(전기/가스), 세금과공과(협회비/과태료 제외공과금), 임차료, 수선비, 보험료, 접대비(거래처식대/선물), 광고선전비, 소모품비, 지급수수료(이체/세무대리), 운반비(퀵/택배), 차량유지비(주유/주차), 도서인쇄비, 교육훈련비, 연구개발비, 이자비용, 재고자산감모손실, 재고자산평가손실(부인)

 분석 규칙:
 1. **계정 세분화**: 1인 사업자도 이해할 수 있도록 description은 구체적으로 적되(예: '11월 사무실 임차료'), accountName은 위 가이드라인의 정식 명칭을 사용하세요.
 2. **금액 및 단위**: "1억원" -> 100000000, "10만원" -> 100000 처럼 한국어 단위를 숫자로 정확히 환산하세요.
 3. **결제 수단**: 영수증 형태면 "Card", 계좌이체 언급 시 "Transfer"를 paymentMethod에 지정하세요.
 4. **증반적 계정**: 자본금 납입은 'Equity', 비용은 'Expense', 매출은 'Revenue'로 entryType을 구분하세요.

 사용자 입력: ${input}
 정책: ${policy}
  
 응답 JSON 형식:
 {
   "date": "YYYY-MM-DD",
   "amount": 1000000,
   "vat": 100000,
   "entryType": "Expense",
   "description": "거래 요약",
   "vendor": "거래처명",
   "paymentMethod": "Card",
   "reasoning": "분석 근거",
   "accountName": "소모품비",
   "needsClarification": false,
   "confidence": "High"
 }`;

                const parts: any[] = [{ text: prompt }];
                if (imageBytes && imageMime) {
                    const base64Data = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
                    parts.push({
                        inline_data: {
                            mime_type: imageMime,
                            data: base64Data
                        }
                    });
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error.message);

                const text = data.candidates[0].content.parts[0].text;
                const parsedTx = JSON.parse(text);

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
                const prompt = `당신은 회계 법인의 시니어 매니저이자 규정 준수(Compliance) 전문가입니다. 사용자의 질문에 답변하고 최선의 회계 처리를 권고하세요. 
답변은 전문적이며 친절한 한글로 작성하세요.

[현재 전표 상황]: ${JSON.stringify(currentTx)}
[회사의 회계 정책]: ${policy}
[사용자 질문]: ${userMessage}

반드시 다음 JSON 형식으로 응답하세요:
{
  "transaction": null,
  "vendorStatus": "No_Vendor",
  "suggestedVendor": null,
  "complianceReview": {
    "status": "Safe",
    "message": "전문가의 분석 결과 및 권고안",
    "reviewLogs": ["Advisory Mode"]
  }
}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;
                const result = JSON.parse(text);
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
