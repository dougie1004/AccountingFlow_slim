import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, MessageSquare, Bot, HelpCircle, TrendingUp, ShieldCheck, ChevronDown, Maximize2, RotateCcw, Activity, Minimize2 } from 'lucide-react';
import { AccountingContext } from '../../context/AccountingContext';
import { chatWithCfo } from '../../services/aiService';
import { cleanMarkdown } from '../../utils/textUtils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const CfoAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: '안녕하세요, 대표님. 현재 실시간 장부 데이터와 100% 동기화되어 있습니다. 재무 분석, 절세 전략, 혹은 전표 처리 등 궁금하신 점을 말씀해 주시면 즉시 분석해 드리겠습니다.',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentTargetDate, setCurrentTargetDate] = useState<string | null>(null);
    const [showPrompts, setShowPrompts] = useState(messages.length <= 1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { ledger, config, financials, closingRecords, corporateRules } = useContext(AccountingContext)!;

    const clearMessages = () => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: '안녕하세요, 대표님. 모든 대화 기록과 조회 컨텍스트가 초기화되었습니다. 새로운 분석을 시작할 준비가 되었습니다.',
            timestamp: new Date()
        }]);
        setCurrentTargetDate(null); // 날짜 컨텍스트 초기화 (중요)
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const PROMPT_CATEGORIES = [
        {
            title: '💸 현금 흐름 & 런웨이',
            prompts: [
                '현재 우리 회사의 Runway는 몇 개월이야?',
                '이번 달 예상 지출액과 실제 지출액 차이가 얼마야?',
                '남은 현금으로 올해 연말까지 버틸 수 있을까?'
            ]
        },
        {
            title: '📊 비용 분석 & 전략',
            prompts: [
                '가장 많은 비용이 지출된 계정과목 3가지를 알려줘.',
                '지난 달 대비 인건비 지출이 얼마나 변했어?',
                '영업이익 흑자 전환을 위해 필요한 최소 매출액은?'
            ]
        },
        {
            title: '🛡️ 컴플라이언스 & 리스크',
            prompts: [
                '증빙이 누락된 전표들만 리스트업해서 보여줘.',
                '지금 전표 승인 속도가 마감 일정에 비해 어때?',
                '세무 리스크가 가장 큰 지출 항목은 무엇이야?'
            ]
        }
    ];

    const handleSend = async (overrideValue?: string) => {
        const textToUse = overrideValue || inputValue;
        if (!textToUse.trim() || isLoading) return;

        setShowPrompts(false);
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: textToUse,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // [DETERMINISTIC GUARD] No Data State
        if (ledger.length === 0) {
            const financialKeywords = ['런웨이', 'runway', '매출', '지출', '돈', '잔액', '현금', '이익', '비용', '얼마', '컴플라이언스', '전표'];
            const isFinancialQuery = financialKeywords.some(k => textToUse.toLowerCase().includes(k));

            if (isFinancialQuery) {
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: '현재 시스템에 등록된 전표 데이터가 전혀 없습니다. \n\n데이터가 없는 상태에서는 재무 분석이나 Runway 예측이 불가능합니다. **[설정 > 데이터 제어 센터]**에서 **데모 데이터를 로드**하시거나, 엑셀 파일을 업로드하여 장부를 먼저 채워주세요. 그 후 다시 질문해 주시면 정확한 답변을 드릴 수 있습니다.',
                        timestamp: new Date()
                    }]);
                    setIsLoading(false);
                }, 800);
                return;
            }
        }

        let runwayValue = 0;
        let burnRateValue = 0;

        try {
            // 1. Smart Date & Month Detection
            const fullDateRegex = /(\d{2,4})년?\s*(\d{1,2})월\s*(\d{1,2})일/;
            const monthRegex = /(\d{2,4})년?\s*(\d{1,2})월/;
            const yearRegex = /(\d{2,4})년/;

            const fullMatch = textToUse.match(fullDateRegex);
            const monthMatch = textToUse.match(monthRegex);
            const yearMatch = textToUse.match(yearRegex);

            let dateToQuery = currentTargetDate;
            let queryType: 'day' | 'month' | 'year' | null = null;

            if (fullMatch) {
                let year = fullMatch[1];
                if (year.length === 2) year = "20" + year;
                const month = fullMatch[2].padStart(2, '0');
                const day = fullMatch[3].padStart(2, '0');
                dateToQuery = `${year}-${month}-${day}`;
                setCurrentTargetDate(dateToQuery);
                queryType = 'day';
            } else if (monthMatch) {
                let year = monthMatch[1];
                if (year.length === 2) year = "20" + year;
                const month = monthMatch[2].padStart(2, '0');
                dateToQuery = `${year}-${month}`; // Format: YYYY-MM
                setCurrentTargetDate(dateToQuery);
                queryType = 'month';
            } else if (yearMatch) {
                let year = yearMatch[1];
                if (year.length === 2) year = "20" + year;
                dateToQuery = year; // Format: YYYY
                setCurrentTargetDate(dateToQuery);
                queryType = 'year';
            }

            let periodContext = "";
            const approvedLedger = ledger.filter(e => e.status === 'Approved');

            if (dateToQuery) {
                const targetEntries = approvedLedger.filter(e => e.date.startsWith(dateToQuery!));

                // [INTEGRITY] Search for Official Closing Records for this period first
                const officialRecord = closingRecords.find(r => r.period === dateToQuery || (queryType === 'year' && r.period.startsWith(dateToQuery!)));

                if (officialRecord || targetEntries.length > 0) {
                    const isCashAccount = (name: string) => {
                        const low = name.toLowerCase();
                        return low.includes('예금') || low.includes('현금') || low.includes('cash') || low.includes('bank');
                    };

                    const totalIn = targetEntries.filter(e => isCashAccount(e.debitAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);
                    const totalOut = targetEntries.filter(e => isCashAccount(e.creditAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

                    // Categorical Analysis (Revenue vs Expense)
                    const revenue = targetEntries.filter(e => e.type === 'Revenue').reduce((s, e) => s + e.amount, 0);
                    const expense = targetEntries.filter(e => e.type === 'Expense' || e.type === 'Payroll').reduce((s, e) => s + e.amount, 0);

                    periodContext = `\n[${dateToQuery} 기간 재무 데이터 분석]\n` +
                        `- 조회 범위: ${dateToQuery}${queryType === 'month' ? ' (해당 월)' : queryType === 'year' ? ' (해당 연도)' : ''}\n` +
                        `- 현금 흐름: 유입 ${totalIn.toLocaleString()}원 / 유출 ${totalOut.toLocaleString()}원\n` +
                        `- 경영 실적(장부): 매출 ${revenue.toLocaleString()}원 / 비용 ${expense.toLocaleString()}원 / 순이익 ${(revenue - expense).toLocaleString()}원\n`;

                    if (officialRecord) {
                        const s = officialRecord.summary;
                        periodContext += `\n[🔒 공식 결산 데이터 발견 - 신뢰도 최고]\n` +
                            `- 결산 마감일: ${new Date(officialRecord.closedAt).toLocaleDateString()}\n` +
                            `- 공식 매출: ${s.revenue.toLocaleString()}원\n` +
                            `- 공식 비용: ${s.expense.toLocaleString()}원\n` +
                            `- 공식 순이익: ${s.profit.toLocaleString()}원\n` +
                            `- 기말 자산: ${s.totalAssets.toLocaleString()}원 (자본: ${s.equity.toLocaleString()}원)\n` +
                            `- 이전 CFO 브리핑 요약: ${officialRecord.aiBriefing?.substring(0, 200) || '내역 없음'}...\n`;
                    }

                    periodContext += `\n[상세 거래 샘플 (최대 10건)]\n` +
                        targetEntries.slice(0, 10).map(e => `- [${e.journalNumber || '번호미부여'}] [${e.date}] ${e.description}: ${e.amount.toLocaleString()}원 (${e.debitAccount}/${e.creditAccount})`).join('\n') +
                        (targetEntries.length > 10 ? `\n...외 ${targetEntries.length - 10}건 더 있음` : '');
                } else {
                    periodContext = `\n[🚨 데이터 경고] 시스템 조회 결과 ${dateToQuery} 기간의 '승인된' 장부 기록이나 결산 내역이 0건입니다. 이 기간에 대해서는 절대로 임의의 숫자를 만들지 말고, 데이터가 전무함을 정직하게 답변하십시오.`;
                }
            }

            // 2. Global financial summary
            const recentTransactions = approvedLedger.slice(-10).map(e =>
                `- [${e.journalNumber || '번호미부여'}] [${e.date}] ${e.description}: ${e.amount.toLocaleString()}원 (${e.type})`
            ).join('\n');

            // 1.5 Calculate Burn Rate & Runway (Sync with Dashboard Logic)
            const expenseEntries = approvedLedger.filter(e => e.type === 'Expense' || e.type === 'Payroll');
            const totalExpense = expenseEntries.reduce((s, e) => s + (e.amount || 0), 0);
            let avgMonthlyBurn = 0;
            let runway = 0;

            if (expenseEntries.length > 0) {
                const dates = expenseEntries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
                const start = dates[0];
                const end = dates[dates.length - 1];
                const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                // Dashboard logic: if < 7 days, assume 30 day baseline
                const denominator = days < 7 ? 30 : days;
                const dailyBurn = totalExpense / denominator;
                avgMonthlyBurn = dailyBurn * 30.41;

                if (avgMonthlyBurn > 0) {
                    runwayValue = financials.cash / avgMonthlyBurn;
                    burnRateValue = avgMonthlyBurn;
                }
            }

            // 1.6 Calculate Compliance & Management Health
            const totalCount = ledger.length;
            const unconfirmedCount = ledger.filter(e => e.status !== 'Approved').length;
            const unconfirmedRatio = totalCount > 0 ? Math.round((unconfirmedCount / totalCount) * 100) : 0;

            // Evidence Analysis
            const evidenceStats = ledger.reduce((acc, e) => {
                const type = e.evidenceType || 'None';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const cardCount = evidenceStats['CreditCard'] || 0;
            const taxCount = evidenceStats['TaxInvoice'] || 0;
            const cashCount = evidenceStats['CashReceipt'] || 0;
            const missingCount = evidenceStats['None'] || 0;
            const evidenceHealth = totalCount > 0 ? Math.round(((totalCount - missingCount) / totalCount) * 100) : 0;

            const systemPrompt = `
                당신은 대한민국 기업의 [상임 CFO]입니다. 모든 회계 기준은 K-IFRS와 대한민국 세법을 따릅니다.
                
                [🛡️ 회사 고유 회계 및 지출 규정 (핵심 지침)]
                ${corporateRules || '기본 회계 원칙을 준수하십시오.'}

                [🚫 절대 금지 사항]
                1. 당신은 오직 '대한민국 원화(KRW, ₩, 원)'만 사용합니다. 달러($), USD 등 외화 언급 시 즉시 해고됩니다.
                2. 질문에 답할 때 [X,XXX] 같은 플레이스홀더를 절대 사용하지 마십시오.
                3. **데이터가 없는 기간에 대해 절대로 "예상 수치"나 "가상의 거래"를 만들어내지 마십시오.** (할루시네이션 방지)

                [📢 실시간 전사 재무 수치 (대시보드 동기화됨)]
                - 현재 총 현금 잔액: ${financials.displayCash} (Raw: ${financials.cash.toLocaleString()}원)
                - 누적 당기순이익: ${financials.displayNetIncome}
                - 매출채권(AR): ${financials.displayAr}
                - 매입채무(AP): ${financials.displayAp}
                - 총 자산: ${financials.totalAssets.toLocaleString()}원 / 총 부채: ${financials.totalLiabilities.toLocaleString()}원
                - 월 평균 고정 지출(Burn Rate): 약 ${Math.round(avgMonthlyBurn).toLocaleString()}원
                - 예상 현금 소진 기간(Runway): 약 ${runwayValue.toFixed(1)}개월 (지출이 지속될 경우)

                [🔍 관리 현황 및 컴플라이언스 (Evidence Health)]
                - 전표 관리 점수: ${100 - unconfirmedRatio}점 (높을수록 좋음)
                - 미승인 전표: ${unconfirmedCount}건 (${unconfirmedRatio}%) - *이 비율이 높으면 "관리가 밀려있다"고 경고하십시오.*
                - 적격 증빙 보유율: ${evidenceHealth}% (카드: ${cardCount}, 세금계산서: ${taxCount}, 현금영수증: ${cashCount})
                - 증빙 누락 위험군: ${missingCount}건 - *이 숫자가 크면 "세무 리스크가 있다"고 조언하십시오.*
                
                [상세 재무 데이터 (조회된 기간: ${dateToQuery || '없음'})]
                ${periodContext || '요청된 특정 기간의 데이터가 없습니다. 아래 최근 거래와 전사 요약을 참고하여 답변하십시오.'}

                [검증용 최근 10건 거래 내역 (최신순)]
                ${recentTransactions || '거래 없음'}

                [최종 답변 규칙]
                - 모든 답변은 반드시 위 [🛡️ 회사 고유 회계 및 지출 규정]을 최우선으로 참고하여 판단하십시오.
                - "현금 소진"이나 "런웨이" 관련 질문 시 위 [실시간 전사 재무 수치]의 Burn Rate와 Runway 데이터를 인용하여 정확히 답변하십시오.
                - "증빙 관리", "전표 상태", "잘 하고 있어?" 같은 질문 시 [관리 현황 및 컴플라이언스] 데이터를 기반으로 칭찬하거나 경고하십시오.
                - 질문에 특정 시점(예: 12월, 12월 1일)이 언급된 경우, 반드시 [상세 재무 데이터]를 기반으로 답변하십시오.
                - 만약 [상세 재무 데이터]에 찾는 내용이 없다면, "장부상 해당 기간에는 특별한 거래가 확인되지 않습니다"라고 답하십시오.
                - 모든 숫자는 제공된 데이터만 읽으십시오. 짐작은 금물입니다.
            `;

            const result = await chatWithCfo(messages.concat(userMsg), systemPrompt);

            if (result.error) throw new Error(result.error);

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.response || '답변을 생성하는 데 어려움을 겪고 있습니다.',
                timestamp: new Date()
            }]);
        } catch (error: any) {
            const errorMsg = error.message.toLowerCase();
            let helpfulAdvice = "";

            if (errorMsg.includes("403") || errorMsg.includes("invalid") || errorMsg.includes("key")) {
                helpfulAdvice = "\n\n**해결 방법:** (1) **[설정 > AI 엔진 설정]**에 입력하신 개인 API Key가 만료되었는지 확인해 주시고, 비어있다면 삭제하여 시스템 기본키 사용을 시도해 보세요. (2) Google AI Studio에서 'Generative Language API' 권한이 활성화되어 있는지 확인해 주세요.";
            }

            const activeKey = localStorage.getItem('user_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
            const keySuffix = activeKey ? activeKey.slice(-6) : 'N/A';
            const keySource = localStorage.getItem('user_gemini_api_key') ? "개인 설정용 키" : "시스템 기본 키";

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `분석 중 기술적인 문제가 발생했습니다. (사용 중인 키: ${keySource}, 끝자리: ${keySuffix})\n\n**원인:** ${error.message}${helpfulAdvice}\n\n---\n**💡 [로컬 분석 결과] API 연결 없이 확인된 기초 지표:**\n- 현재 잔액: ${financials.displayCash || '₩0'}\n- 예상 Runway: 약 ${runwayValue.toFixed(1)}개월 (최근 지출 기준)`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isMinimized ? '80px' : (isMaximized ? 'calc(100vh - 100px)' : '650px'),
                            width: isMaximized ? 'calc(100vw - 100px)' : '500px',
                            maxWidth: isMaximized ? '1200px' : '500px'
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`mb-4 bg-[#111827]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col transition-all duration-500 ${isMaximized ? 'fixed inset-6 m-auto' : ''}`}
                    >
                        {/* Header */}
                        <div
                            onClick={() => isMinimized && setIsMinimized(false)}
                            className={`flex items-center justify-between p-6 border-b border-white/5 bg-[#151D2E]/90 backdrop-blur-xl shrink-0 ${isMinimized ? 'cursor-pointer hover:bg-[#1c283d] transition-colors' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                                        <Sparkles className="text-white" size={24} />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#151D2E] rounded-full animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">CFO AI Assistant</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                            <Activity size={10} /> Active
                                        </span>
                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                            Engine: {import.meta.env.VITE_AI_MODEL_NAME || 'Gemini 2.0 Flash'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold">
                                            Key: ...{(localStorage.getItem('user_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '').slice(-6) || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsMinimized(true)} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                                    <Minimize2 size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 p-2 bg-[#0B1221]/30 border-b border-white/5">
                            <button
                                onClick={() => setShowPrompts(!showPrompts)}
                                className={`p-2 rounded-xl transition-all ${showPrompts ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                title="질문 가이드 보기"
                            >
                                <HelpCircle size={18} />
                            </button>
                            <button
                                onClick={clearMessages}
                                className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"
                                title="대화 초기화"
                            >
                                <RotateCcw size={18} />
                            </button>
                            <button onClick={() => {
                                setIsMaximized(!isMaximized);
                                setIsMinimized(false);
                            }} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                <Maximize2 size={18} className={isMaximized ? 'text-indigo-400' : ''} />
                            </button>
                            <button onClick={() => {
                                setIsMinimized(!isMinimized);
                                setIsMaximized(false);
                            }} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                <ChevronDown size={18} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Chat Body */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar relative">
                                    <AnimatePresence>
                                        {showPrompts && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-50 bg-[#0F172A] p-8 space-y-8 overflow-y-auto custom-scrollbar"
                                            >
                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-black text-white">어떻게 질문해야 할까요?</h4>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">분석하고 싶은 주제를 선택해 보세요</p>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6">
                                                    {PROMPT_CATEGORIES.map(cat => (
                                                        <div key={cat.title} className="space-y-3">
                                                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">{cat.title}</div>
                                                            <div className="flex flex-col gap-2">
                                                                {cat.prompts.map(p => (
                                                                    <button
                                                                        key={p}
                                                                        onClick={() => {
                                                                            setInputValue(p);
                                                                            setShowPrompts(false);
                                                                        }}
                                                                        className="w-full text-left p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-300 text-[13px] font-medium hover:bg-indigo-600/20 hover:border-indigo-500/50 hover:text-white transition-all group"
                                                                    >
                                                                        {p}
                                                                        <div className="text-[9px] text-indigo-400 font-black mt-2 opacity-0 group-hover:opacity-100 transition-opacity">이 문장으로 질문하기 →</div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-4 pb-8">
                                                    <button
                                                        onClick={() => setShowPrompts(false)}
                                                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
                                                    >
                                                        가이드 닫기
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className={showPrompts ? 'opacity-0 pointer-events-none' : 'opacity-100'}>
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
                                                <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white font-medium rounded-tr-sm shadow-xl shadow-indigo-600/10'
                                                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
                                                    }`}>
                                                    {cleanMarkdown(msg.content)}
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-sm flex gap-2">
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Input section starts directly after Chat Body */}

                                {/* Input */}
                                <div className="p-6 pt-2 shrink-0">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                                            placeholder="CFO에게 질문하세요..."
                                            className="w-full bg-[#0B1221] border border-white/5 rounded-2xl py-4 pl-6 pr-14 text-white text-sm font-bold outline-none group-focus-within:border-indigo-500/50 transition-all shadow-inner"
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-500 active:scale-95 transition-all"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Always-on Help Context */}
            <div className="flex flex-col items-end gap-3">
                <button
                    onClick={() => {
                        if (!isOpen) {
                            setIsOpen(true);
                            setIsMinimized(false);
                        } else if (isMinimized) {
                            setIsMinimized(false);
                        } else {
                            setIsOpen(false);
                        }
                    }}
                    className={`group relative p-5 bg-[#141B2D] border border-white/10 rounded-full shadow-4xl hover:scale-110 active:scale-95 transition-all
                        ${isOpen && !isMinimized ? 'ring-4 ring-indigo-600/20' : ''}`}
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-600 opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
                    <Bot size={32} className={`relative z-10 ${isOpen ? 'text-indigo-400' : 'text-white'}`} />
                    {!isOpen && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-4 border-[#141B2D] rounded-full animate-bounce" />
                    )}
                </button>
            </div>
        </div >
    );
};
