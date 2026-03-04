import React, { useMemo, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { AgingReport } from '../components/analytics/AgingReport';
import { ClearingModal } from '../components/journal/ClearingModal';
import { JournalEntry } from '../types';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Calendar,
    Search,
    Filter,
    ShieldAlert,
    Clock,
    CheckCircle2,
    Building2,
    DollarSign,
    AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';

import { isArAccount, isApAccount, isSuspenseAccount } from '../constants/accounts';

const EntryRow = React.memo(({ e, view, onAction, formatCurrency, currentDate }: {
    e: JournalEntry,
    view: 'AR' | 'AP' | 'SUS',
    onAction: (e: JournalEntry) => void,
    formatCurrency: (v: number) => string,
    currentDate: string
}) => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const refDateStr = (view === 'SUS' || !e.dueDate) ? e.date : e.dueDate;
    const refDate = new Date(refDateStr);
    refDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((refDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;

    return (
        <tr className="hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <td className="px-8 py-5">
                {isOverdue ? (
                    <div className="flex items-center gap-2 text-rose-500">
                        <ShieldAlert size={14} />
                        <span className="text-[10px] font-black">기한초과</span>
                    </div>
                ) : e.clearingRecord?.status === 'BLOCKED' ? (
                    <div className="flex items-center gap-2 text-rose-400">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-black underline decoration-dotted">정산불가</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} />
                        <span className="text-[10px] font-black">대기중</span>
                    </div>
                )}
            </td>
            <td className="px-8 py-5">
                <div className="text-white text-sm font-black">{e.date}</div>
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1">
                    <Calendar size={10} /> {e.dueDate || '-'}
                </div>
            </td>
            <td className="px-8 py-5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Building2 size={14} className="text-slate-600" />
                    {e.description}
                    {e.clearingRecord?.status === 'BLOCKED' && (
                        <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] border border-rose-500/20 rounded-md">
                            Risk: {e.clearingRecord.reasonCode}
                        </span>
                    )}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight flex items-center gap-2">
                    {e.debitAccount} / {e.creditAccount}
                    {e.clearingRecord?.reasonText && (
                        <span className="text-rose-400/60 font-medium normal-case line-clamp-1 italic">
                            - {e.clearingRecord.reasonText}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-8 py-5 text-right font-black text-white text-sm">
                {formatCurrency(e.amount + (e.vat || 0))}
            </td>
            <td className="px-8 py-5">
                <span className={`text-[10px] font-black px-2 py-1 rounded-md ${isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-400'}`}>
                    {isOverdue ? `연체 ${Math.abs(diffDays)}일` : `D-${Math.abs(diffDays)}`}
                </span>
            </td>
            <td className="px-8 py-5 text-center">
                <button
                    onClick={() => onAction(e)}
                    className={`px-4 py-2 ${view === 'AR' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500' :
                        view === 'AP' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500' :
                            e.clearingRecord?.status === 'BLOCKED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500'} hover:text-white rounded-lg text-xs font-black transition-all border active:scale-95 flex items-center justify-center gap-2 mx-auto`}
                >
                    {view === 'AR' ? <DollarSign size={14} /> : view === 'AP' ? <CheckCircle2 size={14} /> : <CheckCircle2 size={14} />}
                    {view === 'AR' ? '수금 처리' : view === 'AP' ? '지급 승인' : (e.clearingRecord?.status === 'BLOCKED' ? '재정산(Retry)' : '정산(Clearing)')}
                </button>
            </td>
        </tr>
    );
});

export const ArApManagement: React.FC = () => {
    const { ledger, financials, addEntry, updateEntry, performClearing, systemNow } = useAccounting();
    const [view, setView] = useState<'AR' | 'AP' | 'SUS'>('AR');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [displayCount, setDisplayCount] = useState(100);

    const effectiveDateStr = systemNow || new Date().toISOString().split('T')[0];

    const unsettledEntries = useMemo(() => {
        return ledger.filter(e => {
            // Point-in-time: Hide future entries
            if (e.date > effectiveDateStr) return false;

            // Point-in-time: Check settlement status relative to effective date
            // If it was settled AFTER the effective date, it is still "Unsettled" in the past view
            const isSettledByThen = e.isSettled && (e.settledDate ? e.settledDate <= effectiveDateStr : true);
            if (isSettledByThen) return false;

            // Include both Approved and Unconfirmed for a full view of obligations
            if (e.status !== 'Approved' && e.status !== 'Unconfirmed') return false;

            const isAr = isArAccount(e.debitAccount);
            const isAp = isApAccount(e.creditAccount);
            const isSus = isSuspenseAccount(e.debitAccount) || isSuspenseAccount(e.creditAccount);

            if (view === 'AR') return isAr;
            if (view === 'AP') return isAp;
            return isSus;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [ledger, view, effectiveDateStr]);

    const stats = useMemo(() => {
        const total = unsettledEntries.reduce((s, e) => s + ((e.amount || 0) + (e.vat || 0)), 0);
        const today = new Date(effectiveDateStr);
        today.setHours(0, 0, 0, 0);

        const overdue = unsettledEntries.filter(e => {
            const refDateStr = (!e.dueDate) ? e.date : e.dueDate;
            const refDate = new Date(refDateStr);
            refDate.setHours(0, 0, 0, 0);
            return refDate < today;
        }).length;

        return { total, count: unsettledEntries.length, overdue };
    }, [unsettledEntries]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Sticky Page Header */}
            <header className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        {view === 'AR' ? <ArrowDownLeft className="text-emerald-400" /> : <ArrowUpRight className="text-rose-400" />}
                        {view === 'AR' ? '매출채권(AR) 관리' : view === 'AP' ? '매입채무(AP) 관리' : '가계정(Suspense) 정산'}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {view === 'SUS' ? 'Suspense Account Clearing & Management' : 'Outstanding Invoices & Aging Analysis'}
                    </p>
                </div>
                <div className="flex bg-[#151D2E] p-1 rounded-2xl border border-white/10 shadow-inner">
                    <button
                        onClick={() => setView('AR')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${view === 'AR' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        RECEIVABLES
                    </button>
                    <button
                        onClick={() => setView('AP')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${view === 'AP' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        PAYABLES
                    </button>
                    <button
                        onClick={() => setView('SUS')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${view === 'SUS' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        SUSPENSE
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">총 미결제 금액</p>
                    <h4 className="text-3xl font-black text-white">{formatCurrency(stats.total)}</h4>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <DollarSign size={64} />
                    </div>
                </div>
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">미결제 건수</p>
                    <h4 className="text-3xl font-black text-white">{stats.count}건</h4>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Clock size={64} />
                    </div>
                </div>
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">기한 도과(연체)</p>
                    <h4 className={`text-3xl font-black ${stats.overdue > 0 ? (view === 'AR' ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                        {stats.overdue}건
                    </h4>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldAlert size={64} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Clock className="text-indigo-400" size={20} />
                            Aging Report (미결제 연령 분석)
                        </h3>
                    </div>
                    <AgingReport entries={ledger} type={view} systemNow={effectiveDateStr} />
                </div>

                <div className="bg-[#151D2E]/50 p-8 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                    <ShieldAlert size={48} className="text-slate-600 mb-4" />
                    <h4 className="text-white font-black text-lg mb-2">기한 관리 경보</h4>
                    <p className="text-slate-500 text-sm font-bold">
                        {stats.overdue > 0
                            ? `${stats.overdue}건의 거래가 결제 기한을 보냈습니다. 즉각적인 조치가 필요합니다.`
                            : "모든 미결제 항목이 결제 기한 내에 있습니다."}
                    </p>
                    {stats.overdue > 0 && (
                        <button className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-black transition-all">
                            연체 독촉 이메일 발송
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white">미결제 상세 리스트</h3>
                    <div className="flex items-center gap-4">
                        {unsettledEntries.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm(`현재 리스트의 ${unsettledEntries.length}건을 모두 일괄 ${view === 'AR' ? '수금' : '지급'} 처리하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 항목에 대한 개별 현금 전표가 생성됩니다.`)) {
                                        unsettledEntries.forEach(entry => {
                                            updateEntry(entry.id, { isSettled: true, settledDate: effectiveDateStr });
                                            addEntry({
                                                id: crypto.randomUUID(),
                                                date: effectiveDateStr,
                                                description: `[일괄${view === 'AR' ? '수금' : '지급'}] ${entry.description}`,
                                                vendor: entry.vendor || '',
                                                debitAccount: view === 'AR' ? '보통예금' : entry.creditAccount,
                                                creditAccount: view === 'AR' ? entry.debitAccount : '보통예금',
                                                amount: entry.amount + (entry.vat || 0),
                                                vat: 0,
                                                type: view === 'AR' ? 'Asset' : 'Liability',
                                                status: 'Approved',
                                                createdAt: new Date().toISOString(),
                                                journalNumber: 'TEST-BATCH',
                                                sequenceNumber: 0
                                            });
                                        });
                                        alert(`${unsettledEntries.length}건의 일괄 처리가 완료되었습니다.`);
                                    }
                                }}
                                className={`px-4 py-2 border rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-2 ${view === 'AR'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-lg shadow-emerald-500/10'
                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white shadow-lg shadow-rose-500/10'
                                    }`}
                            >
                                <CheckCircle2 size={14} />
                                전체 일괄 {view === 'AR' ? '수금' : '지급'} 승인 (TEST)
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="거래처/내용 검색..."
                                className="bg-[#0B1221] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <button className="p-2 bg-[#0B1221] border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0B1221]/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-8 py-4">상태</th>
                                <th className="px-8 py-4">날짜 / 기한</th>
                                <th className="px-8 py-4">거래처 / 적요</th>
                                <th className="px-8 py-4 text-right">금액 (KRW)</th>
                                <th className="px-8 py-4">D-Day</th>
                                <th className="px-8 py-4 text-center">조치 (Action)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {unsettledEntries.slice(0, displayCount).map((e) => (
                                <EntryRow
                                    key={e.id}
                                    e={e}
                                    view={view}
                                    formatCurrency={formatCurrency}
                                    currentDate={effectiveDateStr}
                                    onAction={(entry) => setSelectedEntry(entry)}
                                />
                            ))}
                            {unsettledEntries.length > displayCount && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-10 text-center">
                                        <button
                                            onClick={() => setDisplayCount(prev => prev + 200)}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black transition-all border border-white/5 active:scale-95"
                                        >
                                            더 보기 (+200건) - 총 {unsettledEntries.length}건 중 {displayCount}건 표시 중
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {unsettledEntries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-600 font-bold italic">
                                        미결제 항목이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedEntry && (
                <ClearingModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    onConfirm={(targetAccount, metadata, overrideDate) => {
                        performClearing(selectedEntry.id, targetAccount, metadata, overrideDate);
                        setSelectedEntry(null);
                    }}
                />
            )}
        </div>
    );
};
