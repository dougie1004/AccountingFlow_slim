import React, { useMemo, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { AgingReport } from '../components/analytics/AgingReport';
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
    DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';

import { isArAccount, isApAccount } from '../constants/accounts';

export const ArApManagement: React.FC = () => {
    const { ledger, financials, addEntry, updateEntry } = useAccounting();
    const [view, setView] = useState<'AR' | 'AP'>('AR');

    const unsettledEntries = useMemo(() => {
        return ledger.filter(e => {
            if (e.isSettled) return false;
            // Include both Approved and Unconfirmed for a full view of obligations
            if (e.status !== 'Approved' && e.status !== 'Unconfirmed') return false;

            const isAr = isArAccount(e.debitAccount);
            const isAp = isApAccount(e.creditAccount);
            return view === 'AR' ? isAr : isAp;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [ledger, view]);

    const stats = useMemo(() => {
        const total = unsettledEntries.reduce((s, e) => s + ((e.amount || 0) + (e.vat || 0)), 0);
        const overdue = unsettledEntries.filter(e => e.dueDate && new Date(e.dueDate) < new Date()).length;
        return { total, count: unsettledEntries.length, overdue };
    }, [unsettledEntries]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        {view === 'AR' ? <ArrowDownLeft className="text-emerald-400" /> : <ArrowUpRight className="text-rose-400" />}
                        {view === 'AR' ? '매출채권(AR) 관리' : '매입채무(AP) 관리'}
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">미결제 항목 및 연체 현황을 분석합니다.</p>
                </div>
                <div className="flex bg-[#151D2E] p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setView('AR')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'AR' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        매출채권 (Receivables)
                    </button>
                    <button
                        onClick={() => setView('AP')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'AP' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        매입채무 (Payables)
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
                    <AgingReport entries={ledger} type={view} />
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
                            {unsettledEntries.map((e) => {
                                const today = new Date();
                                const dueDate = e.dueDate ? new Date(e.dueDate) : null;
                                const diffDays = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                const isOverdue = diffDays !== null && diffDays < 0;

                                return (
                                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            {isOverdue ? (
                                                <div className="flex items-center gap-2 text-rose-500">
                                                    <ShieldAlert size={14} />
                                                    <span className="text-[10px] font-black">기한초과</span>
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
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                                                {e.debitAccount} / {e.creditAccount}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-white text-sm">
                                            {formatCurrency(e.amount + (e.vat || 0))}
                                        </td>
                                        <td className="px-8 py-5">
                                            {diffDays !== null ? (
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-md ${isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-400'}`}>
                                                    {isOverdue ? `연체 ${Math.abs(diffDays)}일` : `D-${diffDays}`}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {view === 'AR' ? (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`'${e.description}' 건에 대한 수금 처리를 진행하시겠습니까?`)) {
                                                            updateEntry(e.id, { isSettled: true });
                                                            addEntry({
                                                                id: crypto.randomUUID(),
                                                                date: new Date().toISOString().split('T')[0],
                                                                description: `[수금] ${e.description}`,
                                                                vendor: e.vendor || '',
                                                                debitAccount: '보통예금',
                                                                creditAccount: e.debitAccount, // Offset AR Account
                                                                amount: e.amount + (e.vat || 0),
                                                                vat: 0,
                                                                type: 'Asset',
                                                                status: 'Approved'
                                                            });
                                                            alert('수금 처리가 완료되었습니다.');
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-xs font-black transition-all border border-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                                >
                                                    <DollarSign size={14} /> 수금 처리
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`'${e.description}' 건에 대한 지급 승인을 진행하시겠습니까?`)) {
                                                            updateEntry(e.id, { isSettled: true });
                                                            addEntry({
                                                                id: crypto.randomUUID(),
                                                                date: new Date().toISOString().split('T')[0],
                                                                description: `[지급] ${e.description}`,
                                                                vendor: e.vendor || '',
                                                                debitAccount: e.creditAccount, // Offset AP
                                                                creditAccount: '보통예금',
                                                                amount: e.amount + (e.vat || 0),
                                                                vat: 0,
                                                                type: 'Liability',
                                                                status: 'Approved'
                                                            });
                                                            alert('지급 처리가 완료되었습니다.');
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg text-xs font-black transition-all border border-rose-500/20 active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                                >
                                                    <CheckCircle2 size={14} /> 지급 승인
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
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
        </div>
    );
};
