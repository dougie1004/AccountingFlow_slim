import React, { useContext, useRef } from 'react';
import { JournalEntry } from '../../types';
import { Paperclip, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { AccountingContext } from '../../context/AccountingContext';

interface JournalTableProps {
    entries: JournalEntry[];
}

const JournalTable: React.FC<JournalTableProps> = ({ entries }) => {
    const { attachEvidence, updateEntry, deleteEntry } = useContext(AccountingContext)!;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeEntryId, setActiveEntryId] = React.useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeEntryId) {
            // Mocking the upload by creating a local URL
            const url = URL.createObjectURL(file);
            attachEvidence(activeEntryId, url);
        }
    };

    return (
        <div className="overflow-x-auto bg-[#151D2E] rounded-2xl shadow-2xl border border-white/5">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
            />
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">거래 일자</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">거래처명</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">거래 적요</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-center">증빙</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">차변/대변 계정</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-right">거래 금액</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-center">거버넌스 상태</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-center">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {entries.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-20 text-center text-slate-600 font-bold italic">
                                현재 표시할 회계 데이터가 존재하지 않습니다.
                            </td>
                        </tr>
                    ) : (
                        entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono font-bold">
                                    {entry.status === 'Approved' ? (
                                        entry.date
                                    ) : (
                                        <input
                                            type="date"
                                            value={entry.date}
                                            onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                                        />
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-black">
                                    {entry.vendor || '내부 정산'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate italic">
                                    "{entry.description || '내용 없음'}"
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div
                                            className="relative cursor-pointer group/evidence"
                                            onClick={() => {
                                                if (entry.attachmentUrl) {
                                                    // Show preview modal
                                                    const modal = document.createElement('div');
                                                    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in';
                                                    modal.innerHTML = `
                                                        <div class="relative max-w-4xl max-h-[90vh] p-4">
                                                            <img src="${entry.attachmentUrl}" class="max-w-full max-h-full rounded-2xl shadow-2xl" />
                                                            <button class="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all">
                                                                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                                            </button>
                                                        </div>
                                                    `;
                                                    modal.onclick = (e) => {
                                                        const target = e.target as HTMLElement;
                                                        if (target === modal || target.tagName === 'BUTTON' || target.closest('button')) {
                                                            modal.remove();
                                                        }
                                                    };
                                                    document.body.appendChild(modal);
                                                }
                                            }}
                                        >
                                            <Paperclip size={18} className={`${entry.attachmentUrl ? 'text-indigo-400' : 'text-slate-600'} group-hover/evidence:scale-125 transition-all`} />
                                            {entry.attachmentUrl && (
                                                <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5 shadow-lg animate-in zoom-in">
                                                    <CheckCircle size={8} className="text-white" />
                                                </div>
                                            )}
                                            {!entry.attachmentUrl && (
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/evidence:opacity-100 transition-opacity whitespace-nowrap">
                                                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                                        증빙 첨부
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {entry.attachmentUrl ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveEntryId(entry.id);
                                                    fileInputRef.current?.click();
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="증빙 교체"
                                            >
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 4v10a2 2 0 002 2h10a2 2 0 002-2V4M1 4h14M1 4l2-3h10l2 3M5 7v6M9 7v6" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveEntryId(entry.id);
                                                    fileInputRef.current?.click();
                                                }}
                                                className="p-1.5 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="증빙 첨부"
                                            >
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 5v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5m14 0H2m5 0V3a1 1 0 011-1h4a1 1 0 011 1v2" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase w-4">Dr</span>
                                            <span className="text-[11px] font-bold text-blue-400">{entry.debitAccount}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase w-4">Cr</span>
                                            <span className="text-[11px] font-bold text-purple-400">{entry.creditAccount}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-lg text-white font-black text-right font-mono">
                                    ₩{entry.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${entry.status === 'Approved'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                        : entry.status === 'Hold'
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        }`}>
                                        {entry.status === 'Approved' ? 'CERTIFIED' : entry.status === 'Hold' ? 'HOLD' : 'PENDING'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('정말 이 전표를 삭제하시겠습니까?')) {
                                                deleteEntry(entry.id);
                                            }
                                        }}
                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                        title="전표 삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default JournalTable;
