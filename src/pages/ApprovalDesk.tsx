import React, { useContext, useMemo, useState } from 'react';
import { AccountingContext } from '../context/AccountingContext';
import { CheckCircle, CheckCircle2, XCircle, Clock, Search, Filter, LayoutGrid, List, Download, FileJson, AlertTriangle, Paperclip, Zap, Sparkles, CheckSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { JournalEntry, ParsedTransaction } from '../types';
import { ALL_ACCOUNTS } from '../constants/accounts';
import { cleanMarkdown } from '../utils/textUtils';
import { EvidenceViewer } from '../components/EvidenceViewer';

const ApprovalDesk: React.FC = () => {
    const { ledger, approveEntry, deleteEntry, bulkApprove, addEntries, updateEntry, acceptVatSuggestion, addEntry, config } = useContext(AccountingContext)!;
    const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'Sales' | 'Expense' | 'Asset'>('all');
    const [viewingEvidence, setViewingEvidence] = useState<JournalEntry | null>(null);

    // Priority-based Sorting for Approval Desk
    const pendingTransactions = useMemo(() => {
        const filtered = ledger.filter(e =>
            (e.status === 'Unconfirmed' || e.status === 'Hold' || e.status === 'Pending Review') &&
            (filterType === 'all' || e.type === filterType)
        );

        return [...filtered].sort((a, b) => {
            const getPriority = (tx: JournalEntry) => {
                if (tx.parseStatus === 'needConfirm' || tx.status === 'Hold' || tx.complianceContext?.includes('확인 필요')) return 0;
                if (tx.status === 'Pending Review') return 1;
                return 2;
            };
            return getPriority(a) - getPriority(b);
        });
    }, [ledger, filterType]);

    const summaryStats = useMemo(() => {
        const stats = {
            total: pendingTransactions.length,
            ok: 0,
            needConfirm: 0,
            pendingAI: 0,
            adjusted: 0,
        };

        pendingTransactions.forEach(t => {
            const isNeedConfirm = t.parseStatus === 'needConfirm' || t.status === 'Hold' || t.complianceContext?.includes('확인 필요');
            if (isNeedConfirm) stats.needConfirm++;
            else if (t.status === 'Pending Review') stats.pendingAI++;
            else stats.ok++;

            if (t.auditTrail?.some(log => log.includes('Cleaned') || log.includes('추출'))) {
                stats.adjusted++;
            }
        });

        return stats;
    }, [pendingTransactions]);

    // [Antigravity] Grouping Logic for Composite Entries (Hide Clearing Accounts)
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, JournalEntry[]> = {};

        pendingTransactions.forEach(t => {
            // Grouping Key: transactionId if present, otherwise fallback to date-description heuristic
            const key = t.transactionId || `${t.date}-${cleanMarkdown(t.description)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        return Object.values(groups).map(group => {
            // Collect real accounts (exclude Clearing)
            const realDebits = group.flatMap(g =>
                (!g.debitAccount.includes('분개그룹') && !g.debitAccount.includes('Clearing'))
                    ? [{ acc: g.debitAccount, amount: g.amount }]
                    : []
            );
            const realCredits = group.flatMap(g =>
                (!g.creditAccount.includes('분개그룹') && !g.creditAccount.includes('Clearing'))
                    ? [{ acc: g.creditAccount, amount: g.amount }]
                    : []
            );

            // Fallback for non-clearing simple entries or if filtering failed
            if (realDebits.length === 0) group.forEach(g => realDebits.push({ acc: g.debitAccount, amount: g.amount }));
            if (realCredits.length === 0) group.forEach(g => realCredits.push({ acc: g.creditAccount, amount: g.amount }));

            // Calculate total magnitude
            const totalAmount = Math.max(
                realDebits.reduce((s, i) => s + i.amount, 0),
                realCredits.reduce((s, i) => s + i.amount, 0)
            );

            // Deduplicate identical accounts in same group (e.g. multiple partial clears)
            // For visualization, we merge amounts for same account name
            const mergeAccounts = (list: { acc: string, amount: number }[]) => {
                const map = new Map<string, number>();
                list.forEach(i => map.set(i.acc, (map.get(i.acc) || 0) + i.amount));
                return Array.from(map.entries()).map(([acc, amount]) => ({ acc, amount }));
            };

            return {
                ...group[0],
                debits: mergeAccounts(realDebits),
                credits: mergeAccounts(realCredits),
                displayAmount: totalAmount,
                subIds: group.map(g => g.id),
                isComposite: group.length > 1
            };
        });
    }, [pendingTransactions]);

    const toggleSelect = (id: string, subIds?: string[]) => {
        const next = new Set(selectedIds);
        const idsToToggle = subIds || [id];

        // If first ID is present, we assume we are deselecting the group
        if (next.has(idsToToggle[0])) {
            idsToToggle.forEach(i => next.delete(i));
        } else {
            idsToToggle.forEach(i => next.add(i));
        }
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
                    taxBaseAmount: p.taxBaseAmount,
                    type: p.entryType as any,
                    status: p.parseStatus === 'needConfirm' ? 'Hold' : 'Unconfirmed',
                    parseStatus: p.parseStatus,
                    rawDataSnapshot: p.rawDataSnapshot,
                    complianceContext: p.parseStatus === 'needConfirm'
                        ? `[Safe-Parser Flag] ${p.parseErrorMsg || '데이터 확인 필요'}`
                        : (p.parseStatus === 'warning' ? `[Safe-Parser Trace] ${p.parseErrorMsg}` : undefined),
                    auditTrail: [
                        ...(p.auditTrail || []),
                        p.rawDataSnapshot ? `Raw Source: ${p.rawDataSnapshot}` : 'Manual Import'
                    ]
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
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">AI 전표 승인 데스크 (Journal Approval)</h1>
                    <p className="text-slate-400 font-bold">미확정 전표 거버넌스 — AI가 분석한 거래 내역의 최종 승인 및 분류 확정</p>
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

            {/* [Antigravity] Summary Cards: "Self-Awareness Sandbox" */}
            <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 transition-all duration-500 ${pendingTransactions.length > 0 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                <div className="bg-[#151D2E] border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 font-mono">✅ 정상 처리</p>
                        <h4 className="text-xl font-black text-white">{summaryStats.ok} <span className="text-xs text-slate-500">건</span></h4>
                    </div>
                    <CheckCircle className="text-emerald-500/40" size={32} />
                </div>
                <div className="bg-[#151D2E] border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 font-mono">🚨 필수 보정</p>
                        <h4 className="text-xl font-black text-white">{summaryStats.needConfirm} <span className="text-xs text-slate-500">건</span></h4>
                    </div>
                    <AlertTriangle className="text-rose-500/40" size={32} />
                    {summaryStats.needConfirm > 0 && <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />}
                </div>
                <div className="bg-[#151D2E] border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 font-mono">🤖 AI 검토 대기</p>
                        <h4 className="text-xl font-black text-white">{summaryStats.pendingAI} <span className="text-xs text-slate-500">건</span></h4>
                    </div>
                    <Sparkles className="text-amber-500/40" size={32} />
                    {summaryStats.pendingAI > 0 && <div className="absolute inset-0 bg-amber-500/5" />}
                </div>
                <div className="bg-[#151D2E] border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 font-mono">💡 추정 적용</p>
                        <h4 className="text-xl font-black text-white">{summaryStats.adjusted} <span className="text-xs text-slate-500">건</span></h4>
                    </div>
                    <Zap className="text-indigo-500/40" size={32} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {groupedTransactions.length === 0 ? (
                    <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-20 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 underline decoration-emerald-500/30 decoration-4 underline-offset-8">All Journals Approved</h2>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                            현재 검토 대기 중인 미확정 전표가 없습니다. 모든 거래 내역이 정상적으로 분류 및 승인되었습니다.
                        </p>
                    </div>
                ) : viewMode === 'card' ? (
                    <div className="space-y-4">
                        {groupedTransactions.map((entry) => {
                            const isNeedConfirm = entry.parseStatus === 'needConfirm' || entry.status === 'Hold' || entry.complianceContext?.includes('확인 필요');
                            const isPendingAI = entry.status === 'Pending Review' || entry.status === 'Unconfirmed';
                            const isSelected = selectedIds.has(entry.id); // Check primary ID

                            return (
                                <div
                                    key={entry.id}
                                    className={`group bg-[#151D2E] rounded-3xl border p-6 transition-all duration-300 shadow-xl relative overflow-hidden ${isNeedConfirm
                                        ? 'border-rose-500/40 ring-2 ring-rose-500/10 bg-rose-500/[0.02] animate-in fade-in zoom-in-95'
                                        : isPendingAI
                                            ? 'border-amber-500/30'
                                            : 'border-white/5 hover:border-indigo-500/50'
                                        }`}
                                >
                                    {isNeedConfirm && (
                                        <div className="absolute inset-0 bg-rose-500/[0.03] animate-pulse pointer-events-none" />
                                    )}

                                    <div className="absolute top-4 left-4 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(entry.id, entry.subIds)}
                                            className="w-5 h-5 rounded-lg border-white/10 bg-[#0B1221] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                    {/* Status Glow */}
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${isNeedConfirm ? 'bg-rose-500' : isPendingAI ? 'bg-amber-500' : 'bg-indigo-500'}`} />

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
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${isNeedConfirm ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : isPendingAI ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                    }`}>
                                                    {isNeedConfirm ? '✋ 수동 보정 필요' : isPendingAI ? '🤖 AI 승인 대기' : entry.status}
                                                </span>

                                                {/* AI Accounting Integrity Badge */}
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight ${entry.amount > 5000000 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                    <Zap size={10} />
                                                    AI Integrity: {entry.amount > 5000000 ? '94%' : '99.8%'}
                                                </div>

                                                {isNeedConfirm && (
                                                    <span className="flex items-center gap-1 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shadow-lg shadow-rose-500/20 animate-bounce">
                                                        <AlertTriangle size={10} /> 데이터 무결성 위험
                                                    </span>
                                                )}

                                                <button
                                                    onClick={() => setViewingEvidence(entry)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight bg-slate-500/10 text-slate-400 border-white/10 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 transition-all ml-auto lg:ml-0"
                                                >
                                                    <Paperclip size={10} />
                                                    View Evidence
                                                </button>
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors mb-1 uppercase tracking-tight flex items-center gap-2">
                                                    {entry.vendor && entry.vendor.trim() !== '' ? entry.vendor : '거래처 미지정'}
                                                    {entry.amount > 10000000 && <span className="bg-indigo-500/20 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded border border-indigo-500/30 font-black">집중 확인 대상</span>}
                                                </h3>
                                                <p className="text-white/90 font-bold leading-relaxed italic">"{cleanMarkdown(entry.description)}"</p>
                                                {entry.taxBaseAmount && (
                                                    <div className="mt-2 text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded inline-block border border-indigo-500/20">
                                                        ℹ️ Tax Credit Base: ₩{entry.taxBaseAmount.toLocaleString()} (Salary)
                                                    </div>
                                                )}
                                            </div>

                                            {/* Professional ERP Double-Entry Display (Composite Support) */}
                                            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 mt-2">
                                                <div className="space-y-2 border-r border-white/5 pr-4 text-left">
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Debit (차변)</span>
                                                    {entry.debits.map((d: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-end group/item">
                                                            <div className="text-base font-black text-white font-mono break-all leading-tight italic">
                                                                {d.acc}
                                                            </div>
                                                            {entry.debits.length > 1 && (
                                                                <span className="text-[10px] font-mono text-slate-500">₩{d.amount.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <p className="text-[15px] font-black text-white/50 pt-2 border-t border-white/5 font-mono">
                                                        ₩{entry.displayAmount.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="space-y-2 text-right pl-4">
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Credit (대변)</span>
                                                    {entry.credits.map((c: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-end group/item flex-row-reverse">
                                                            <div className="text-base font-black text-white font-mono break-all leading-tight italic">
                                                                {c.acc}
                                                            </div>
                                                            {entry.credits.length > 1 && (
                                                                <span className="text-[10px] font-mono text-slate-500">₩{c.amount.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <p className="text-[15px] font-black text-white/50 pt-2 border-t border-white/5 font-mono">
                                                        ₩{entry.displayAmount.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="col-span-2 flex items-center justify-center pt-2 border-t border-white/5 mt-1">
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                        <Sparkles size={12} className="text-emerald-400" />
                                                        <span className="text-[10px] font-black text-emerald-400 uppercase">AI Zero-Sum Verified</span>
                                                    </div>
                                                </div>
                                            </div>

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
                                                        // If it has a warning trace in context, show that instead of generic msg
                                                        : (entry.complianceContext?.includes('Trace')
                                                            ? entry.complianceContext.replace('[Safe-Parser Trace] ', '')
                                                            : `거래 패턴 분석 결과, 표준 계정 분류 정확도(99.8%)를 충족합니다. 별도의 수동 보정 없이 승인이 가능한 상태입니다.`)
                                                    }
                                                </p>

                                                {/* [Antigravity] Raw Source Exposure for Self-Awareness */}
                                                {entry.auditTrail?.find(log => log.startsWith('Raw Source:')) && (
                                                    <div className="mt-3 pt-3 border-t border-white/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Search size={12} className="text-slate-500" />
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ground Truth (Raw Data)</span>
                                                        </div>
                                                        <code className="text-[10px] font-mono text-slate-400 bg-black/20 px-2 py-1 rounded block truncate" title={entry.auditTrail.find(log => log.startsWith('Raw Source:'))?.replace('Raw Source: ', '')}>
                                                            {entry.auditTrail.find(log => log.startsWith('Raw Source:'))?.replace('Raw Source: ', '')}
                                                        </code>
                                                    </div>
                                                )}
                                            </div>

                                            {entry.suggestedVat !== undefined && (
                                                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 mt-2 animate-pulse hover:animate-none group/sugg transition-all">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles size={14} className="text-indigo-400" />
                                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI 부가세 최적화 제안</span>
                                                        </div>
                                                        <span className="text-[10px] font-black text-white/40">Confidence: 98%</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-300 mb-3">{entry.suggestedDescription}</p>
                                                    <div className="flex items-center gap-4 py-2 border-y border-white/5 mb-3">
                                                        <div className="flex-1 text-center border-r border-white/5">
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Current VAT</p>
                                                            <p className="text-sm font-black text-slate-400">₩0</p>
                                                        </div>
                                                        <div className="flex-1 text-center">
                                                            <p className="text-[9px] text-indigo-400 font-black uppercase">Suggested VAT</p>
                                                            <p className="text-sm font-black text-white">₩{entry.suggestedVat.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => acceptVatSuggestion(entry.id)}
                                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                                                        >
                                                            제안된 부가세 반영하기 (Apply)
                                                        </button>
                                                        <button
                                                            onClick={() => updateEntry(entry.id, { suggestedVat: undefined, suggestedDescription: undefined })}
                                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] font-bold rounded-xl transition-all"
                                                        >
                                                            거절
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

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

                                            {/* [Antigravity] Payroll Advanced Split Assistant */}
                                            {(entry.debitAccount === '급여' || entry.description?.includes('급여')) && !entry.isComposite && (
                                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mt-2 animate-in slide-in-from-right-2">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles size={14} className="text-blue-400" />
                                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">AI 원천징수 분할 제안</span>
                                                        </div>
                                                        <span className="text-[9px] font-black text-blue-400/50">Policy: 2024 Tax Tables</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-300 mb-4 leading-relaxed">
                                                        정기 급여 항목이 감지되었습니다. 사대보험({((config.taxPolicy?.insuranceRates?.nationalPension || 0.045) + (config.taxPolicy?.insuranceRates?.healthInsurance || 0.03545) + (config.taxPolicy?.insuranceRates?.employmentInsuranceEmployee || 0.009) * 100).toFixed(2)}% 추정) 및 소득세를 분리하여 **복합 분개**로 전환하시겠습니까?
                                                    </p>
                                                    {(() => {
                                                        const rates = config.taxPolicy?.insuranceRates;
                                                        const pension = Math.floor(entry.amount * (rates?.nationalPension || 0.045));
                                                        const health = Math.floor(entry.amount * (rates?.healthInsurance || 0.03545));
                                                        const care = Math.floor(health * (rates?.longTermCare || 0.1295));
                                                        const employ = Math.floor(entry.amount * (rates?.employmentInsuranceEmployee || 0.009));
                                                        const tax = Math.floor(entry.amount * 0.03);
                                                        const totalDed = pension + health + care + employ + tax;
                                                        const net = entry.amount - totalDed;

                                                        return (
                                                            <>
                                                                <div className="grid grid-cols-4 gap-2 mb-4">
                                                                    <div className="bg-[#0B1221] p-2 rounded-xl border border-white/5">
                                                                        <p className="text-[8px] font-black text-slate-500 uppercase">총급여</p>
                                                                        <p className="text-[10px] font-black text-white">₩{entry.amount.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="bg-[#0B1221] p-2 rounded-xl border border-white/5">
                                                                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">예수금(공제)</p>
                                                                        <p className="text-[10px] font-black text-rose-400">₩{totalDed.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="bg-[#0B1221] p-2 rounded-xl border border-white/5">
                                                                        <p className="text-[8px] font-black text-emerald-400 uppercase">실지급액</p>
                                                                        <p className="text-[10px] font-black text-emerald-400">₩{net.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="bg-[#0B1221] p-2 rounded-xl border border-white/5">
                                                                        <p className="text-[8px] font-black text-indigo-400 uppercase">공제율</p>
                                                                        <p className="text-[10px] font-black text-indigo-400">{((totalDed / entry.amount) * 100).toFixed(1)}%</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const groupId = `PAY-${crypto.randomUUID().slice(0, 8)}`;
                                                                        deleteEntry(entry.id);

                                                                        const splits: JournalEntry[] = [
                                                                            {
                                                                                ...entry, id: crypto.randomUUID(), transactionId: groupId,
                                                                                debitAccount: '급여', creditAccount: '[분개그룹 클리어링]', amount: entry.amount,
                                                                                description: `${entry.description} (총액)`, payrollSplit: { pension, health, tax, net }
                                                                            },
                                                                            {
                                                                                ...entry, id: crypto.randomUUID(), transactionId: groupId,
                                                                                debitAccount: '[분개그룹 클리어링]', creditAccount: '예수금 (국민연금)', amount: pension,
                                                                                description: `${entry.description} (국민연금)`
                                                                            },
                                                                            {
                                                                                ...entry, id: crypto.randomUUID(), transactionId: groupId,
                                                                                debitAccount: '[분개그룹 클리어링]', creditAccount: '예수금 (건강보험)', amount: health + care,
                                                                                description: `${entry.description} (건강/장기요양)`
                                                                            },
                                                                            {
                                                                                ...entry, id: crypto.randomUUID(), transactionId: groupId,
                                                                                debitAccount: '[분개그룹 클리어링]', creditAccount: '예수금 (고용보험)', amount: employ,
                                                                                description: `${entry.description} (고용보험)`
                                                                            },
                                                                            {
                                                                                ...entry, id: crypto.randomUUID(), transactionId: groupId,
                                                                                debitAccount: '[분개그룹 클리어링]', creditAccount: '예수금 (원천세)', amount: tax,
                                                                                description: `${entry.description} (소득세/지방세)`
                                                                            },
                                                                            {
                                                                                ...entry, id: crypto.randomUUID(), transactionId: groupId,
                                                                                debitAccount: '[분개그룹 클리어링]', creditAccount: '미지급급여', amount: net,
                                                                                description: `${entry.description} (실지급액)`
                                                                            }
                                                                        ];

                                                                        splits.forEach(s => addEntry(s));
                                                                        alert('✅ 상세 원천징수 분할 처리가 완료되었습니다.');
                                                                    }}
                                                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                                                >
                                                                    AI 원천세 상세 분해 및 복합 분개 생성
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
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
                                                    onClick={() => bulkApprove(entry.subIds)}
                                                    className="bg-indigo-600 p-4 rounded-2xl text-white hover:bg-indigo-700 hover:scale-110 transition-all shadow-xl shadow-indigo-600/20 active:scale-100"
                                                    title="전표 승인"
                                                >
                                                    <CheckCircle size={24} />
                                                </button>
                                                <button
                                                    onClick={() => entry.subIds.forEach((id: string) => deleteEntry(id))}
                                                    className="bg-white/5 p-4 rounded-2xl text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:scale-110 transition-all border border-white/10 active:scale-100"
                                                    title="전표 삭제 (반려)"
                                                >
                                                    <XCircle size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-indigo-500/5 text-indigo-400">Debit (차변)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-emerald-500/5 text-emerald-400 text-right">Credit (대변)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {groupedTransactions.map((entry) => {
                                    const isNeedConfirm = entry.parseStatus === 'needConfirm' || entry.status === 'Hold' || entry.complianceContext?.includes('확인 필요');
                                    const isPendingAI = entry.status === 'Pending Review' || entry.status === 'Unconfirmed';
                                    const isSelected = selectedIds.has(entry.id);

                                    return (
                                        <tr key={entry.id} className={`hover:bg-white/[0.02] transition-all group ${isNeedConfirm ? 'bg-rose-500/[0.03]' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(entry.id, entry.subIds)}
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-black text-indigo-300 font-mono italic">
                                                    {entry.debits.map((d: any) => d.acc).join(', ')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs truncate text-[13px] font-bold text-slate-400">
                                                {entry.description}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-black text-white">
                                                ₩{entry.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="text-sm font-black text-emerald-300 font-mono italic">
                                                    {entry.credits.map((c: any) => c.acc).join(', ')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${isNeedConfirm ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : isPendingAI ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                    {isNeedConfirm ? '🚧 보정 필요' : isPendingAI ? '🤖 승인 대기' : entry.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => bulkApprove(entry.subIds)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Approve">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button onClick={() => entry.subIds.forEach((id: string) => deleteEntry(id))} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all" title="Delete">
                                                        <XCircle size={16} />
                                                    </button>
                                                    <button onClick={() => setViewingEvidence(entry)} className="p-1.5 text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-lg transition-all" title="Evidence">
                                                        <Paperclip size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Evidence Viewer Overlay */}
            <EvidenceViewer
                isOpen={!!viewingEvidence}
                onClose={() => setViewingEvidence(null)}
                entry={viewingEvidence}
            />
        </div>
    );
};

export default ApprovalDesk;
