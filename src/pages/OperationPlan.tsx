
import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { STANDARD_ACCOUNTS } from '../constants/accounts';
import { BudgetItem } from '../types';
import { Calendar, Save, RotateCcw, TrendingUp, AlertCircle, CheckCircle2, DollarSign, Calculator, Target } from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';
import { PremiumMonthPicker } from '../components/ui/PremiumMonthPicker';

export const OperationPlan: React.FC = () => {
    const { budgets, setBudget, ledger, systemNow } = useAccounting();

    // 1. Selector State
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // 2. Budget Editing State
    // We initialize this whenever selectedPeriod changes or budgets change
    const [draftItems, setDraftItems] = useState<BudgetItem[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    // 3. Derived Data: Expense Accounts
    const expenseAccounts = useMemo(() =>
        STANDARD_ACCOUNTS
            .filter(a => a.category === 'Expense')
            .sort((a, b) => a.sortOrder - b.sortOrder),
        []);

    // 4. Load Logic
    useEffect(() => {
        const savedBudget = budgets.find(b => b.period === selectedPeriod);

        // Initialize draft items with either saved values or 0
        const initialItems = expenseAccounts.map(acc => {
            const savedItem = savedBudget?.items.find(i => i.accountCategory === acc.name);
            return {
                accountCategory: acc.name,
                budgetAmount: savedItem ? savedItem.budgetAmount : 0
            };
        });

        setDraftItems(initialItems);
        setIsDirty(false);
    }, [selectedPeriod, budgets, expenseAccounts]);

    // 5. Handlers
    const handleAmountChange = (accountName: string, amount: number) => {
        setDraftItems(prev => prev.map(item =>
            item.accountCategory === accountName ? { ...item, budgetAmount: amount } : item
        ));
        setIsDirty(true);
    };

    const handleSave = () => {
        setBudget(selectedPeriod, draftItems);
        setIsDirty(false);
        alert(`✅ ${selectedPeriod} 운영 계획(예산)이 저장되었습니다.`);
    };

    const handleAutoSuggest = () => {
        // AI Logic: "Use Last Month's Actuals + 5% buffer"
        const prevDate = new Date(`${selectedPeriod}-01`);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevPeriod = prevDate.toISOString().substring(0, 7);

        const newItems = draftItems.map(item => {
            // Find actuals from ledger for previous period
            const actual = ledger
                .filter(e => (!systemNow || e.date <= systemNow) && e.date.startsWith(prevPeriod) && e.status === 'Approved')
                .filter(e => e.debitAccount === item.accountCategory || e.description.includes(item.accountCategory))
                .reduce((sum, e) => sum + e.amount, 0);

            // Suggestion: Round to nearest 10,000
            const suggested = Math.ceil(Math.max(actual, 0) / 10000) * 10000;
            return { ...item, budgetAmount: suggested };
        });

        setDraftItems(newItems);
        setIsDirty(true);
        alert(`💡 지난 달(${prevPeriod}) 실적을 기반으로 예산안을 제안했습니다.`);
    };

    // 6. Summary Metrics of the Draft & Actuals
    const actualItems = useMemo(() => {
        return expenseAccounts.map(acc => {
            const actual = ledger
                .filter(e => (!systemNow || e.date <= systemNow) && e.date.startsWith(selectedPeriod) && e.status === 'Approved')
                .filter(e => e.debitAccount === acc.name || e.description.includes(acc.name))
                .reduce((sum, e) => sum + e.amount, 0);
            return { accountCategory: acc.name, actualAmount: actual };
        });
    }, [selectedPeriod, ledger, expenseAccounts, systemNow]);

    const totalBudget = draftItems.reduce((sum, i) => sum + i.budgetAmount, 0);
    const totalActual = actualItems.reduce((sum, i) => sum + i.actualAmount, 0);
    const totalVariance = totalBudget - totalActual;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Target className="text-rose-500" size={32} />
                        운영 계획 및 실적 분석 (BvA Analysis)
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">
                        월별 예산(Budget) 대비 실제 지출(Actual) 내역을 비교 분석하여 재무 건전성을 점검합니다.
                    </p>
                </div>
                <PremiumMonthPicker
                    value={selectedPeriod}
                    onChange={(date) => setSelectedPeriod(date)}
                />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Summary Card */}
                <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-rose-500 group-hover:scale-110 transition-transform">
                        <Calculator size={100} />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Budget vs Actual Summary</div>

                        <div className="space-y-6">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 mb-1">Total Plan (Budget)</div>
                                <div className="text-3xl font-black text-white tracking-tighter">{formatCurrency(totalBudget)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 mb-1">Total Spend (Actual)</div>
                                <div className="text-3xl font-black text-indigo-400 tracking-tighter">{formatCurrency(totalActual)}</div>
                            </div>
                            <div className={`p-4 rounded-2xl border ${totalVariance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                <div className="text-[10px] font-bold text-slate-400 mb-1">Variance (Savings)</div>
                                <div className={`text-2xl font-black ${totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={handleAutoSuggest}
                            className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-black rounded-2xl border border-indigo-500/20 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Calculator size={14} />
                            AI 지출 데이터 기반 예산 제안
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs transition-all shadow-xl ${isDirty
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            <Save size={16} />
                            운영 계획 확정 저장
                        </button>
                    </div>
                </div>

                {/* Budget Form */}
                <div className="lg:col-span-3 bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0B1221]/50">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Target size={18} className="text-rose-500" /> 세부 지출 계획 및 집행 현황 ({selectedPeriod})
                        </h3>
                        {isDirty && (
                            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 flex items-center gap-1 animate-pulse">
                                <AlertCircle size={10} /> 수정 중 (저장 필요)
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2 custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 bg-[#0B1221] z-10">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b border-white/5">계정 과목</th>
                                    <th className="px-6 py-4 border-b border-white/5 text-right">계획 (PLAN)</th>
                                    <th className="px-6 py-4 border-b border-white/5 text-right">집행 (ACTUAL)</th>
                                    <th className="px-6 py-4 border-b border-white/5 text-right">차이 (DIFF)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {draftItems.map((item) => {
                                    const actual = actualItems.find(a => a.accountCategory === item.accountCategory)?.actualAmount || 0;
                                    const diff = item.budgetAmount - actual;
                                    const isOver = diff < 0;

                                    return (
                                        <tr key={item.accountCategory} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-300">{item.accountCategory}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="number"
                                                        value={item.budgetAmount}
                                                        onChange={(e) => handleAmountChange(item.accountCategory, Number(e.target.value))}
                                                        className="bg-[#0B1221] text-white text-right font-black px-4 py-2 rounded-xl border border-white/10 focus:ring-1 focus:ring-rose-500 outline-none w-36 transition-all group-hover:border-white/20"
                                                        step={10000}
                                                    />
                                                    <span className="text-slate-600 text-[10px] font-bold w-4">원</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm font-black text-indigo-400">
                                                    {formatCurrency(actual)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-sm font-black flex items-center justify-end gap-1 ${isOver ? 'text-rose-400' : diff > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                    {isOver ? <TrendingUp size={12} className="rotate-0" /> : diff > 0 ? <TrendingUp size={12} className="rotate-180" /> : null}
                                                    {formatCurrency(Math.abs(diff))}
                                                    <span className="text-[10px] opacity-70 ml-1">
                                                        {isOver ? '(초과)' : diff > 0 ? '(절감)' : ''}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-rose-500/5 text-center">
                        <p className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1">
                            <AlertCircle size={10} /> 집행 금액은 현재 장부(Ledger)에 기록되어 승인된 실지출 데이터를 기반으로 자동 집계됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
};
