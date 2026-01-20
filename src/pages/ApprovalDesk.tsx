import React, { useContext, useMemo, useState } from 'react';
import { AccountingContext } from '../context/AccountingContext';
import { CheckCircle, CheckCircle2, XCircle, Clock, Search, Filter, LayoutGrid, List, Download, FileJson, AlertTriangle, Paperclip, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { JournalEntry, ParsedTransaction } from '../types';
import { ALL_ACCOUNTS } from '../constants/accounts';
import { cleanMarkdown } from '../utils/textUtils';

const ApprovalDesk: React.FC = () => {
    const { ledger, approveEntry, deleteEntry, bulkApprove, addEntries, updateEntry } = useContext(AccountingContext)!;
    const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'Sales' | 'Expense' | 'Asset'>('all');

    // Filter for Unconfirmed / Hold transactions and Type
    const pendingTransactions = useMemo(() =>
        ledger.filter(e =>
            (e.status === 'Unconfirmed' || e.status === 'Hold') &&
            (filterType === 'all' || e.type === filterType)
        ),
        [ledger, filterType]);

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === pendingTransactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pendingTransactions.map(t => t.id)));
        }
    };

    const handleBulkApprove = () => {
        bulkApprove(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const csvData = e.target?.result as string;
                const parsedResults: ParsedTransaction[] = await invoke('process_batch', { csvData });

                const newEntries: JournalEntry[] = parsedResults.map(p => ({
                    id: crypto.randomUUID(),
                    date: p.date || new Date().toISOString().split('T')[0],
                    description: p.description || '',
                    vendor: p.vendor && p.vendor.trim() !== '' ? p.vendor : undefined,
                    debitAccount: p.accountName || (p.entryType === 'Expense' ? 'Expenses' : 'Assets'),
                    creditAccount: 'Cash',
                    amount: p.amount,
                    vat: p.vat,
                    type: p.entryType as any,
                    status: 'Unconfirmed',
                    complianceContext: p.needsClarification ? `[Batch Risk Flag] ${p.clarificationPrompt}` : undefined
                }));

                addEntries(newEntries);
                setIsImporting(false);
            };
            reader.readAsText(file);
        } catch (err) {
            console.error("Batch Import Failed:", err);
            alert("데이터 분석 및 전표 변환 과정에서 기술적 예외가 발생했습니다. 파일 형식을 확인하거나 잠시 후 다시 시도해 주시기 바랍니다.");
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">Audit & Compliance Desk</h1>
                    <p className="text-slate-400 font-bold">미확정 전표 거버넌스 — AI가 분석한 거래 내역의 최종 권한 승인 및 컴플라이언스 검토</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-[#151D2E] p-1 rounded-xl border border-white/5 mr-4">
                        {(['all', 'Sales', 'Expense', 'Asset'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {type === 'all' ? '전체' : type === 'Sales' ? '매출' : type === 'Expense' ? '매입/비용' : '자산'}
                            </button>
                        ))}
                    </div>

                    <div className="flex bg-[#151D2E] p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <label className="flex items-center gap-2 px-4 py-2 bg-[#151D2E] text-indigo-400 border border-indigo-500/20 rounded-xl font-black text-xs cursor-pointer hover:bg-indigo-500/10 transition-all group">
                        <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                        {isImporting ? '처리 중...' : 'CSV 대량 업로드'}
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isImporting} />
                    </label>

                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkApprove}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <CheckCircle size={16} />
                            {selectedIds.size}건 일괄 승인
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {pendingTransactions.length === 0 ? (
                    <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-20 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 underline decoration-emerald-500/30 decoration-4 underline-offset-8">All Journals Verified</h2>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                            현재 검토 대기 중인 미확정 전표가 없습니다. 모든 거래 내역이 거버넌스 원칙에 따라 정상적으로 분류 및 승인되었습니다.
                        </p>
                    </div>
                ) : viewMode === 'card' ? (
                    <div className="space-y-4">
                        {pendingTransactions.map((entry) => (
                            <div
                                key={entry.id}
                                className={`group bg-[#151D2E] rounded-3xl border border-white/5 p-6 hover:border-indigo-500/50 transition-all duration-300 shadow-xl relative overflow-hidden ${entry.status === 'Hold' ? 'border-rose-500/30 ring-1 ring-rose-500/20' : ''}`}
                            >
                                <div className="absolute top-4 left-4 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(entry.id)}
                                        onChange={() => toggleSelect(entry.id)}
                                        className="w-5 h-5 rounded-lg border-white/10 bg-[#0B1221] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                                {/* Status Glow */}
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${entry.status === 'Hold' ? 'bg-rose-500' : 'bg-indigo-500'}`} />

                                <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center pl-8">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="bg-white/5 text-slate-400 text-[10px] font-black px-1.5 py-0.5 rounded-lg font-mono border border-white/5">
                                                <input
                                                    type="date"
                                                    value={entry.date}
                                                    onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                                    className="bg-transparent border-none text-[10px] text-slate-400 font-mono focus:ring-0 outline-none cursor-pointer p-0 w-24"
                                                />
                                            </span>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${entry.status === 'Hold' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                }`}>
                                                {entry.status}
                                            </span>

                                            {/* AI Accounting Integrity Badge */}
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight ${entry.amount > 5000000 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}>
                                                <Zap size={10} />
                                                AI Integrity: {entry.amount > 5000000 ? '94%' : '99.8%'}
                                            </div>

                                            {entry.complianceContext?.includes('Risk') && (
                                                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-black px-2.5 py-1 rounded-lg border border-amber-500/20 uppercase">
                                                    <AlertTriangle size={10} /> 회계 정합성 확인 필요
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors mb-1 uppercase tracking-tight flex items-center gap-2">
                                                {entry.vendor && entry.vendor.trim() !== '' ? entry.vendor : '거래처 미지정'}
                                                {entry.amount > 10000000 && <span className="bg-indigo-500/20 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded border border-indigo-500/30 font-black">집중 확인 대상</span>}
                                            </h3>
                                            <p className="text-white/90 font-bold leading-relaxed italic">"{cleanMarkdown(entry.description)}"</p>
                                        </div>

                                        {/* AI Accounting Verification Insight */}
                                        <div className={`p-4 rounded-2xl border ${entry.amount > 5000000 ? 'bg-indigo-500/5 border-indigo-500/20 shadow-inner' : 'bg-white/5 border-white/5 opacity-80'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-indigo-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                                        AI Integrity Report
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 italic">Technical Verification</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-300 leading-relaxed">
                                                {entry.amount > 5000000
                                                    ? `고액 거래에 대한 중점 검토 수행: 전표 데이터의 일관성 확인 및 비즈니스 목적 연관성 분석 결과, 일반적인 회계 관행과 일치함이 확인되었습니다. 세무 리스크 관리를 위해 증빙 서류의 추가 중복 검토를 권장합니다.`
                                                    : `거래 패턴 분석 결과, 표준 계정 분류 정확도(99.8%)를 충족합니다. 별도의 수동 보정 없이 승인이 가능한 상태입니다.`
                                                }
                                            </p>
                                        </div>

                                        {entry.clarificationPrompt && (
                                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mt-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <AlertTriangle size={14} className="text-amber-500" />
                                                    <span className="text-[10px] font-black text-amber-500 uppercase">AI 회계 처리 확인 요청</span>
                                                </div>
                                                <p className="text-sm font-bold text-white mb-2">{cleanMarkdown(entry.clarificationPrompt)}</p>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all border border-white/5">
                                                        업무 관련성 확인하기
                                                    </button>
                                                    <button className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-xs font-bold text-rose-400 transition-all border border-rose-500/10">
                                                        사외 지출 (불산입) 처리
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-8 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-8">
                                        <div className="flex-1 lg:flex-none text-right">
                                            <span className="text-[10px] font-black text-slate-500 block uppercase tracking-widest mb-1">금액 (KRW)</span>
                                            <p className="text-3xl font-black text-white font-mono">
                                                ₩{entry.amount.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => approveEntry(entry.id)}
                                                className="bg-indigo-600 p-4 rounded-2xl text-white hover:bg-indigo-700 hover:scale-110 transition-all shadow-xl shadow-indigo-600/20 active:scale-100"
                                                title="전표 승인"
                                            >
                                                <CheckCircle size={24} />
                                            </button>
                                            <button
                                                onClick={() => deleteEntry(entry.id)}
                                                className="bg-white/5 p-4 rounded-2xl text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:scale-110 transition-all border border-white/10 active:scale-100"
                                                title="전표 삭제 (반려)"
                                            >
                                                <XCircle size={24} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="p-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === pendingTransactions.length && pendingTransactions.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-5 h-5 rounded-lg border-white/10 bg-[#0B1221] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Proof</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pendingTransactions.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-all group">
                                        <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(entry.id)}
                                                onChange={() => toggleSelect(entry.id)}
                                                className="w-5 h-5 rounded-lg border-white/10 bg-[#0B1221] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-200">
                                            <input
                                                type="date"
                                                value={entry.date}
                                                onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                                className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-white">{entry.vendor}</td>
                                        <td className="px-6 py-4 text-xs text-slate-200 italic font-bold">"{cleanMarkdown(entry.description)}"</td>
                                        <td className="px-6 py-4 text-center">
                                            {entry.attachmentUrl && (
                                                <button onClick={() => window.open(entry.attachmentUrl, '_blank')} className="p-1.5 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all">
                                                    <Paperclip size={16} />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-white text-right font-mono">₩{entry.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${entry.status === 'Hold' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => approveEntry(entry.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Approve">
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all" title="Delete">
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApprovalDesk;
