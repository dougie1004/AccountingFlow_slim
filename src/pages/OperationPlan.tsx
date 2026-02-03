
import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { STANDARD_ACCOUNTS } from '../constants/accounts';
import { BudgetItem } from '../types';
import { Calendar, Save, RotateCcw, TrendingUp, AlertCircle, CheckCircle2, DollarSign, Calculator, Target } from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';

export const OperationPlan: React.FC = () => {
    const { budgets, setBudget, ledger } = useAccounting();

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
                .filter(e => e.date.startsWith(prevPeriod) && e.status === 'Approved')
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

    // 6. Summary Metrics of the Draft
    const totalBudget = draftItems.reduce((sum, i) => sum + i.budgetAmount, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Target className="text-rose-500" size={32} />
                        운영 계획 수립 (Operation Plan)
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">
                        월별 예산(Budget)을 설정하여 계획 대비 실적(BvA) 분석을 수행합니다.
                    </p>
                </div>
                <div className="flex bg-[#151D2E] p-1 rounded-2xl border border-white/5">
                    <input
                        type="month"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-transparent text-white font-black px-4 py-2 border-none focus:ring-0 outline-none"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-4 shadow-xl shadow-rose-500/20">
                        <DollarSign size={32} />
                    </div>
                    <div className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Total Budget</div>
                    <div className="text-4xl font-black text-white tracking-tighter">
                        {formatCurrency(totalBudget)}
                    </div>
                    <div className="mt-4 flex gap-2 w-full">
                        <button
                            onClick={handleAutoSuggest}
                            className="flex-1 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-black rounded-xl border border-indigo-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Calculator size={14} />
                            AI 자동 제안
                        </button>
                    </div>
                </div>

                {/* Budget Form */}
                <div className="lg:col-span-2 bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0B1221]/50">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" /> {selectedPeriod} 예산 상세 설정
                        </h3>
                        {isDirty && (
                            <span className="text-[10px] font-black text-amber-500 flex items-center gap-1 animate-pulse">
                                <AlertCircle size={10} /> Unsaved Changes
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#151D2E] z-10 shadow-sm">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <th className="px-6 py-3">계정 과목 (Account)</th>
                                    <th className="px-6 py-3 text-right">예산 금액 (Plan)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {draftItems.map((item) => (
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
                                                    className="bg-[#0B1221] text-white text-right font-black px-4 py-2 rounded-xl border border-white/10 focus:ring-1 focus:ring-rose-500 outline-none w-48 transition-all group-hover:border-white/20"
                                                    step={10000}
                                                />
                                                <span className="text-slate-600 text-xs font-bold w-4">원</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-[#0B1221]/30 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${isDirty
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            <Save size={18} />
                            운영 계획 저장하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
