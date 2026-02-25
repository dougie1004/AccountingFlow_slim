import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAccounting } from '../hooks/useAccounting';
import {
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    AlertCircle,
    CheckCircle,
    FileText,
    Clock,
    Download,
    Upload
} from 'lucide-react';
import { JournalEntry } from '../types';
import { TransactionDetailModal } from '../components/modals/TransactionDetailModal';
import { SmartExcelUploader } from '../components/SmartExcelUploader';
import { calculateDailyCashFlow } from '../bridge/StrategicBridge';
import { isArAccount, isApAccount, isCashAccount } from '../constants/accounts';

type ViewMode = 'daily' | 'receivables' | 'payables';

export const DailyCashReport: React.FC = () => {
    const { ledger, financials, config, addEntries, addEntry, updateEntry, systemNow, setSystemNow } = useAccounting();
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [actualBalance, setActualBalance] = useState<number>(0);
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [showUpload, setShowUpload] = useState(false);

    const selectedDate = systemNow;
    const setSelectedDate = setSystemNow;



    const handleSmartUpload = (newEntries: JournalEntry[]) => {
        addEntries(newEntries);
        alert(`${newEntries.length}건의 거래내역이 업로드되었습니다.\n'전표 승인 데스크'로 이동하여 계정을 확정해주세요.`);
        setShowUpload(false);
    };

    // --- Computed Data ---

    // --- Computed Data ---

    // ...

    // 1. Daily Cash Logic (Single Source of Truth)
    const openingBalance = useMemo(() => {
        if (!config.initialBalances) return 0;
        return config.initialBalances
            .filter(ib => isCashAccount(ib.account))
            .reduce((sum, ib) => sum + ib.amount, 0);
    }, [config.initialBalances]);

    const cashSummary = useMemo(() => {
        return calculateDailyCashFlow(ledger, selectedDate, openingBalance);
    }, [ledger, selectedDate, openingBalance]);

    // Sync actual balance with calculated book balance when date changes
    React.useEffect(() => {
        setActualBalance(cashSummary.endBalance);
    }, [cashSummary.endBalance]);

    // 2. Receivables (AR) - Aging Analysis
    const receivables = useMemo(() => {
        return ledger.filter(e => {
            // Point-in-time filtering: only items occurred on or before selectedDate
            if (e.date > selectedDate) return false;

            return e.status === 'Approved' && isArAccount(e.debitAccount) && !e.isSettled;
        }).map(e => {
            const dueDate = e.dueDate || e.date;
            const daysOverdue = Math.floor((new Date(selectedDate).getTime() - new Date(dueDate).getTime()) / (1000 * 3600 * 24));
            return { ...e, daysOverdue, dueDate } as any;
        }).sort((a, b) => b.daysOverdue - a.daysOverdue);
    }, [ledger, selectedDate]);

    // 3. Payables (AP) - Upcoming Payments
    const payables = useMemo(() => {
        return ledger.filter(e => {
            // Point-in-time filtering
            if (e.date > selectedDate) return false;

            return e.status === 'Approved' && isApAccount(e.creditAccount) && !e.isSettled;
        }).map(e => {
            const dueDate = e.dueDate || e.date;
            const daysUntilDue = Math.floor((new Date(dueDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 3600 * 24));
            return { ...e, daysUntilDue, dueDate } as any;
        }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    }, [ledger, selectedDate]);

    const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-500 rounded-lg">
                            <Wallet className="text-white" size={20} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Financial Control Center</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">자금일보 (Daily Cash Report)</h1>
                    <p className="text-slate-400 font-bold mt-1">
                        {selectedDate} 기준 자금 흐름 및 시재 마감
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex items-center gap-2 bg-[#151D2E] text-white px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group"
                    >
                        <Upload size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold">엑셀 업로드 (Smart)</span>
                    </button>

                    <div className="flex items-center gap-4 bg-[#151D2E] p-1.5 rounded-xl border border-white/10">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-white font-bold text-sm px-4 py-2 outline-none"
                        />
                        <button className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors">
                            <Calendar size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Core Logic Visualizer: The "Accounting Equation" for Cash */}
            {/* Prev + In - Out = End */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {/* 1. Prev Balance */}
                <div className="bg-[#151D2E] p-6 rounded-3xl border border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">전일 잔액 (Yesterday)</p>
                    <h2 className="text-2xl font-black text-slate-300">{formatCurrency(cashSummary.prevBalance)}</h2>
                </div>

                {/* 2. Today In/Out (Center Stage) */}
                <div className="col-span-2 grid grid-cols-2 gap-4 bg-[#151D2E] p-1 rounded-3xl border border-white/10 relative">
                    {/* Plus Icon */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#0B1221] rounded-full flex items-center justify-center border border-white/10 z-10 text-slate-500 font-bold">
                        vs
                    </div>

                    <div className="p-5 bg-emerald-500/5 rounded-[1.2rem] text-center group hover:bg-emerald-500/10 transition-colors">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><ArrowUpRight size={12} /> 금일 입금 (In)</p>
                        <h2 className="text-2xl font-black text-emerald-400">{formatCurrency(cashSummary.todayIn)}</h2>
                    </div>
                    <div className="p-5 bg-rose-500/5 rounded-[1.2rem] text-center group hover:bg-rose-500/10 transition-colors">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><ArrowDownLeft size={12} /> 금일 출금 (Out)</p>
                        <h2 className="text-2xl font-black text-rose-400">{formatCurrency(cashSummary.todayOut)}</h2>
                    </div>
                </div>

                {/* 3. Today Balance */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-[#151D2E] p-6 rounded-3xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">금일 잔액 (Today)</p>
                    <h2 className="text-2xl font-black text-white">{formatCurrency(cashSummary.endBalance)}</h2>
                </div>
            </div>

            {/* Bank Reconciliation (The Check) */}
            <div className="bg-[#151D2E] rounded-3xl border border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">시재 마감 검증 (Reconciliation)</h3>
                        <p className="text-sm text-slate-400">장부상 잔액과 실제 통장 잔액을 대조하여 하루를 마감하세요.</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 bg-[#0B1221] p-2 pr-6 rounded-2xl border border-white/10">
                    <div className="px-6 py-2 border-r border-white/10">
                        <span className="block text-[10px] text-slate-500 font-black uppercase">장부 잔액</span>
                        <span className="block text-xl font-black text-white tabular-nums">{formatCurrency(cashSummary.endBalance)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-indigo-400 font-black uppercase">실제 잔액 입력:</span>
                        <input
                            type="number"
                            value={actualBalance}
                            onChange={(e) => setActualBalance(Number(e.target.value))}
                            className="bg-transparent text-xl font-black text-white w-40 outline-none border-b border-indigo-500/30 focus:border-indigo-500 transition-all text-right tabular-nums"
                        />
                    </div>

                    {actualBalance - cashSummary.endBalance === 0 ? (
                        <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-black flex items-center gap-2">
                            <CheckCircle size={14} /> 일치 (Matched)
                        </div>
                    ) : (
                        <div className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-black flex items-center gap-2 animate-pulse">
                            <AlertCircle size={14} /> {formatCurrency(Math.abs(actualBalance - cashSummary.endBalance))} 차이
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="space-y-6">
                <div className="flex gap-2 border-b border-white/5 pb-1">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-6 py-3 text-sm font-black rounded-t-xl transition-all ${viewMode === 'daily' ? 'bg-[#151D2E] text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        일일 자금 명세 ({cashSummary.inflows.length + cashSummary.outflows.length})
                    </button>
                    <button
                        onClick={() => setViewMode('receivables')}
                        className={`px-6 py-3 text-sm font-black rounded-t-xl transition-all flex items-center gap-2 ${viewMode === 'receivables' ? 'bg-[#151D2E] text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        미수금 / 외상매출 관리
                        {receivables.length > 0 && <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md">{receivables.length}</span>}
                    </button>
                    <button
                        onClick={() => setViewMode('payables')}
                        className={`px-6 py-3 text-sm font-black rounded-t-xl transition-all flex items-center gap-2 ${viewMode === 'payables' ? 'bg-[#151D2E] text-white border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        미지급금 / 리스 스케줄
                        {payables.length > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md">{payables.length}</span>}
                    </button>
                </div>

                <div className="min-h-[400px]">
                    {/* View: Daily Transaction List */}
                    {viewMode === 'daily' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                            {/* Inflows */}
                            <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-emerald-500/5">
                                    <h3 className="font-black text-emerald-400 flex items-center gap-2">
                                        <ArrowUpRight size={18} /> 입금 (Inflow)
                                    </h3>
                                    <span className="text-xs font-bold text-slate-500">{cashSummary.inflows.length} 건</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {cashSummary.inflows.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm font-bold">금일 입금 내역이 없습니다.</div>
                                    ) : (
                                        cashSummary.inflows.map(entry => (
                                            <div key={entry.id} onClick={() => setSelectedEntry(entry)} className="p-4 flex justify-between items-center hover:bg-white/[0.02] cursor-pointer group transition-colors">
                                                <div>
                                                    <p className="text-white font-bold text-sm">{entry.description}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{entry.vendor || 'Unknown Vendor'}</p>
                                                </div>
                                                <span className="text-emerald-400 font-black font-mono">+{entry.amount.toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Outflows */}
                            <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-rose-500/5">
                                    <h3 className="font-black text-rose-400 flex items-center gap-2">
                                        <ArrowDownLeft size={18} /> 출금 (Outflow)
                                    </h3>
                                    <span className="text-xs font-bold text-slate-500">{cashSummary.outflows.length} 건</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {cashSummary.outflows.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm font-bold">금일 출금 내역이 없습니다.</div>
                                    ) : (
                                        cashSummary.outflows.map(entry => (
                                            <div key={entry.id} onClick={() => setSelectedEntry(entry)} className="p-4 flex justify-between items-center hover:bg-white/[0.02] cursor-pointer group transition-colors">
                                                <div>
                                                    <p className="text-white font-bold text-sm">{entry.description}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{entry.vendor || 'Unknown Vendor'}</p>
                                                </div>
                                                <span className="text-rose-400 font-black font-mono">-{entry.amount.toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Receivables (Aging) */}
                    {viewMode === 'receivables' && (
                        <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.02] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">만기일 / 경과일</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">거래처</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">적요</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">미수 금액</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">조치</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {receivables.map(item => (
                                        <tr key={item.id} className="hover:bg-white/[0.02] group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 font-bold text-xs">{item.dueDate}</span>
                                                    {item.daysOverdue > 0 ? (
                                                        <span className="text-rose-400 text-[10px] font-black mt-1">+{item.daysOverdue}일 연체 (Overdue)</span>
                                                    ) : (
                                                        <span className="text-emerald-500 text-[10px] font-black mt-1">정상 (D-{Math.abs(item.daysOverdue)})</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">{item.vendor || '-'}</td>
                                            <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">{item.description}</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-emerald-400">₩{item.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-emerald-500/20">
                                                    수금 처리
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {receivables.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-500 font-bold">미수금 내역이 없습니다. (No Receivables)</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* View: Payables breakdown */}
                    {viewMode === 'payables' && (
                        <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                            <div className="p-6 bg-rose-500/5 border-b border-rose-500/10 mb-4 mx-6 mt-6 rounded-2xl flex items-start gap-4">
                                <Clock className="text-rose-400 shrink-0" />
                                <div>
                                    <h4 className="text-rose-400 font-black text-sm uppercase mb-1">Upcoming Liability Schedule</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        리스료, 공과금, 매입채무 등 확정된 지급 의무 스케줄입니다. <br />
                                        자금 고갈(Cash Crunch) 방지를 위해 만기 3일 전에는 자금을 확보하세요.
                                    </p>
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead className="bg-white/[0.02] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">지급 예정일</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">거래처 (채권자)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">내역</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">지급액</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">승인</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payables.map(item => (
                                        <tr key={item.id} className="hover:bg-white/[0.02] group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 font-bold text-xs">{item.dueDate}</span>
                                                    {item.daysUntilDue < 0 ? (
                                                        <span className="text-rose-500 text-[10px] font-black mt-1">지급 지연 (+{Math.abs(item.daysUntilDue)}일)</span>
                                                    ) : (
                                                        <span className="text-slate-500 text-[10px] font-black mt-1">{item.daysUntilDue}일 후 지급</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">{item.vendor || '-'}</td>
                                            <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">{item.description}</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-rose-400">₩{item.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`'${item.vendor}'에 대한 ${item.amount.toLocaleString()}원 지급을 승인하시겠습니까?\n\n승인 시 즉시 '보통예금'에서 출금 처리되며, 미지급금 내역에서 삭제됩니다.`)) {
                                                            // 1. Mark original liability as "Settled" (Removes from this list)
                                                            updateEntry(item.id, { isSettled: true });

                                                            // 2. Create Cash Outflow Entry (Payment)
                                                            addEntry({
                                                                id: crypto.randomUUID(),
                                                                date: selectedDate,
                                                                transactionDate: selectedDate,
                                                                recognitionDate: selectedDate,
                                                                description: `[지급] ${item.description}`,
                                                                vendor: item.vendor,
                                                                debitAccount: item.creditAccount,
                                                                creditAccount: '보통예금',
                                                                amount: item.amount,
                                                                vat: 0,
                                                                type: 'Liability',
                                                                status: 'Approved'
                                                            } as any);
                                                            alert('지급 처리가 완료되었습니다.');
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-indigo-500/20 active:scale-95"
                                                >
                                                    지급 승인
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {payables.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-500 font-bold">지급 예정 내역이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Print Action */}
            <div className="fixed bottom-8 right-8">
                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white rounded-full p-4 shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
                    title="일보 출력 (Print Report)"
                >
                    <Download size={24} />
                </button>
            </div>

            <style>{`
                @media print {
                    .fixed { display: none !important; }
                    body { background: white !important; color: black !important; }
                    * { border-color: #ddd !important; }
                }
            `}</style>

            <TransactionDetailModal
                isOpen={!!selectedEntry}
                onClose={() => setSelectedEntry(null)}
                entry={selectedEntry}
            />

            {/* Smart Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="max-w-4xl w-full relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowUpload(false)}
                            className="absolute -top-12 right-0 text-white hover:text-slate-300 font-bold flex items-center gap-2 p-2"
                        >
                            닫기
                        </button>
                        <SmartExcelUploader onUpload={handleSmartUpload} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyCashReport;
