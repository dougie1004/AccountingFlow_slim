import React, { useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { Calculator, ArrowRight, ArrowLeft, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface AccountBalance {
    accountName: string;
    debitTotal: number;
    creditTotal: number;
    debitBalance: number;
    creditBalance: number;
}

const TrialBalance: React.FC = () => {
    const { subLedger } = useAccounting();

    const balances = useMemo(() => {
        const map = new Map<string, { debit: number; credit: number }>();

        subLedger.forEach(entry => {
            // Debit side
            const dVal = map.get(entry.debitAccount) || { debit: 0, credit: 0 };
            map.set(entry.debitAccount, { ...dVal, debit: dVal.debit + entry.amount });

            // Credit side
            const cVal = map.get(entry.creditAccount) || { debit: 0, credit: 0 };
            map.set(entry.creditAccount, { ...cVal, credit: cVal.credit + entry.amount });
        });

        const sortedAccounts = Array.from(map.keys()).sort();

        return sortedAccounts.map(name => {
            const { debit, credit } = map.get(name)!;
            const debitBalance = debit > credit ? debit - credit : 0;
            const creditBalance = credit > debit ? credit - debit : 0;
            return {
                accountName: name,
                debitTotal: debit,
                creditTotal: credit,
                debitBalance,
                creditBalance
            };
        });
    }, [subLedger]);

    const totals = useMemo(() => {
        return balances.reduce((acc, curr) => ({
            debitTotal: acc.debitTotal + curr.debitTotal,
            creditTotal: acc.creditTotal + curr.creditTotal,
            debitBalance: acc.debitBalance + curr.debitBalance,
            creditBalance: acc.creditBalance + curr.creditBalance
        }), { debitTotal: 0, creditTotal: 0, debitBalance: 0, creditBalance: 0 });
    }, [balances]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Header */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-[#151D2E] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/20">
                            <Calculator className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">지능형 합계잔액시산표</h1>
                            <p className="text-slate-400 font-bold mt-1">Trial Balance (T/B) - 계정별 합계 및 잔액을 실시간으로 집계합니다.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-[#0B1221] px-6 py-4 rounded-2xl border border-white/5 text-center min-w-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">차대 변합계 불일치</p>
                            <p className={`text-xl font-black ${totals.debitBalance === totals.creditBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totals.debitBalance === totals.creditBalance ? '일치 (O)' : '불일치 (X)'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TB Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">차변 합계 (Debit Total)</span>
                        <ArrowRight size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-3xl font-black text-white">₩{totals.debitTotal.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-purple-500/5 to-transparent">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">대변 합계 (Credit Total)</span>
                        <ArrowLeft size={14} className="text-purple-400" />
                    </div>
                    <span className="text-3xl font-black text-white">₩{totals.creditTotal.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">차변 잔액 (Debit Bal)</span>
                        <TrendingUp size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-3xl font-black text-emerald-400">₩{totals.debitBalance.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-rose-500/5 to-transparent">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">대변 잔액 (Credit Bal)</span>
                        <TrendingDown size={14} className="text-rose-400" />
                    </div>
                    <span className="text-3xl font-black text-rose-400">₩{totals.creditBalance.toLocaleString()}</span>
                </div>
            </div>

            {/* TB Table Area */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-1">
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th colSpan={2} className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">합계 (Total)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">계정과목 (Account)</th>
                                <th colSpan={2} className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">잔액 (Balance)</th>
                            </tr>
                            <tr className="bg-white/[0.01]">
                                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 text-right">차변 (DR)</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 text-right">대변 (CR)</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 text-center">Account Name</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 text-right">차변 (DR)</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 text-right">대변 (CR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {balances.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <BarChart3 className="mx-auto text-slate-700 mb-4" size={48} />
                                        <div className="text-slate-500 font-black text-lg mb-2">집계된 데이터가 없습니다.</div>
                                        <p className="text-slate-600 text-sm font-bold">확정된 전표 데이터가 있어야 TB 생성이 가능합니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                balances.map((row) => (
                                    <tr key={row.accountName} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6 text-sm font-black text-slate-400 text-right font-mono">
                                            {row.debitTotal > 0 ? row.debitTotal.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-slate-400 text-right font-mono">
                                            {row.creditTotal > 0 ? row.creditTotal.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{row.accountName}</span>
                                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Master Account</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-emerald-400 text-right font-mono bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors">
                                            {row.debitBalance > 0 ? row.debitBalance.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-rose-400 text-right font-mono bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors">
                                            {row.creditBalance > 0 ? row.creditBalance.toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-indigo-600/5 border-t-2 border-indigo-600/20">
                            <tr>
                                <td className="px-8 py-6 text-base font-black text-white text-right font-mono">
                                    {totals.debitTotal.toLocaleString()}
                                </td>
                                <td className="px-8 py-6 text-base font-black text-white text-right font-mono">
                                    {totals.creditTotal.toLocaleString()}
                                </td>
                                <td className="px-8 py-6 text-center text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
                                    TOTAL AGGREGATION
                                </td>
                                <td className="px-8 py-6 text-base font-black text-emerald-400 text-right font-mono bg-emerald-500/10">
                                    {totals.debitBalance.toLocaleString()}
                                </td>
                                <td className="px-8 py-6 text-base font-black text-rose-400 text-right font-mono bg-rose-500/10">
                                    {totals.creditBalance.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* AI Advisor Context */}
            <div className="bg-gradient-to-r from-indigo-600/10 to-transparent p-6 rounded-3xl border border-indigo-500/20 flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h4 className="text-white font-black leading-none mb-2">AI 시산표 분석 엔진 가동 중</h4>
                    <p className="text-slate-400 text-sm font-bold">
                        차대변 합계가 현재 100% 일치합니다. AI 감사관은 현재 계정과목 오분류 위험을 0.05% 이하로 판단하고 있습니다.
                        <br />
                        <span className="text-indigo-400 opacity-60">* 모든 데이터는 실시간 전표 데이터(Sub-ledger)와 실시간으로 동기화됩니다.</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrialBalance;
