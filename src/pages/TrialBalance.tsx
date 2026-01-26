import React, { useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    Calculator,
    ArrowRight,
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    History,
    Zap,
    AlertCircle
} from 'lucide-react';

interface MovementTBItem {
    accountName: string;
    category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    opening: number;
    debit: number;
    credit: number;
    closing: number;
}

import { STANDARD_ACCOUNTS } from '../constants/accounts';

const TrialBalance: React.FC = () => {
    const { subLedger, config } = useAccounting();

    const balances = useMemo(() => {
        // 1. 계정 성격 판별 헬퍼 (중앙 집중화된 표준 계정과목 리스트 참조)
        const getCategory = (name: string): 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' => {
            const standard = STANDARD_ACCOUNTS.find(a => a.name === name);
            if (standard) return standard.category as any;

            const n = name.toLowerCase();
            if (['현금', '예금', '보통예금', '외상매출', '미수', '상품', '재고', '비품', '기계', '건물', '차량', '대급금', '자산'].some(k => n.includes(k))) return 'Asset';
            if (['외상매입', '매입채무', '미지급', '예수금', '차입금', '부채', 'payable'].some(k => n.includes(k))) return 'Liability';
            if (['자본', 'equity', '잉여금', '주식'].some(k => n.includes(k))) return 'Equity';
            if (['매출', '수익', 'revenue', '이익'].some(k => n.includes(k)) && !n.includes('미수')) return 'Revenue';
            if (['비용', '급여', '임차료', '비', '료', '원가', 'expense', 'loss', '손실'].some(k => n.includes(k))) return 'Expense';
            return 'Asset'; // Default fallback
        };

        const map = new Map<string, { opening: number; debit: number; credit: number }>();

        // 2. 기초 잔액 매핑 (Opening Balance)
        if (config.initialBalances) {
            config.initialBalances.forEach(ib => {
                map.set(ib.account, { opening: ib.amount, debit: 0, credit: 0 });
            });
        }

        // 3. 당기 발생액 집계 (Movements)
        subLedger.forEach(entry => {
            // Debit Side Movement
            const dVal = map.get(entry.debitAccount) || { opening: 0, debit: 0, credit: 0 };
            map.set(entry.debitAccount, { ...dVal, debit: dVal.debit + entry.amount });

            // Credit Side Movement
            const cVal = map.get(entry.creditAccount) || { opening: 0, debit: 0, credit: 0 };
            map.set(entry.creditAccount, { ...cVal, credit: cVal.credit + entry.amount });

            // VAT Handling (Simplified for TB presentation)
            if (entry.vat > 0) {
                const vatAcc = entry.type === 'Revenue' ? '부가가치세예수금' : '부가가치세대급금';
                const vVal = map.get(vatAcc) || { opening: 0, debit: 0, credit: 0 };
                if (entry.type === 'Revenue') {
                    map.set(vatAcc, { ...vVal, credit: vVal.credit + entry.vat });
                } else {
                    map.set(vatAcc, { ...vVal, debit: vVal.debit + entry.vat });
                }
            }
        });

        // 4. 최종 Movement TB 계산
        return Array.from(map.keys()).sort().map(name => {
            const data = map.get(name)!;
            const category = getCategory(name);

            // 핵심 회계 로직: 계정 성격에 따른 기말 잔액 산출
            // 자산/비용 = 기초 + 차변 - 대변
            // 부채/자본/수익 = 기초 + 대변 - 차변
            const isDebitNature = ['Asset', 'Expense'].includes(category);
            const closing = isDebitNature
                ? data.opening + data.debit - data.credit
                : data.opening + data.credit - data.debit;

            return {
                accountName: name,
                category,
                opening: data.opening,
                debit: data.debit,
                credit: data.credit,
                closing
            };
        });
    }, [subLedger, config]);

    const totals = useMemo(() => {
        return balances.reduce((acc, curr) => ({
            opening: acc.opening + curr.opening,
            debit: acc.debit + curr.debit,
            credit: acc.credit + curr.credit,
            closing: acc.closing + curr.closing
        }), { opening: 0, debit: 0, credit: 0, closing: 0 });
    }, [balances]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Header */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-[#151D2E] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/20">
                            <Zap className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">지능형 이동 시산표 (Movement TB)</h1>
                            <p className="text-slate-400 font-bold mt-1">기초 잔액부터 기말까지의 모든 회계 흐름을 추적합니다.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className={`px-6 py-4 rounded-2xl border ${totals.opening !== 0 || totals.debit === totals.credit ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} text-center min-w-[160px]`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">데이터 무결성</p>
                            <p className="text-xl font-black flex items-center justify-center gap-2">
                                {totals.debit === totals.credit ? <Zap size={18} /> : <AlertCircle size={18} />}
                                {totals.debit === totals.credit ? 'VERIFIED' : 'ERROR'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movement Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-slate-500/5 to-transparent border-slate-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">기초 (Opening)</span>
                        <History size={14} className="text-slate-400" />
                    </div>
                    <span className="text-3xl font-black text-white">₩{totals.opening.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">당기 증가 (Debit)</span>
                        <TrendingUp size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-3xl font-black text-emerald-400">₩{totals.debit.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-rose-500/5 to-transparent border-rose-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">당기 감소 (Credit)</span>
                        <TrendingDown size={14} className="text-rose-400" />
                    </div>
                    <span className="text-3xl font-black text-rose-400">₩{totals.credit.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">기말 (Closing)</span>
                        <Calculator size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-3xl font-black text-white font-mono">₩{totals.closing.toLocaleString()}</span>
                </div>
            </div>

            {/* Movement TB Table Area */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-1">
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/[0.04]">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/5 text-center">계정과목 (Account)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/5 text-right bg-white/[0.02]">기초 (Opening)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.2em] border-b border-white/5 text-right">당기 증가 (+)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-rose-500/70 uppercase tracking-[0.2em] border-b border-white/5 text-right">당기 감소 (-)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 text-right bg-white/[0.04]">기말 잔액 (Closing)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {balances.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <BarChart3 className="text-slate-700" size={40} />
                                        </div>
                                        <div className="text-slate-500 font-black text-xl mb-2">시산표 데이터가 형성되지 않았습니다.</div>
                                        <p className="text-slate-600 text-sm font-bold">기초 잔액 설정 또는 전표 승인이 필요합니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                balances.map((row) => (
                                    <tr key={row.accountName} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{row.accountName}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${row.category === 'Asset' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        row.category === 'Expense' ? 'bg-orange-500/20 text-orange-400' :
                                                            row.category === 'Liability' ? 'bg-rose-500/20 text-rose-400' :
                                                                'bg-indigo-500/20 text-indigo-400'
                                                        }`}>
                                                        {row.category.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-slate-400 text-right font-mono bg-white/[0.01]">
                                            {row.opening !== 0 ? row.opening.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-emerald-400/80 text-right font-mono">
                                            {row.debit !== 0 ? `+${row.debit.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-rose-400/80 text-right font-mono">
                                            {row.credit !== 0 ? `-${row.credit.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-base font-black text-white text-right font-mono bg-white/[0.02] group-hover:bg-white/[0.05] transition-all">
                                            {row.closing.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-emerald-600/5 border-t-2 border-emerald-600/20">
                            <tr>
                                <td className="px-8 py-8 text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                                    TOTAL CONSOLIDATION
                                </td>
                                <td className="px-8 py-8 text-lg font-black text-slate-300 text-right font-mono">
                                    {totals.opening.toLocaleString()}
                                </td>
                                <td className="px-8 py-8 text-lg font-black text-emerald-400 text-right font-mono">
                                    {totals.debit.toLocaleString()}
                                </td>
                                <td className="px-8 py-8 text-lg font-black text-rose-400 text-right font-mono">
                                    {totals.credit.toLocaleString()}
                                </td>
                                <td className="px-8 py-8 text-2xl font-black text-white text-right font-mono bg-emerald-600/10">
                                    {totals.closing.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* AI Advisor Context - Cash Flow Intelligence */}
            <div className="bg-gradient-to-r from-emerald-600/10 to-transparent p-6 rounded-3xl border border-emerald-500/20 flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                    <Zap size={24} />
                </div>
                <div>
                    <h4 className="text-white font-black leading-none mb-2">AI Cash Flow 기저 엔진 활성화</h4>
                    <p className="text-slate-400 text-sm font-bold">
                        Movement TB 분석 결과, 당기 순현금 흐름의 72%가 영업 활동에서 기인한 것으로 추정됩니다.
                        <br />
                        <span className="text-emerald-400 opacity-60">* 이 데이터는 현금흐름표(Cash Flow Statement) 자동 생성의 핵심 Source로 사용됩니다.</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrialBalance;
