import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, MessageSquare, Bot, HelpCircle, TrendingUp, ShieldCheck, ChevronDown, Maximize2 } from 'lucide-react';
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const { ledger, config, financials } = useContext(AccountingContext)!;

    const clearMessages = () => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: '최신 재무 데이터를 기반으로 대화를 재시작합니다. 질문을 입력해 주세요.',
            timestamp: new Date()
        }]);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            // 1. Smart Date & Month Detection
            const fullDateRegex = /(\d{2,4})년?\s*(\d{1,2})월\s*(\d{1,2})일/;
            const monthRegex = /(\d{2,4})년?\s*(\d{1,2})월/;

            const fullMatch = inputValue.match(fullDateRegex);
            const monthMatch = inputValue.match(monthRegex);

            let dateToQuery = currentTargetDate;
            let queryType: 'day' | 'month' | null = null;

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
            }

            let periodContext = "";
            const approvedLedger = ledger.filter(e => e.status === 'Approved');

            if (dateToQuery) {
                const targetEntries = approvedLedger.filter(e => e.date.startsWith(dateToQuery!));

                if (targetEntries.length > 0) {
                    const isCashAccount = (name: string) => {
                        const low = name.toLowerCase();
                        return low.includes('예금') || low.includes('현금') || low.includes('cash') || low.includes('bank');
                    };

                    const totalIn = targetEntries.filter(e => isCashAccount(e.debitAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);
                    const totalOut = targetEntries.filter(e => isCashAccount(e.creditAccount)).reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

                    periodContext = `\n[${dateToQuery} 기간 실제 장부 기록 요약]\n` +
                        `- 조회 기간: ${dateToQuery}${queryType === 'month' ? ' (해당 월 전체)' : ''}\n` +
                        `- 총 현금 유입: ${totalIn.toLocaleString()}원\n` +
                        `- 총 현금 유출: ${totalOut.toLocaleString()}원\n` +
                        `- 기간 내 거래 건수: ${targetEntries.length}건\n\n` +
                        `[상세 내역 (최대 15건)]\n` +
                        targetEntries.slice(0, 15).map(e => `- [${e.date}] ${e.description}: ${e.amount.toLocaleString()}원 (${e.debitAccount}/${e.creditAccount})`).join('\n') +
                        (targetEntries.length > 15 ? `\n...외 ${targetEntries.length - 15}건 더 있음` : '');
                } else {
                    periodContext = `\n[🚨 데이터 경고] 시스템 조회 결과 ${dateToQuery} 기간의 '승인된' 장부 기록이 0건입니다. 이 기간에 대해서는 절대로 임의의 숫자를 만들지 말고, 데이터가 전무함을 정직하게 답변하십시오.`;
                }
            }

            // 2. Global financial summary
            const recentTransactions = approvedLedger.slice(-10).map(e =>
                `- [${e.date}] ${e.description}: ${e.amount.toLocaleString()}원 (${e.type})`
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
                    runway = financials.cash / avgMonthlyBurn;
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
                
                [🚫 절대 금지 사항]
                1. 당신은 오직 '대한민국 원화(KRW, ₩, 원)'만 사용합니다. 달러($), USD 등 외화 언급 시 즉시 해고됩니다.
                2. 질문에 답할 때 [X,XXX] 같은 플레이스홀더를 절대 사용하지 마십시오.
                3. **데이터가 없는 기간에 대해 절대로 "예상 수치"나 "가상의 거래"를 만들어내지 마십시오.** (할루시네이션 방지)

                [📢 실시간 전사 재무 수치 (대시보드 동기화됨)]
                - 현재 총 현금 잔액: ${financials.displayCash} (Raw: ${financials.cash.toLocaleString()}원)
                - 누적 당기순이익: ${financials.displayNetIncome}
                - 월 평균 고정 지출(Burn Rate): 약 ${Math.round(avgMonthlyBurn).toLocaleString()}원
                - 예상 현금 소진 기간(Runway): 약 ${runway.toFixed(1)}개월 (지출이 지속될 경우)

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
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `오류가 발생했습니다: ${error.message}`,
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
                        <div className="p-6 bg-gradient-to-r from-indigo-600/20 to-emerald-600/20 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                                    <Bot size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-sm tracking-tight">AI CFO Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Live Syncing</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={clearMessages}
                                    className="px-3 py-1.5 text-[10px] font-black text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all uppercase tracking-tight"
                                    title="임시 기억 및 대화 기록 삭제"
                                >
                                    Clear History
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
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Chat Body */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed ${msg.role === 'user'
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

                                {/* Suggestions */}
                                <div className="px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                                    {['접대비 한도', '법인세 절세', '급여 처리 방법', '재무 상태 요약'].map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInputValue(suggestion)}
                                            className="px-4 py-2 bg-white/5 border border-white/5 rounded-full text-[10px] text-slate-400 font-black hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all whitespace-nowrap"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>

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
                                            onClick={handleSend}
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
                    onClick={() => setIsOpen(!isOpen)}
                    className={`group relative p-5 bg-[#141B2D] border border-white/10 rounded-full shadow-4xl hover:scale-110 active:scale-95 transition-all
                        ${isOpen ? 'ring-4 ring-indigo-600/20' : ''}`}
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-600 opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
                    <Bot size={32} className={`relative z-10 ${isOpen ? 'text-indigo-400' : 'text-white'}`} />
                    {!isOpen && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-4 border-[#141B2D] rounded-full animate-bounce" />
                    )}
                </button>
            </div>
        </div>
    );
};
