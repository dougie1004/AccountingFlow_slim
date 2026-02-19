import React, { useContext, useState, useMemo } from 'react';
import { JournalEntry } from '../../types';
import { Trash2, ChevronUp, ChevronDown, ArrowUpDown, Lock, X, ExternalLink, Sparkles, Shield } from 'lucide-react';
import { AccountingContext } from '../../context/AccountingContext';
import { ReviewLiabilityModal } from '../modals/ReviewLiabilityModal';

interface JournalTableProps {
    entries: JournalEntry[];
}

type SortKey = 'date' | 'journalNumber' | 'vendor' | 'description' | 'debitAccount' | 'amount' | 'status';

const JournalTable: React.FC<JournalTableProps> = ({ entries }) => {
    const { updateEntry, deleteEntry, isDateLocked, liabilities } = useContext(AccountingContext)!;
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

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
            // Simple string/number comparison
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [entries, sortConfig]);

    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when entries change or filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [entries.length]);

    const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
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

    // Helper to get Liability Status Color
    const getLiabilityColor = (status: string) => {
        switch (status) {
            case 'UNPLANNED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'PLANNED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'POTENTIAL_EQUITY': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    return (
        <div className="relative">
            {/* Liability Review Modal */}
            {selectedLiabilityId && (
                <ReviewLiabilityModal
                    isOpen={isLiabilityModalOpen}
                    onClose={() => setIsLiabilityModalOpen(false)}
                    recordId={selectedLiabilityId}
                />
            )}

            {/* Image Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-10 bg-[#070C18]/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-5xl max-h-full bg-[#151D2E] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-white font-black flex items-center gap-2">
                                <ExternalLink size={18} className="text-indigo-400" />
                                디지털 증빙 원본 확인
                            </h3>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-3 hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto flex items-start justify-center bg-black/40 cursor-zoom-in">
                            <img
                                src={previewUrl}
                                alt="Evidence Preview"
                                className="w-full h-auto shadow-2xl transition-transform hover:scale-105 duration-500"
                            />
                        </div>
                        <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                            <p className="text-[10px] text-slate-500 mr-auto self-center font-bold">마우스 휠이나 터치패드로 확대/축소가 가능합니다.</p>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination & Stats Bar */}
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="text-xs text-slate-400 font-bold">
                    Total <span className="text-white">{sortedEntries.length.toLocaleString()}</span> entries
                    <span className="mx-2 text-slate-600">|</span>
                    Page <span className="text-white">{currentPage}</span> of {totalPages}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-white/5 disabled:opacity-30 rounded hover:bg-white/10 text-xs font-bold text-white transition-colors"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-white/5 disabled:opacity-30 rounded hover:bg-white/10 text-xs font-bold text-white transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-[#151D2E] rounded-2xl shadow-2xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            {renderHeader("일자", "date")}
                            {renderHeader("번호 (ID)", "journalNumber")}
                            {renderHeader("거래처", "vendor")}
                            {renderHeader("적요", "description")}
                            {renderHeader("계정 (차/대)", "debitAccount")}
                            {renderHeader("금액 (VAT 포함)", "amount", "text-right")}
                            {renderHeader("상태", "status", "text-center")}
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">증빙</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginatedEntries.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-20 text-center text-slate-600 font-bold italic">현재 데이터가 없습니다.</td></tr>
                        ) : (
                            paginatedEntries.map((entry) => {
                                const isLocked = isDateLocked(entry.date);
                                // Find linked liability
                                const liability = entry.liabilityRecordId
                                    ? liabilities.find(l => l.id === entry.liabilityRecordId)
                                    : null;

                                return (
                                    <tr key={entry.id} className={`transition-colors ${isLocked ? 'bg-indigo-500/[0.02] opacity-70' : 'hover:bg-white/[0.02]'}`}>
                                        <td className="px-6 py-4 text-xs text-slate-400 font-mono font-bold">
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Lock size={12} className="text-indigo-500" />}
                                                <input
                                                    type="date"
                                                    value={entry.date}
                                                    disabled={isLocked}
                                                    onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                                    className={`bg-transparent border-none text-[11px] text-white outline-none rounded px-1 ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer focus:ring-1 focus:ring-indigo-500'}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-mono font-black text-indigo-400 tracking-tighter truncate w-24">
                                                    {entry.journalNumber}
                                                </span>
                                                <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                                                    #{entry.sequenceNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={entry.vendor || ''}
                                                disabled={isLocked}
                                                onChange={(e) => updateEntry(entry.id, { vendor: e.target.value })}
                                                className={`bg-transparent border-none text-sm text-white font-black outline-none rounded px-1 w-full ${isLocked ? 'cursor-not-allowed opacity-60' : 'focus:ring-1 focus:ring-indigo-500'}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={entry.description || ''}
                                                    disabled={isLocked}
                                                    onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                                                    className={`bg-transparent border-none text-sm text-slate-300 italic outline-none rounded px-1 w-full ${isLocked ? 'cursor-not-allowed opacity-60' : 'focus:ring-1 focus:ring-indigo-500'}`}
                                                />
                                                {(entry.confidence && entry.confidence > 0.8) && (
                                                    <div className="p-1 rounded bg-indigo-600/10 border border-indigo-600/20">
                                                        <Sparkles size={10} className="text-indigo-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-emerald-500 w-4">차</span>
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                value={entry.debitAccount}
                                                                disabled={isLocked}
                                                                onChange={(e) => updateEntry(entry.id, { debitAccount: e.target.value })}
                                                                className={`bg-transparent border-none text-[13px] font-bold text-white outline-none rounded px-1 w-full ${isLocked ? 'cursor-not-allowed opacity-60' : 'focus:ring-1 focus:ring-indigo-500'}`}
                                                            />
                                                            {entry.classificationStatus === 'AUTO_CLASSIFIED' && (
                                                                <Shield size={10} className="text-emerald-500 shrink-0" />
                                                            )}
                                                        </div>
                                                        {entry.vat > 0 && (
                                                            <span className="text-[10px] text-emerald-400 font-bold px-1 flex items-center gap-1">
                                                                ↳ 부가세대급금 (VAT)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-rose-500 w-4">대</span>
                                                    <div className="flex items-center w-full gap-2">
                                                        <input
                                                            type="text"
                                                            value={entry.creditAccount}
                                                            disabled={isLocked}
                                                            onChange={(e) => updateEntry(entry.id, { creditAccount: e.target.value })}
                                                            className={`bg-transparent border-none text-[13px] font-bold text-slate-400 outline-none rounded px-1 flex-1 ${isLocked ? 'cursor-not-allowed opacity-60' : 'focus:ring-1 focus:ring-indigo-500'}`}
                                                        />
                                                        {/* LIABILITY BADGE */}
                                                        {liability && (
                                                            <button
                                                                onClick={() => handleOpenLiabilityReview(liability.id)}
                                                                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 ${getLiabilityColor(liability.state)}`}
                                                                title={`책임 상태: ${liability.state}\n클릭하여 관리`}
                                                            >
                                                                <span>⚖️</span>
                                                                <span>{liability.state === 'UNPLANNED' ? '위험' : liability.state === 'PLANNED' ? '계획' : '자본'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center justify-end">
                                                    <span className="text-slate-500 font-bold mr-1 text-[10px]">₩</span>
                                                    <span className="text-white font-black text-sm font-mono tracking-tight">{Math.round((entry.amount || 0) + (entry.vat || 0)).toLocaleString()}</span>
                                                </div>
                                                {(entry.vat || 0) > 0 && (
                                                    <div className="flex flex-col items-end text-[10px] text-slate-500 font-mono mt-0.5 border-t border-white/10 pt-1 w-full opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex justify-between w-28">
                                                            <span>Supply:</span>
                                                            <span>{Math.round(entry.amount).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between w-28 text-emerald-400 font-bold">
                                                            <span>VAT (부가세):</span>
                                                            <span>{Math.round(entry.vat).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isLocked ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black border border-indigo-500/30 uppercase tracking-widest">
                                                        전표 확정
                                                    </span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => updateEntry(entry.id, { status: entry.status === 'Approved' ? 'Unconfirmed' : 'Approved' })}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider transition-all ${entry.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95'}`}
                                                >
                                                    {entry.status === 'Approved' ? 'APPROVED' : 'CONFIRM'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => {
                                                    const url = entry.attachments?.[0]?.fileUrl;
                                                    if (url) {
                                                        setPreviewUrl(url);
                                                    } else {
                                                        alert('연동된 디지털 증빙이 없습니다.');
                                                    }
                                                }}
                                                className={`transition-all text-[10px] font-black border px-2 py-1 rounded ${entry.attachments && entry.attachments.length > 0
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                    : 'bg-white/5 text-slate-600 border-white/10 hover:text-slate-400'
                                                    }`}
                                            >
                                                {entry.attachments && entry.attachments.length > 0 ? '증빙 보기' : '미첨부'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {!isLocked && (
                                                <button onClick={() => deleteEntry(entry.id)} className="text-slate-500 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {sortedEntries.length > 0 && (
                        <tfoot className="bg-[#0B1221] border-t border-white/10">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
                                    합계잔액 검증 (Trial Balance)
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col gap-1 items-end">
                                        {/* Debit Total */}
                                        <div className="flex justify-between w-48 text-xs font-bold">
                                            <span className="text-emerald-500">차변 합계 (Dr)</span>
                                            <span className="text-emerald-400 font-mono">
                                                ₩{entries.reduce((acc, cur) => acc + cur.amount + (cur.vat || 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                        {/* Credit Total */}
                                        <div className="flex justify-between w-48 text-xs font-bold border-t border-white/10 pt-1">
                                            <span className="text-rose-500">대변 합계 (Cr)</span>
                                            <span className="text-rose-400 font-mono">
                                                ₩{entries.reduce((acc, cur) => acc + cur.amount + (cur.vat || 0), 0).toLocaleString()}
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
        </div>
    );
};

export default JournalTable;
