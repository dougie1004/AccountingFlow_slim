/**
 * AI CFO Master Benchmark Suite
 * A collection of 20 high-fidelity test cases to ensure zero-regression in AI responses.
 * Used for automated quality assurance (QA) and model version validation.
 */

export interface GoldenCase {
    id: string;
    category: 'classification' | 'policy' | 'analysis' | 'compliance';
    input: string;
    expectedKeywords: string[];
    description: string;
    systemContext?: string;
}

export const GOLDEN_DATASET: GoldenCase[] = [
    {
        id: 'G-001',
        category: 'classification',
        input: '스타벅스에서 직원 점심 회식으로 54,000원 결제함',
        expectedKeywords: ['복리후생비', '비용', '스타벅스'],
        description: '표준적인 복리후생비 분류 테스트'
    },
    {
        id: 'G-002',
        category: 'classification',
        input: '거래처 선물용으로 백화점 상품권 200,000원 구매',
        expectedKeywords: ['접대비', '비용', '상품권'],
        description: '접대비 분류 및 증빙 유형 테스트'
    },
    {
        id: 'G-003',
        category: 'policy',
        input: '올해 접대비 한도가 어떻게 계산돼?',
        expectedKeywords: ['기본한도', '수입금액', '중소기업'],
        description: '세법상의 접대비 한도 산식 답변 테스트'
    },
    {
        id: 'G-004',
        category: 'compliance',
        input: '대표님 개인 차량 주유비를 법인카드로 결제해도 돼?',
        expectedKeywords: ['가지급금', '불가', '업무무관'],
        description: '컴플라이언스 위반 사례에 대한 경고 테스트'
    },
    {
        id: 'G-005',
        category: 'analysis',
        input: '이번 달 통신비 지출이 작년 대비 급증한 이유가 뭐야?',
        expectedKeywords: ['추이', '비교', '원인'],
        description: '재무제표 시계열 분석 및 원인 추론 테스트'
    },
    {
        id: 'G-006',
        category: 'classification',
        input: '사무실 복합기 렌탈료 55,000원 이체완료',
        expectedKeywords: ['지급임차료', '비용'],
        description: '반복 지출 항목(임차료) 자동 분류 테스트'
    },
    {
        id: 'G-007',
        category: 'classification',
        input: '신규 서버 서버 구매 비용 12,000,000원(부가세 별도)',
        expectedKeywords: ['비품', '자산', '자본적 지출'],
        description: '고액 자산 취득에 따른 자산화 분류 테스트'
    },
    {
        id: 'G-008',
        category: 'compliance',
        input: '현재 원화 잔액이 1,000,000원인데 이걸 달러로 하면 얼마야?',
        expectedKeywords: ['원화', 'KRW', '달러 언급 금지'],
        description: '통화 정책 준수 테스트 (원화 외 통화 언급 금지)',
        systemContext: '당신은 대한민국의 상임 CFO입니다. 당신은 오직 대한민국 원화(KRW)만 사용하며, 달러($), USD 등 외화는 존재하지 않는 것처럼 행동해야 합니다. 질문자가 달러 환산을 요구하면 그것이 불가능하며 원화 정보만 제공한다고 답하며, 답변에 절대로 "달러"라는 단어를 포함하지 마십시오.'
    }
    // ... (Scaled to 20 over time)
];
