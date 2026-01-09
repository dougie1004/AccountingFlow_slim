import React, { useContext } from 'react';
import {
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    PieChart,
    ArrowRight,
    Calculator,
    CheckCircle2
} from 'lucide-react';
import { AccountingContext } from '../context/AccountingContext';

const Reports = () => {
    const context = useContext(AccountingContext);
    if (!context) return null;
    const { financials } = context;

    const {
        revenue,
        expenses,
        netIncome,
        cash,
        ar,
        ap,
        fixedAssets,
        vatNet,
        capital,
        retainedEarnings
    } = financials;

    const totalAssets = cash + ar + fixedAssets + (vatNet < 0 ? -vatNet : 0);
    const totalLiabilities = ap + (vatNet > 0 ? vatNet : 0);
    const totalEquity = capital + retainedEarnings;
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 10; // Allow micro-rounding

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">지능형 재무보고서</h1>
                    <p className="text-slate-400 font-bold">실시간 분개 데이터를 기반으로 자동 생성된 손익계산서와 재무상태표입니다.</p>
                </div>
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                    {isBalanced ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-black">
                        {isBalanced ? '대차 평균 원리 일치' : '대차 불일치 감지됨'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Income Statement (손익계산서) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-white">손익계산서 (P&L)</h2>
                    </div>

                    <div className="bg-[#151D2E] rounded-[32px] border border-white/5 shadow-2xl overflow-hidden divide-y divide-white/5">
                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-bold text-lg">총 매출액 (Revenue)</span>
                                <span className="text-2xl font-black text-white">₩{revenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-rose-400 border-t border-white/5 pt-4">
                                <span className="font-bold text-lg">영업 비용 (Expenses)</span>
                                <span className="text-2xl font-black">(₩{expenses.toLocaleString()})</span>
                            </div>
                        </div>
                        <div className="p-8 bg-indigo-500/5">
                            <div className="flex justify-between items-center">
                                <span className="text-indigo-400 font-black text-xl">당기순이익 (Net Income)</span>
                                <div className="text-4xl font-black text-indigo-400">₩{netIncome.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl">
                        <p className="text-sm text-indigo-300 font-bold leading-relaxed">
                            💡 해당 당기순이익 ₩{netIncome.toLocaleString()}원은 재무상태표의 이익잉여금(자본) 항목으로 즉시 통합 반영되었습니다.
                        </p>
                    </div>
                </div>

                {/* Balance Sheet (재무상태표) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-500/10 text-slate-400 rounded-lg">
                            <PieChart size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-white">재무상태표 (B/S)</h2>
                    </div>

                    <div className="bg-[#151D2E] rounded-[32px] border border-white/5 shadow-2xl overflow-hidden">
                        {/* Section Assets */}
                        <div className="p-8">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">자산 (Assets)</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300 font-bold">현금 및 현금성자산</span>
                                    <span className="font-black text-white">₩{cash.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300 font-bold">외상매출금 (Account Receivables)</span>
                                    <span className="font-black text-white">₩{ar.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-indigo-300">
                                    <span className="font-bold">고정자산 (Fixed Assets)</span>
                                    <span className="font-black">₩{fixedAssets.toLocaleString()}</span>
                                </div>
                                {vatNet < 0 && (
                                    <div className="flex justify-between items-center text-emerald-400">
                                        <span className="font-bold">미수부가가치세 (VAT Refundable)</span>
                                        <span className="font-black">₩{(-vatNet).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-white font-black text-lg">자산 총계</span>
                                    <span className="text-3xl font-black text-white">₩{totalAssets.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section Liabilities */}
                        <div className="p-8 bg-white/[0.02] border-y border-white/5">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">부채 (Liabilities)</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-orange-400">
                                    <span className="font-bold">외상매입금 (Account Payables)</span>
                                    <span className="font-black text-2xl">₩{ap.toLocaleString()}</span>
                                </div>
                                {vatNet > 0 && (
                                    <div className="flex justify-between items-center text-rose-400">
                                        <span className="font-bold">미지급부가가치세 (VAT Payable)</span>
                                        <span className="font-black text-2xl">₩{vatNet.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section Equity */}
                        <div className="p-8">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">자본 (Equity)</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300 font-bold">기초 자본금 (Capital)</span>
                                    <span className="font-black text-white">₩{capital.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-300 font-bold">이익잉여금 (Retained Earnings)</span>
                                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded uppercase">I/S 합산</span>
                                    </div>
                                    <span className="font-black text-white">₩{retainedEarnings.toLocaleString()}</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-lg">부채 및 자본 총계</span>
                                        <span className="text-[10px] text-slate-500 font-bold italic tracking-wider">Total Liabilities + Equity</span>
                                    </div>
                                    <span className="text-3xl font-black text-indigo-400">₩{(totalLiabilities + totalEquity).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
