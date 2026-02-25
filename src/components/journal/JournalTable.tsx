import React, { useContext, useState, useMemo, useRef } from 'react';
import { JournalEntry } from '../../types';
import { Trash2, ChevronUp, ChevronDown, ArrowUpDown, Lock, X, ExternalLink, Sparkles, Shield, Upload, FileCheck, AlertCircle } from 'lucide-react';
import { AccountingContext } from '../../context/AccountingContext';
import { ReviewLiabilityModal } from '../modals/ReviewLiabilityModal';

interface JournalTableProps {
    entries: JournalEntry[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleAll: () => void;
}

type SortKey = 'date' | 'journalNumber' | 'vendor' | 'description' | 'debitAccount' | 'amount' | 'status';

const JournalTable: React.FC<JournalTableProps> = ({ entries, selectedIds, onToggleSelect, onToggleAll }) => {
    const { updateEntry, deleteEntry, isDateLocked, liabilities } = useContext(AccountingContext)!;
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Liability Modal State
    const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
    const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);

    const handleOpenLiabilityReview = (id: string) => {
        setSelectedLiabilityId(id);
        setIsLiabilityModalOpen(true);
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedEntries = useMemo(() => {
        if (!sortConfig) return entries;
        return [...entries].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof JournalEntry];
            let bValue: any = b[sortConfig.key as keyof JournalEntry];

            if (sortConfig.key === 'amount') {
                aValue = (a.amount || 0) + (a.vat || 0);
                bValue = (b.amount || 0) + (b.vat || 0);
            }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [entries, sortConfig]);

    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when entries change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [entries.length]);

    const totalPages = Math.ceil(sortedEntries.length / itemsPerPage) || 1;
    const paginatedEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedEntries.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedEntries, currentPage, itemsPerPage]);

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown size={10} className="ml-1 opacity-30 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={10} className="ml-1 text-indigo-400" />
            : <ChevronDown size={10} className="ml-1 text-indigo-400" />;
    };

    const renderHeader = (label: string, key: SortKey, align: string = "text-left") => (
        <th
            onClick={() => handleSort(key)}
            className={`px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group hover:text-slate-300 transition-colors ${align}`}
        >
            <div className={`flex items-center ${align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : "justify-start"}`}>
                {label}
                <SortIcon columnKey={key} />
            </div>
        </th>
    );

    const getLiabilityColor = (status: string) => {
        switch (status) {
            case 'UNPLANNED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'PLANNED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'POTENTIAL_EQUITY': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeRowId) {
            const url = URL.createObjectURL(file);
            updateEntry(activeRowId, {
                attachments: [{
                    id: Math.random().toString(36).substr(2, 9),
                    fileName: file.name,
                    fileUrl: url,
                    uploadedAt: new Date().toISOString()
                }]
            });
            setActiveRowId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
            />

            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 bg-slate-900/40 py-2 rounded-xl border border-white/5">
                <div className="flex items-center">
                    Total <span className="text-white mx-1.5">{sortedEntries.length.toLocaleString()}</span> entries
                    <span className="mx-3 text-slate-700">|</span>
                    Page <span className="text-white mx-1.5">{currentPage}</span> of {totalPages}
                    {selectedIds.size > 0 && (
                        <>
                            <span className="mx-3 text-slate-700">|</span>
                            <span className="text-indigo-400 font-black tracking-widest">
                                {selectedIds.size} ITEMS SELECTED
                            </span>
                        </>
                    )}
                </div>
                <div className="flex gap-1.5">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white/5 disabled:opacity-20 rounded-lg translate-y-[1px] hover:bg-white/10 text-white transition-all active:scale-95"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white/5 disabled:opacity-20 rounded-lg translate-y-[1px] hover:bg-white/10 text-white transition-all active:scale-95"
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-[#0F172A]/60 rounded-[2.5rem] shadow-2xl border border-white/5 backdrop-blur-3xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                            <th className="px-6 py-5 w-12">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={entries.length > 0 && selectedIds.size === entries.length}
                                        onChange={onToggleAll}
                                        className="w-5 h-5 rounded-md border-white/10 bg-slate-950 accent-indigo-500 cursor-pointer transition-all hover:scale-110"
                                    />
                                </div>
                            </th>
                            {renderHeader("일자", "date")}
                            {renderHeader("번호 (ID)", "journalNumber")}
                            {renderHeader("거래처", "vendor")}
                            {renderHeader("적요", "description")}
                            {renderHeader("계정 (차/대)", "debitAccount")}
                            {renderHeader("금액 (VAT 포함)", "amount", "text-right")}
                            {renderHeader("상태", "status", "text-center")}
                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">증빙</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginatedEntries.length === 0 ? (
                            <tr><td colSpan={10} className="px-6 py-32 text-center text-slate-600 font-bold italic tracking-widest">현재 조건에 맞는 데이터가 없습니다.</td></tr>
                        ) : (
                            paginatedEntries.map((entry) => {
                                const isLocked = isDateLocked(entry.date);
                                const liability = entry.liabilityRecordId ? liabilities.find(l => l.id === entry.liabilityRecordId) : null;
                                const hasAttachments = entry.attachments && entry.attachments.length > 0;

                                return (
                                    <tr key={entry.id} className={`group transition-all duration-300 ${isLocked ? 'bg-indigo-500/[0.01] opacity-80' : 'hover:bg-white/[0.03]'} ${selectedIds.has(entry.id) ? 'bg-indigo-500/[0.08]' : ''}`}>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(entry.id)}
                                                    onChange={() => onToggleSelect(entry.id)}
                                                    className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-500 cursor-pointer transition-all group-hover:scale-110"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Lock size={12} className="text-indigo-500 animate-pulse" />}
                                                <input
                                                    type="date"
                                                    value={entry.date}
                                                    disabled={isLocked}
                                                    onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                                    className={`bg-transparent border-none text-[12px] font-black text-white outline-none rounded-lg px-2 py-1 ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/5 focus:ring-1 focus:ring-indigo-500'}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-mono font-black text-indigo-400 tracking-tighter">
                                                    {entry.journalNumber}
                                                </span>
                                                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">
                                                    SEG-{entry.sequenceNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <input
                                                type="text"
                                                value={entry.vendor || ''}
                                                disabled={isLocked}
                                                onChange={(e) => updateEntry(entry.id, { vendor: e.target.value })}
                                                placeholder="거래처 입력"
                                                className={`bg-transparent border-none text-[13px] text-white font-black outline-none rounded-lg px-2 py-1 w-full ${isLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/5 focus:ring-1 focus:ring-indigo-500 transition-all'}`}
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 max-w-xs">
                                                <input
                                                    type="text"
                                                    value={entry.description}
                                                    disabled={isLocked}
                                                    onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                                                    className={`bg-transparent border-none text-[13px] text-slate-300 font-bold outline-none rounded-lg px-2 py-1 w-full truncate ${isLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/5 focus:ring-1 focus:ring-indigo-500'}`}
                                                />
                                                {entry.confidence && entry.confidence > 0.8 && (
                                                    <div className="p-1 px-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 group/tip relative cursor-help shrink-0">
                                                        <Sparkles size={11} className="text-indigo-400" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#0B1221] border border-white/10 rounded-2xl shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none w-52 z-50 text-[10px] leading-relaxed text-slate-400 normal-case">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <Sparkles size={12} className="text-indigo-400" />
                                                                <span className="font-black text-indigo-200 uppercase tracking-widest">AI Confidence High</span>
                                                            </div>
                                                            이 전표는 AI가 과거 거래 패턴을 분석하여 <span className="text-white font-bold">{(entry.confidence * 100).toFixed(0)}%</span>의 정확도로 자동 분류한 항목입니다.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-indigo-500/70 w-3">차</span>
                                                    <span className="text-xs font-black text-white">{entry.debitAccount}</span>
                                                    {entry.classificationStatus === 'AUTO_CLASSIFIED' && (
                                                        <Shield size={10} className="text-emerald-500" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-rose-500/70 w-3">대</span>
                                                    <span className="text-xs font-black text-slate-400">{entry.creditAccount}</span>
                                                </div>
                                                {liability && (
                                                    <button
                                                        onClick={() => handleOpenLiabilityReview(liability.id)}
                                                        className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border transition-all hover:scale-105 active:scale-95 ${getLiabilityColor(liability.state)}`}
                                                    >
                                                        {liability.state === 'UNPLANNED' ? '⚠️ 미배정 부채' : '📋 부채 관리중'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[13px] font-mono font-black text-white">
                                                    ₩{((entry.amount || 0) + (entry.vat || 0)).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                                    Tax ₩{(entry.vat || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${entry.status === 'Approved'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                }`}>
                                                {entry.status === 'Approved' ? 'Confirmed' : 'Unconfirmed'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => {
                                                    if (hasAttachments) {
                                                        const url = entry.attachments?.[0]?.fileUrl;
                                                        if (url) setPreviewUrl(url);
                                                    } else {
                                                        setActiveRowId(entry.id);
                                                        fileInputRef.current?.click();
                                                    }
                                                }}
                                                className={`group/btn flex items-center justify-center mx-auto w-10 h-10 rounded-2xl border transition-all duration-300 ${hasAttachments
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-white/5 text-slate-600 border-white/10 hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/10'
                                                    }`}
                                            >
                                                {hasAttachments ? <FileCheck size={18} /> : <Upload size={18} className="translate-y-[1px]" />}

                                                {!hasAttachments && (
                                                    <div className="absolute hidden group-hover/btn:block translate-y-8 bg-black border border-white/10 px-2 py-1 rounded text-[8px] font-black text-indigo-300 uppercase z-50">
                                                        증빙 첨부
                                                    </div>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {!isLocked ? (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('전표를 삭제하시겠습니까?')) deleteEntry(entry.id);
                                                    }}
                                                    className="w-10 h-10 rounded-2xl hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 transition-all flex items-center justify-center transition-all active:scale-95"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <Lock size={16} className="text-slate-700 mx-auto opacity-50" />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {sortedEntries.length > 0 && (
                        <tfoot className="bg-[#0B1221]/80 backdrop-blur-xl border-t border-white/10">
                            <tr>
                                <td colSpan={6} className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <AlertCircle size={14} className="text-slate-600" />
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                            Ledger Balance Check (Sum Verification)
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center w-56 text-[11px] font-black">
                                            <span className="text-emerald-500 uppercase tracking-widest">Debit (Dr)</span>
                                            <span className="text-white font-mono">
                                                ₩{entries.reduce((acc, cur) => acc + (cur.amount || 0) + (cur.vat || 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center w-56 text-[11px] font-black pt-2 border-t border-white/5">
                                            <span className="text-rose-500 uppercase tracking-widest">Credit (Cr)</span>
                                            <span className="text-white font-mono">
                                                ₩{entries.reduce((acc, cur) => acc + (cur.amount || 0) + (cur.vat || 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td colSpan={3}></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Evidence Modal Placeholder */}
            {previewUrl && (
                <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <button
                        onClick={() => setPreviewUrl(null)}
                        className="absolute top-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-[1.5rem] flex items-center justify-center text-white transition-all active:scale-95 border border-white/10 z-[1001]"
                    >
                        <X size={28} />
                    </button>
                    <div className="max-w-5xl w-full h-full bg-slate-900 rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
                        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/50 to-transparent flex items-center px-10">
                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-xs">Evidence Digital Viewer</h3>
                        </div>
                        <img src={previewUrl} className="w-full h-full object-contain p-12" alt="Evidence" />
                    </div>
                </div>
            )}

            {isLiabilityModalOpen && selectedLiabilityId && (
                <ReviewLiabilityModal
                    recordId={selectedLiabilityId}
                    isOpen={isLiabilityModalOpen}
                    onClose={() => setIsLiabilityModalOpen(false)}
                />
            )}
        </div>
    );
};

export default JournalTable;
