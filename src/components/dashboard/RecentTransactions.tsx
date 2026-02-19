
import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../../types';
import { ArrowUpRight, ArrowDownLeft, Terminal, Calendar, CheckSquare, Square, ChevronRight, CheckCircle, XCircle, Filter } from 'lucide-react';
import { cleanMarkdown } from '../../utils/textUtils';
import { useAccounting } from '../../hooks/useAccounting';
import { InfoTooltip } from '../ui/InfoTooltip';

interface RecentTransactionsProps {
    transactions: JournalEntry[];
    onNavigate?: (tab: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, onNavigate }) => {
    const { bulkApprove, bulkReject } = useAccounting();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Unconfirmed' | 'Approved' | 'Rejected'>('All');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesStart = !startDate || t.date >= startDate;
            const matchesEnd = !endDate || t.date <= endDate;
            const matchesStatus = filterStatus === 'All' ? true :
                filterStatus === 'Unconfirmed' ? (t.status === 'Unconfirmed' || !t.status) :
                    t.status === filterStatus;

            return matchesStart && matchesEnd && matchesStatus;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, startDate, endDate, filterStatus]);

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkApprove = () => {
        if (selectedIds.size === 0) return;

        // Optimistic UI update or simple alert
        // In a real app, we might want a toast.
        bulkApprove(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const handleBulkReject = () => {
        if (selectedIds.size === 0) return;
        const reason = prompt("거절 사유를 입력하세요 (선택):", "관리자 거절");
        if (reason !== null) {
            bulkReject(Array.from(selectedIds), reason);
            setSelectedIds(new Set());
        }
    };

    const isInflow = (t: JournalEntry) => {
        const type = t.type;
        const desc = t.description.toLowerCase();
        const debit = t.debitAccount.toLowerCase();

        if (type === 'Expense' || type === 'Payroll') return false;
        if (type === 'Revenue' || type === 'Equity') return true;

        if (desc.includes('revenue') || desc.includes('sales') || desc.includes('매출') || desc.includes('수익') || desc.includes('입금') || desc.includes('정산')) return true;
        if (desc.includes('expense') || desc.includes('cost') || desc.includes('비용') || desc.includes('식대') || desc.includes('급여') || desc.includes('구입')) return false;

        return debit.includes('현금') || debit.includes('예금') || debit.includes('cash') || debit.includes('bank');
    };

    return (
        <div className="bg-[#151D2E] rounded-[2rem] shadow-2xl border border-white/5 h-full flex flex-col overflow-hidden relative">
            {/* Selection Toolbar (Overlay) */}
            {selectedIds.size > 0 && (
                <div className="absolute top-0 left-0 right-0 h-[88px] bg-indigo-600 z-20 flex items-center justify-between px-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4 text-white">
                        <CheckSquare className="text-white/80" />
                        <span className="text-lg font-black">{selectedIds.size}개 선택됨</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBulkApprove}
                            className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-100 transition-colors flex items-center gap-2"
                        >
                            <CheckCircle size={16} /> 승인 (Approve)
                        </button>
                        <button
                            onClick={handleBulkReject}
                            className="bg-indigo-800 text-indigo-200 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-indigo-900 transition-colors flex items-center gap-2"
                        >
                            <XCircle size={16} /> 거절 (Reject)
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/60"
                        >
                            <span className="sr-only">Cancel</span>
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Terminal size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white">트랜잭션 피드</h3>
                        <span className="text-xs font-bold text-slate-500">
                            (Displaying 50 / {filteredTransactions.length.toLocaleString()} items)
                        </span>
                        <InfoTooltip
                            title="Transaction Feed (책임 라우팅)"
                            content="AI가 생성한 전표를 검토하고 승인하는 공간입니다. 성능 최적화를 위해 최근 50건만 표시됩니다. 전체 내역은 '전체 장부' 메뉴에서 확인하세요."
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status Filter */}
                    <div className="flex items-center bg-[#0B1221] p-1 rounded-xl border border-white/5 mx-2">
                        {(['All', 'Unconfirmed', 'Approved', 'Rejected'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${filterStatus === s ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {s === 'All' ? '전체' : s === 'Unconfirmed' ? '대기' : s === 'Approved' ? '승인' : '거절'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-[#0B1221] px-3 py-1.5 rounded-xl border border-white/5">
                        <Calendar size={14} className="text-slate-500" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none p-0 focus:ring-0 w-20"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-600">~</span>
                        <input
                            type="date"
                            className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none p-0 focus:ring-0 w-20"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => onNavigate?.('ledger')}
                        className="text-xs font-black text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-all flex items-center gap-1 uppercase tracking-widest"
                    >
                        전체 장부 <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#151D2E] z-10 border-b border-white/10">
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4 w-10">
                                <button
                                    onClick={() => setSelectedIds(prev => prev.size === filteredTransactions.length ? new Set() : new Set(filteredTransactions.map(t => t.id)))}
                                    className="text-slate-500 hover:text-indigo-400 trasition-colors"
                                >
                                    <CheckSquare size={16} className={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length ? 'text-indigo-400' : ''} />
                                </button>
                            </th>
                            <th className="px-4 py-4 w-32">거래일자</th>
                            <th className="px-4 py-4">거래 내용 / 적요</th>
                            <th className="px-4 py-4 w-32 text-right">금액 (원)</th>
                            <th className="px-6 py-4 w-32 text-right">상태</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-600 font-bold italic opacity-50">
                                    {filterStatus === 'Unconfirmed' ? '확인 대기 중인 전표가 없습니다.' : '해당 기간 내역이 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.slice(0, 50).map((t) => {
                                const inflow = isInflow(t);
                                const isSelected = selectedIds.has(t.id);
                                const isRejected = t.status === 'Rejected';

                                return (
                                    <tr
                                        key={t.id}
                                        onClick={() => toggleSelect(t.id, {} as any)}
                                        className={`group hover:bg-white/5 transition-all text-sm cursor-pointer ${isSelected ? 'bg-indigo-500/5' : ''} ${isRejected ? 'opacity-50 grayscale' : ''}`}
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
                                                <span className={`text-sm font-black transition-colors ${isRejected ? 'text-slate-500 line-through' : 'text-white group-hover:text-indigo-300'}`}>
                                                    {cleanMarkdown(t.description)}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">
                                                    {t.journalNumber || t.id.slice(0, 8)} | {t.debitAccount} {t.vendor ? `| ${t.vendor}` : ''}
                                                </span>
                                                {isRejected && (
                                                    <span className="text-[10px] font-bold text-rose-400 mt-1">
                                                        {t.notes || 'Note: 사유 미기재'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono text-sm font-black ${inflow ? 'text-emerald-400' : 'text-white'}`}>
                                            {inflow ? '+' : '-'} {t.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black tracking-widest uppercase
                                                ${t.status === 'Approved' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                                    t.status === 'Rejected' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                                        'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Approved' ? 'bg-indigo-400' :
                                                    t.status === 'Rejected' ? 'bg-rose-500' :
                                                        'bg-amber-500'}`} />
                                                <span>{t.status === 'Approved' ? '승인됨' : t.status === 'Rejected' ? '거절됨' : '대기'}</span>
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
