import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../../types';
import { ArrowUpRight, ArrowDownLeft, Clock, Calendar, CheckSquare, Square, ChevronRight } from 'lucide-react';
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
        const debit = t.debitAccount.toLowerCase();
        const type = t.type;
        return type === 'Revenue' || type === 'Equity' ||
            debit.includes('현금') || debit.includes('예금') || debit.includes('cash') || debit.includes('bank');
    };

    return (
        <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 h-full flex flex-col">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Clock size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">최근 거래 내역</h3>
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
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                    >
                        전체 보기 <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-2">
                {filteredTransactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                        <p className="text-sm font-bold italic opacity-50">해당 기간의 거래 내역이 없습니다</p>
                    </div>
                ) : (
                    filteredTransactions.map((t) => {
                        const inflow = isInflow(t);
                        const isSelected = selectedIds.has(t.id);

                        return (
                            <div
                                key={t.id}
                                onClick={() => onNavigate?.('ledger')}
                                className={`group flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 cursor-pointer ${isSelected ? 'bg-indigo-500/5 border-indigo-500/20' : ''}`}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <button
                                        onClick={(e) => toggleSelect(t.id, e)}
                                        className={`transition-colors ${isSelected ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`}
                                    >
                                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>

                                    <div className={`p-2.5 rounded-xl ${inflow ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {inflow ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-black text-white text-sm truncate group-hover:text-indigo-300 transition-colors">
                                            {cleanMarkdown(t.description)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded uppercase tracking-wider">
                                                {t.vendor || '내부 정산'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold font-mono">{t.date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0 ml-4">
                                    <p className={`font-black text-base font-mono ${inflow ? 'text-emerald-400' : 'text-white'}`}>
                                        {inflow ? '+' : '-'}₩{t.amount.toLocaleString()}
                                    </p>
                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Approved' ? 'bg-indigo-400' : 'bg-amber-500'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'Approved' ? 'text-indigo-400/80' : 'text-amber-500/80'}`}>
                                            {t.status === 'Approved' ? 'CERTIFIED' : 'PENDING'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
