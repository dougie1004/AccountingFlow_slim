import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../../types';
import { ArrowUpRight, ArrowDownLeft, Terminal, Calendar, CheckSquare, Square, ChevronRight } from 'lucide-react';
import { cleanMarkdown } from '../../utils/textUtils';

interface RecentTransactionsProps {
    transactions: JournalEntry[];
    onNavigate?: (tab: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, onNavigate }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesStart = !startDate || t.date >= startDate;
            const matchesEnd = !endDate || t.date <= endDate;
            return matchesStart && matchesEnd;
        });
    }, [transactions, startDate, endDate]);

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const isInflow = (t: JournalEntry) => {
        const type = t.type;
        const desc = t.description.toLowerCase();
        const debit = t.debitAccount.toLowerCase();

        // 1. Explicit Type Check
        if (type === 'Expense' || type === 'Payroll') return false;
        if (type === 'Revenue' || type === 'Equity') return true;

        // 2. Description Heuristics (Override for ambiguous types)
        if (desc.includes('revenue') || desc.includes('sales') || desc.includes('매출') || desc.includes('수익') || desc.includes('입금') || desc.includes('정산')) return true;
        if (desc.includes('expense') || desc.includes('cost') || desc.includes('비용') || desc.includes('식대') || desc.includes('급여') || desc.includes('구입')) return false;

        // 3. Asset Flow Logic (Debit Cash = Inflow)
        return debit.includes('현금') || debit.includes('예금') || debit.includes('cash') || debit.includes('bank');
    };

    return (
        <div className="bg-[#151D2E] rounded-[2rem] shadow-2xl border border-white/5 h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Terminal size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">Transactional Ledger Snapshot</h3>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#0B1221] px-3 py-1.5 rounded-xl border border-white/5">
                        <Calendar size={14} className="text-slate-500" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none p-0 focus:ring-0"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-600">~</span>
                        <input
                            type="date"
                            className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none p-0 focus:ring-0"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => onNavigate?.('ledger')}
                        className="text-xs font-black text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-all flex items-center gap-1 uppercase tracking-widest"
                    >
                        CONSOLE <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#151D2E] z-10 border-b border-white/10">
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4 w-10">SEL</th>
                            <th className="px-4 py-4 w-32">TIMESTAMP</th>
                            <th className="px-4 py-4">DESCRIPTION / COUNTERPARTY</th>
                            <th className="px-4 py-4 w-32 text-right">AMOUNT (KRW)</th>
                            <th className="px-6 py-4 w-32 text-right">GOVERNANCE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-600 font-bold italic opacity-50">
                                    No transaction records found for the selected period.
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((t) => {
                                const inflow = isInflow(t);
                                const isSelected = selectedIds.has(t.id);

                                return (
                                    <tr
                                        key={t.id}
                                        onClick={() => onNavigate?.('ledger')}
                                        className={`group hover:bg-white/5 transition-all cursor-pointer ${isSelected ? 'bg-indigo-500/5' : ''}`}
                                    >
                                        <td className="px-6 py-3">
                                            <button
                                                onClick={(e) => toggleSelect(t.id, e)}
                                                className={`transition-colors ${isSelected ? 'text-indigo-400' : 'text-slate-700 group-hover:text-slate-400'}`}
                                            >
                                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-400">
                                            {t.date}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                                                    {cleanMarkdown(t.description)}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">
                                                    ID: {t.id.slice(0, 8)} | VENDOR: {t.vendor || 'INTERNAL'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono text-sm font-black ${inflow ? 'text-emerald-400' : 'text-white'}`}>
                                            {inflow ? '+' : '-'} {t.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/5 bg-black/20">
                                                <div className={`w-1 h-1 rounded-full ${t.status === 'Approved' ? 'bg-indigo-400' : 'bg-amber-500'}`} />
                                                <span className={`text-[9px] font-black tracking-widest ${t.status === 'Approved' ? 'text-indigo-400/80' : 'text-amber-500/80'}`}>
                                                    {t.status === 'Approved' ? 'VERIFIED' : 'PENDING'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
