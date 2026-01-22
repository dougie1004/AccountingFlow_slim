import { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
    }

    const { action, payload } = req.body;

    try {
        let prompt = '';
        let parts: any[] = [];

        if (action === 'parse') {
            const { input, policy, imageBytes, imageMime } = payload;
            prompt = `당신은 숙련된 공인회계사(KICPA)이자 SME 전문 세무 조력자입니다. 사용자의 텍스트 입력과 증빙을 분석하여 '세무 신고'가 가능한 수준의 정교한 전표를 생성하세요.

  핵심 계정과목 가이드라인 (accountName에 반드시 사용):
  [자산] 보통예금, 현금, 외상매출금, 미수금, 선급금, 가지급금, 상품, 원재료, 재고자산, 비품, 차량운반구, 소프트웨어, 임차보증금
  [부채] 미지급금, 예수금, 외상매입금, 단기차입금, 미지급비용
  [자본] 자본금, 미처분이익잉여금
  [수익/매출] 상품매출, 서비스매출, 이자수익, 잡이익
  [비용/원가/판관비] 상품매출원가, 제품매출원가, 급여, 복리후생비(식대/경조사), 여비교통비(택시/출장), 통신비(인터넷/폰), 수도광열비(전기/가스), 세금과공과(협회비/과태료 제외공과금), 임차료, 수선비, 보험료, 접대비(거래처식대/선물), 광고선전비, 소모품비, 지급수수료(이체/세무대리), 운반비(퀵/택배), 차량유지비(주유/주차), 도서인쇄비, 교육훈련비, 연구개발비, 이자비용, 재고자산감모손실, 재고자산평가손실(부인)

 분석 규칙:
 1. **수익(매출) vs 비용**: '판매', '수주', '입금', '수익', '매출' 등 돈이 들어오거나 제품을 판 맥락이면 반드시 'Revenue'로 분류하고 '상품매출' 또는 '서비스매출'을 선택하세요. 절대 '지급수수료'와 혼동하지 마세요.
 2. **계정 세분화**: 1인 사업자도 이해할 수 있도록 description은 구체적으로 적되, accountName은 위 가이드라인의 정식 명칭을 사용하세요.
 3. **금액 및 단위**: "1억원" -> 100000000 처럼 한국어 단위를 숫자로 정확히 환산하세요.
 4. **결제 수단**: 영수증 형태면 "Card", 계좌이체 언급 시 "Transfer"를 지정하세요.

 사용자 입력: ${input}
 정책: ${policy}
  
 응답 JSON 형식:
 {
   "date": "YYYY-MM-DD",
   "amount": 1000000,
   "vat": 100000,
   "entryType": "Revenue",
   "description": "OOO 제품 판매 매출",
   "vendor": "거래처명",
   "paymentMethod": "Transfer",
   "reasoning": "제품 판매에 따른 수익 발생으로 인식",
   "accountName": "상품매출",
   "needsClarification": false,
   "confidence": "High"
 }`;
            parts.push({ text: prompt });
            if (imageBytes && imageMime) {
                parts.push({
                    inline_data: {
                        mime_type: imageMime,
                        data: Buffer.from(imageBytes).toString('base64')
                    }
                });
            }
        } else if (action === 'batch_parse') {
            const { rows, policy } = payload;
            prompt = `당신은 숙련된 공인회계사(KICPA)입니다. 다음의 원본 데이터 목록을 분석하여 표준화된 회계 전표(JSON 배열)로 변환하세요.

 가이드라인:
 - **수익(Revenue) 인식**: '판매', '매출', '수지', '입금' 등의 단어가 포함된 행은 반드시 entryType: "Revenue"로 분류하고 accountName은 '상품매출' 또는 '서비스매출'을 부여하세요.
 - accountName은 정식 계정과목(상품매출, 보통예금, 급여, 임차료, 소모품비 등)을 사용하세요.
 - 금액에서 쉼표나 단위를 제거하고 숫자로 변환하세요.
 - 날짜는 YYYY-MM-DD 형식으로 통일하세요.

 대상 데이터: ${JSON.stringify(rows)}
 정책: ${policy}

 응답 형식 (반드시 JSON 배열만 응답):
 [
   {
     "date": "YYYY-MM-DD",
     "amount": 85000000,
     "vat": 7727273,
     "entryType": "Revenue",
     "description": "시스템 서버 모듈 제품 판매",
     "vendor": "OO솔루션",
     "accountName": "상품매출",
     "reasoning": "제품 판매 문구가 명확하여 매출로 인식",
     "confidence": "High"
   }
 ]`;
            parts.push({ text: prompt });
        } else if (action === 'chat') {
            const { userMessage, currentTx, policy } = payload;
            prompt = `당신은 회계 법인의 시니어 매니저이자 규정 준수(Compliance) 전문가입니다. 사용자의 질문에 답변하고 최선의 회계 처리를 권고하세요. 
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
            parts.push({ text: prompt });
        }

        // [Antigravity] Retry Logic for Robustness
        let attempts = 0;
        const maxAttempts = 2; // Auto-retry once on failure

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const modelName = process.env.AI_MODEL_NAME || 'gemini-2.0-flash-exp';
                console.log(`[AI API] Sending request to ${modelName} (Attempt ${attempts})`);

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });

                const data: any = await response.json();
                if (data.error) throw new Error(data.error.message);

                if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                    throw new Error('AI returned empty response');
                }

                let resultText = data.candidates[0].content.parts[0].text;

                // [Antigravity] Sanitizer: Extract JSON object only
                // Remove Markdown code blocks first
                resultText = resultText.replace(/```json/g, '').replace(/```/g, '');

                // Regex to find the first '{' and last '}'
                const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    resultText = jsonMatch[0];
                } else {
                    // Check for Array format if batch lookup
                    const arrayMatch = resultText.match(/\[[\s\S]*\]/);
                    if (arrayMatch) {
                        resultText = arrayMatch[0];
                    }
                }

                const parsed = JSON.parse(resultText);

                // [Antigravity] Schema Validation (Basic Check)
                if (action === 'batch_parse' && !Array.isArray(parsed)) {
                    throw new Error('Response is not an array for batch request');
                }

                return res.status(200).json(parsed);

            } catch (error: any) {
                console.error(`Attempt ${attempts} failed:`, error.message);
                if (attempts === maxAttempts) {
                    return res.status(500).json({ error: `AI Processing Failed after retries: ${error.message}` });
                }
                // Wait briefly before retry
                await new Promise(r => setTimeout(r, 1000));
            }
        }

    } catch (error: any) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
